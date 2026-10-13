import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { createHmac, createHash } from "node:crypto";
import {
  collegeDirectory,
  validateRegistration,
  type NormalizedRegistration,
  type WebinarId,
} from "../../src/lib/webinarCatalog";
import { webinarGroups } from "./_shared/webinarGroups";

type StoreRecord = {
  data: string;
  etag?: string;
};

type StateStore = {
  getWithMetadata: (key: string) => Promise<StoreRecord | null>;
  set: (
    key: string,
    value: string,
    options: { onlyIfNew?: boolean; onlyIfMatch?: string },
  ) => Promise<{ modified: boolean; etag?: string }>;
};

type SavedRegistration = {
  state: "saved";
  fingerprint: string;
  response: { registrationId: string; webinarId: WebinarId; whatsappGroupUrl: string };
};

type ProcessingRegistration = {
  state: "processing";
  fingerprint: string;
  leaseUntil: number;
};

type RegistrationState = SavedRegistration | ProcessingRegistration;

type HandlerDependencies = {
  postRegistration: (url: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  store: StateStore;
  env: Record<string, string | undefined>;
  now?: () => Date;
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const LOCK_LEASE_MS = 2 * 60 * 1000;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_APPS_SCRIPT_RESPONSE_BYTES = 8 * 1024;

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function requiredConfig(env: Record<string, string | undefined>) {
  const appsScriptUrl = env.WEBINAR_APPS_SCRIPT_URL?.trim();
  const idempotencySecret = env.WEBINAR_IDEMPOTENCY_SECRET;
  const hmacSecret = env.WEBINAR_APPS_SCRIPT_HMAC_SECRET;

  if (!appsScriptUrl || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(appsScriptUrl)) {
    return null;
  }
  if (
    !idempotencySecret ||
    idempotencySecret.length < 32 ||
    !hmacSecret ||
    hmacSecret.length < 32 ||
    hmacSecret === idempotencySecret
  ) {
    return null;
  }

  return { appsScriptUrl, idempotencySecret, hmacSecret };
}

function createRegistrationId(secret: string, idempotencyKey: string) {
  return `WR-${createHmac("sha256", secret).update(idempotencyKey).digest("hex").slice(0, 24).toUpperCase()}`;
}

export function signAppsScriptRequest(
  payload: Record<string, unknown>,
  secret: string,
) {
  const signedValues = [
    payload.requestTimestamp,
    payload.registrationId,
    payload.idempotencyKey,
    payload.registrationDate,
    payload.fullName,
    payload.email,
    payload.mobile,
    payload.college,
    payload.collegeSourceId == null ? "" : payload.collegeSourceId,
    payload.department,
    payload.yearOfStudy,
    payload.webinarId,
    payload.consent,
  ];

  return createHmac("sha256", secret)
    .update(JSON.stringify(signedValues), "utf8")
    .digest("hex");
}

export async function postToAppsScript(
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_APPS_SCRIPT_RESPONSE_BYTES) {
    throw new Error("APPS_SCRIPT_RESPONSE_TOO_LARGE");
  }
  if (!response.ok) throw new Error("APPS_SCRIPT_HTTP_ERROR");

  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("APPS_SCRIPT_INVALID_RESPONSE");
  }
  if (typeof result !== "object" || result === null) {
    throw new Error("APPS_SCRIPT_INVALID_RESPONSE");
  }
  return result as Record<string, unknown>;
}

async function claimIdempotency(
  store: StateStore,
  key: string,
  fingerprint: string,
  now: number,
) {
  const processing: ProcessingRegistration = {
    state: "processing",
    fingerprint,
    leaseUntil: now + LOCK_LEASE_MS,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await store.getWithMetadata(key);
    if (!existing) {
      const created = await store.set(key, JSON.stringify(processing), { onlyIfNew: true });
      if (created.modified) return { claimed: true, etag: created.etag };
      continue;
    }

    let state: RegistrationState;
    try {
      state = JSON.parse(existing.data) as RegistrationState;
    } catch {
      throw new Error("IDEMPOTENCY_STATE_INVALID");
    }

    if (state.fingerprint !== fingerprint) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    if (state.state === "saved") return { claimed: false, saved: state.response };
    if (state.leaseUntil > now) return { claimed: false, inProgress: true };
    if (!existing.etag) throw new Error("IDEMPOTENCY_STATE_INVALID");

    const replaced = await store.set(key, JSON.stringify(processing), {
      onlyIfMatch: existing.etag,
    });
    if (replaced.modified) return { claimed: true, etag: replaced.etag };
  }

  return { claimed: false, inProgress: true };
}

