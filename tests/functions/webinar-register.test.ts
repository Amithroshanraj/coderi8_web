import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  createRegistrationHandler,
  postToAppsScript,
} from "../../netlify/functions/webinar-register";
import { webinarGroups } from "../../netlify/functions/_shared/webinarGroups";

const environment = {
  WEBINAR_APPS_SCRIPT_URL: "https://script.google.com/macros/s/testDeploymentId/exec",
  WEBINAR_IDEMPOTENCY_SECRET: "test-only-idempotency-secret-with-32-chars",
  WEBINAR_APPS_SCRIPT_HMAC_SECRET: "test-only-apps-script-hmac-secret-32",
};

const payload = (webinarId = "WEB001", token = "a9be5b11-b51b-4ad3-b38b-13af5a1529ac") => ({
  fullName: "Test Student",
  email: "STUDENT@example.com",
  mobile: "+91 98765 43210",
  collegeId: "other",
  collegeName: "Example College",
  department: "Computer Science",
  yearOfStudy: "2nd Year",
  webinarId,
  consent: true,
  idempotencyKey: token,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

class MemoryStore {
  values = new Map<string, { data: string; etag: string }>();
  sequence = 0;

  async getWithMetadata(key: string) {
    const value = this.values.get(key);
    return value ? { ...value } : null;
  }

  async set(
    key: string,
    value: string,
    options: { onlyIfNew?: boolean; onlyIfMatch?: string } = {},
  ) {
    const previous = this.values.get(key);
    if (options.onlyIfNew && previous) return { modified: false };
    if (options.onlyIfMatch && previous?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = `etag-${++this.sequence}`;
    this.values.set(key, { data: value, etag });
    return { modified: true, etag };
  }

  async delete(key: string) {
    this.values.delete(key);
  }
}

class MemoryAppsScript {
  saved = new Map<string, { registrationId: string; webinarId: string }>();
  calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  failAfterSave = false;
  responseOverride: Record<string, unknown> | null = null;

  async post(url: string, body: Record<string, unknown>) {
    this.calls.push({ url, body });
    const registrationId = String(body.registrationId);
    const webinarId = String(body.webinarId);
    const existing = this.saved.get(registrationId);
    if (existing) return { success: true, ...existing };

    this.saved.set(registrationId, { registrationId, webinarId });
    if (this.failAfterSave) {
      this.failAfterSave = false;
      throw new Error("simulated network timeout after write");
    }
    if (this.responseOverride) return this.responseOverride;
    return { success: true, registrationId, webinarId };
  }
}

function createHarness(options: {
  env?: Record<string, string | undefined>;
  appsScript?: MemoryAppsScript;
  store?: MemoryStore;
} = {}) {
  const appsScript = options.appsScript ?? new MemoryAppsScript();
  const store = options.store ?? new MemoryStore();
  const handler = createRegistrationHandler({
    postRegistration: (url, body) => appsScript.post(url, body),
    store,
    env: options.env ?? environment,
    now: () => new Date("2026-10-13T00:00:00.000Z"),
  });

  const send = (data: unknown = payload(), ip = "192.0.2.10") =>
    handler(new Request("https://coderi8.com/.netlify/functions/webinar-register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://coderi8.com" },
      body: JSON.stringify(data),
    }), { ip });

  return { handler, send, appsScript, store };
}

describe("webinar registration function", () => {
  it("posts JSON server-side and follows Apps Script redirects", async () => {
    const requestCalls: Array<{ url: string; init: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestCalls.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify({
        success: true,
        registrationId: "WR-test",
        webinarId: "WEB001",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postToAppsScript(environment.WEBINAR_APPS_SCRIPT_URL, {
      registrationId: "WR-test",
      webinarId: "WEB001",
    });

    expect(result.success).toBe(true);
    const request = requestCalls[0];
    expect(request).toBeDefined();
    expect(request?.url).toBe(environment.WEBINAR_APPS_SCRIPT_URL);
    expect(request?.init).toEqual(expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        redirect: "follow",
      }));
    expect(JSON.parse(String(request?.init.body))).toEqual({
      registrationId: "WR-test",
      webinarId: "WEB001",
    });
  });

  it("rejects an Apps Script HTML error page instead of treating it as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>not found</html>", { status: 200 })));
    await expect(postToAppsScript(environment.WEBINAR_APPS_SCRIPT_URL, {}))
      .rejects.toThrow("APPS_SCRIPT_INVALID_RESPONSE");
  });

  it.each([
    ["WEB001", "https://chat.whatsapp.com/KXajcHgmnsaDv4BEn9U6gg"],
    ["WEB002", "https://chat.whatsapp.com/IDlgiDkx8ln73VHzIVTW7B"],
    ["WEB003", "https://chat.whatsapp.com/FLRpLZW9sCp7gIUfkP96Xq"],
    ["WEB004", "https://chat.whatsapp.com/JZpyOICfsalF7RPMHhFiyB"],
  ])("stores %s and returns only its configured group", async (webinarId, groupUrl) => {
    const { send, appsScript } = createHarness();
    const response = await send(payload(webinarId));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.webinarId).toBe(webinarId);
    expect(body.whatsappGroupUrl).toBe(groupUrl);
    expect(webinarGroups[webinarId as keyof typeof webinarGroups]).toBe(groupUrl);
    expect(Object.values(webinarGroups).filter((url) => url === body.whatsappGroupUrl)).toHaveLength(1);
    expect(appsScript.saved.size).toBe(1);
    expect(appsScript.calls[0].body.webinarId).toBe(webinarId);
    expect(appsScript.calls[0].body.consent).toBe(true);
    expect(appsScript.calls[0].body.registrationId).toEqual(expect.any(String));
    expect(appsScript.calls[0].body.requestTimestamp).toBe("2026-10-13T00:00:00.000Z");
    const signedValues = [
      appsScript.calls[0].body.requestTimestamp,
      appsScript.calls[0].body.registrationId,
      appsScript.calls[0].body.idempotencyKey,
      appsScript.calls[0].body.registrationDate,
      appsScript.calls[0].body.fullName,
      appsScript.calls[0].body.email,
      appsScript.calls[0].body.mobile,
      appsScript.calls[0].body.college,
      appsScript.calls[0].body.collegeSourceId ?? "",
      appsScript.calls[0].body.department,
      appsScript.calls[0].body.yearOfStudy,
      appsScript.calls[0].body.webinarId,
      appsScript.calls[0].body.consent,
    ];
    const expectedSignature = createHmac("sha256", environment.WEBINAR_APPS_SCRIPT_HMAC_SECRET)
      .update(JSON.stringify(signedValues), "utf8")
      .digest("hex");
    expect(appsScript.calls[0].body.signature).toBe(expectedSignature);
  });

  it("rejects invalid form data on the server", async () => {
    const { send, appsScript } = createHarness();
    const response = await send({ ...payload(), consent: false, email: "not-an-email" });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.fieldErrors).toHaveProperty("email");
    expect(body.fieldErrors).toHaveProperty("consent");
    expect(appsScript.saved.size).toBe(0);
  });

  it.each([
    ["Apps Script URL", { ...environment, WEBINAR_APPS_SCRIPT_URL: undefined }],
    ["idempotency secret", { ...environment, WEBINAR_IDEMPOTENCY_SECRET: undefined }],
    ["HMAC secret", { ...environment, WEBINAR_APPS_SCRIPT_HMAC_SECRET: undefined }],
    ["short HMAC secret", { ...environment, WEBINAR_APPS_SCRIPT_HMAC_SECRET: "too-short" }],
    ["reused HMAC secret", {
      ...environment,
      WEBINAR_APPS_SCRIPT_HMAC_SECRET: environment.WEBINAR_IDEMPOTENCY_SECRET,
    }],
  ])("fails closed when %s configuration is invalid", async (_label, env) => {
    const { send, appsScript } = createHarness({ env });
    const response = await send();
    expect(response.status).toBe(503);
    expect(appsScript.saved.size).toBe(0);
    expect(appsScript.calls).toHaveLength(0);
  });

  it("does not claim success when the Apps Script endpoint is unavailable", async () => {
    const appsScript = new MemoryAppsScript();
    appsScript.post = async () => {
      throw new Error("simulated Apps Script failure");
    };
    const { send } = createHarness({ appsScript });
    const response = await send();
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("could not confirm");
  });

  it("does not claim success unless Apps Script confirms the exact saved ID and webinar", async () => {
    const appsScript = new MemoryAppsScript();
    appsScript.responseOverride = {
      success: true,
      registrationId: "different-id",
      webinarId: "WEB001",
    };
    const { send } = createHarness({ appsScript });
    const response = await send();
    expect(response.status).toBe(503);
    expect((await response.json()).retryable).toBe(true);
  });

  it("returns a saved result for a repeated token without appending a second row", async () => {
    const { send, appsScript } = createHarness();
    const first = await send();
    const retry = await send();
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect((await retry.json()).replayed).toBe(true);
    expect(appsScript.saved.size).toBe(1);
  });

  it("recovers safely when Apps Script saved a row but the response timed out", async () => {
    const appsScript = new MemoryAppsScript();
    appsScript.failAfterSave = true;
    const { send } = createHarness({ appsScript });
    const first = await send();
    const retry = await send();
    expect(first.status).toBe(503);
    expect(retry.status).toBe(201);
    expect(appsScript.saved.size).toBe(1);
  });

  it("rejects concurrent duplicate submissions while one write is in progress", async () => {
    const { send, appsScript } = createHarness();
    const [first, second] = await Promise.all([send(), send()]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(appsScript.saved.size).toBe(1);
    const retry = await send();
    expect(retry.status).toBe(200);
  });

  it("limits repeated attempts from one client", async () => {
    const { send } = createHarness();
    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      const token = `a9be5b11-b51b-4ad3-b38b-${String(index).padStart(12, "0")}`;
      responses.push(await send(payload("WEB001", token)));
    }
    expect(responses[5].status).toBe(429);
  });

  it("rejects a cross-origin browser request", async () => {
    const { handler } = createHarness();
    const response = await handler(new Request("https://coderi8.com/.netlify/functions/webinar-register", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
      body: JSON.stringify(payload()),
    }), { ip: "192.0.2.10" });
    expect(response.status).toBe(403);
  });
});