async function enforceRateLimit(store: StateStore, ip: string, secret: string, now: number) {
  const key = `rate:${createHmac("sha256", secret).update(ip).digest("hex")}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await store.getWithMetadata(key);
    let count = 0;
    let windowStart = now;
    if (existing) {
      if (!existing.etag) throw new Error("RATE_LIMIT_STATE_MISSING_ETAG");
      const previous = JSON.parse(existing.data) as { count: number; windowStart: number };
      if (now - previous.windowStart < RATE_LIMIT_WINDOW_MS) {
        count = previous.count;
        windowStart = previous.windowStart;
      }
    }
    if (count >= RATE_LIMIT_MAX) {
      return Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
    }

    const next = JSON.stringify({ count: count + 1, windowStart });
    const result = existing
      ? await store.set(key, next, { onlyIfMatch: existing.etag })
      : await store.set(key, next, { onlyIfNew: true });
    if (result.modified) return 0;
  }
  throw new Error("RATE_LIMIT_CONTENTION");
}

function getFingerprint(registration: NormalizedRegistration) {
  const { idempotencyKey: _idempotencyKey, ...data } = registration;
  return hash(JSON.stringify(data));
}

export function createRegistrationHandler(dependencies: HandlerDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const secret = dependencies.env.WEBINAR_IDEMPOTENCY_SECRET;

  return async (request: Request, context?: Pick<Context, "ip">) => {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Use POST to submit a registration." });
    }

    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).origin !== new URL(request.url).origin) {
          return jsonResponse(403, { error: "Registration requests must come from this website." });
        }
      } catch {
        return jsonResponse(403, { error: "Registration requests must come from this website." });
      }
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse(413, { error: "The submitted form is too large." });
    }

    const config = requiredConfig(dependencies.env);
    if (!config || !secret) {
      return jsonResponse(503, {
        error: "Registration is temporarily unavailable because server setup is incomplete.",
        retryable: false,
      });
    }

    const timestamp = now();
    try {
      const retryAfter = await enforceRateLimit(
        dependencies.store,
        context?.ip || "unknown",
        secret,
        timestamp.getTime(),
      );
      if (retryAfter > 0) {
        return jsonResponse(429, {
          error: "Too many registration attempts. Please wait before trying again.",
          retryAfterSeconds: retryAfter,
        });
      }
    } catch {
      console.error("Webinar registration rate limiter failed");
      return jsonResponse(503, {
        error: "Registration is temporarily unavailable. Please try again shortly.",
        retryable: true,
      });
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        return jsonResponse(413, { error: "The submitted form is too large." });
      }
      body = JSON.parse(text);
    } catch {
      return jsonResponse(400, { error: "The form data could not be read." });
    }

    const validation = validateRegistration(body, collegeDirectory.colleges);
    if (!validation.valid) {
      return jsonResponse(400, {
        error: "Please correct the highlighted fields and try again.",
        fieldErrors: validation.errors,
      });
    }

    const registration = validation.value;
    const registrationId = createRegistrationId(secret, registration.idempotencyKey);
    const stateKey = `submission:${hash(registration.idempotencyKey)}`;
    const fingerprint = getFingerprint(registration);
    let claim;
    try {
      claim = await claimIdempotency(
        dependencies.store,
        stateKey,
        fingerprint,
        timestamp.getTime(),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") {
        return jsonResponse(409, {
          error: "This retry token belongs to a different form submission. Refresh and submit again.",
          retryable: false,
        });
      }
      console.error("Webinar registration idempotency storage failed");
      return jsonResponse(503, {
        error: "We could not safely prepare your registration. Please retry using the same form.",
        retryable: true,
      });
    }

    if (claim.saved) {
      return jsonResponse(200, { ...claim.saved, replayed: true });
    }
    if (!claim.claimed) {
      return jsonResponse(409, {
        error: "This registration is still being processed. Please retry in a few seconds.",
        retryable: true,
      });
    }

    try {
      const payload: Record<string, unknown> = {
        requestTimestamp: timestamp.toISOString(),
        registrationId,
        idempotencyKey: registration.idempotencyKey,
        registrationDate: timestamp.toISOString(),
        fullName: registration.fullName,
        email: registration.email,
        mobile: registration.mobile,
        college: registration.collegeName,
        collegeSourceId: registration.collegeSourceId,
        department: registration.department,
        yearOfStudy: registration.yearOfStudy,
        webinarId: registration.webinarId,
        consent: registration.consent,
      };
      const signedPayload = {
        ...payload,
        signature: signAppsScriptRequest(payload, config.hmacSecret),
      };
      const appsScriptResult = await dependencies.postRegistration(config.appsScriptUrl, signedPayload);

      if (
        appsScriptResult.success !== true ||
        appsScriptResult.registrationId !== registrationId ||
        appsScriptResult.webinarId !== registration.webinarId
      ) {
        throw new Error("APPS_SCRIPT_SAVE_NOT_CONFIRMED");
      }

      const result = {
        registrationId,
        webinarId: registration.webinarId,
        whatsappGroupUrl: webinarGroups[registration.webinarId],
      };
      const savedState: SavedRegistration = { state: "saved", fingerprint, response: result };
      if (!claim.etag) throw new Error("IDEMPOTENCY_LOCK_MISSING_ETAG");
      const completed = await dependencies.store.set(stateKey, JSON.stringify(savedState), {
        onlyIfMatch: claim.etag,
      });
      if (!completed.modified) {
        throw new Error("IDEMPOTENCY_LOCK_LOST");
      }
      return jsonResponse(201, result);
    } catch (error) {
      if (claim.etag) {
        try {
          await dependencies.store.set(
            stateKey,
            JSON.stringify({ state: "processing", fingerprint, leaseUntil: 0 } satisfies ProcessingRegistration),
            { onlyIfMatch: claim.etag },
          );
        } catch {
          console.error("Unable to release webinar registration retry lock");
        }
      }
      console.error("Webinar registration storage failed");
      return jsonResponse(503, {
        error: "We could not confirm that your registration was saved. Please retry this form safely.",
        retryable: true,
      });
    }
  };
}

export default async (request: Request, context: Context) => {
  const config = requiredConfig(process.env);
  if (!config) {
    return jsonResponse(503, {
      error: "Registration is temporarily unavailable because server setup is incomplete.",
      retryable: false,
    });
  }
  const handler = createRegistrationHandler({
    postRegistration: postToAppsScript,
    store: getStore("webinar-registration-state", { consistency: "strong" }) as StateStore,
    env: process.env,
  });
  return handler(request, context);
};
