export const webinars = [
  { id: "WEB001", name: "Artificial Intelligence" },
  { id: "WEB002", name: "Python Programming" },
  { id: "WEB003", name: "Java Programming" },
  { id: "WEB004", name: "Web Development" },
] as const;

export type WebinarId = (typeof webinars)[number]["id"];

export const collegeDirectory = {
  checkedOn: "2026-10-13",
  sources: [
    "Tamil Nadu Directorate of Collegiate Education (https://tndce.tn.gov.in/Colleges)",
    "AISHE, Ministry of Education (https://aishe.gov.in/)",
    "University Grants Commission (https://www.ugc.gov.in/)",
  ],
  coverage:
    "No machine-readable, downloadable college directory with verifiable identifiers was confirmed from the checked official pages. The directory is intentionally empty until an official source dataset can be verified.",
  colleges: [] as ReadonlyArray<{ id: string; name: string }>,
};

export const OTHER_COLLEGE_ID = "other";

export type RegistrationValues = {
  fullName: string;
  email: string;
  mobile: string;
  collegeId: string;
  collegeName: string;
  department: string;
  yearOfStudy: string;
  webinarId: string;
  consent: boolean;
  idempotencyKey: string;
};

export type NormalizedRegistration = Omit<
  RegistrationValues,
  "collegeId" | "collegeName" | "webinarId"
> & {
  collegeName: string;
  collegeSourceId: string | null;
  webinarId: WebinarId;
  mobile: string;
};

export type RegistrationValidation =
  | { valid: true; value: NormalizedRegistration }
  | { valid: false; errors: Record<string, string> };

const validYears = new Set([
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate Year 1",
  "Postgraduate Year 2",
  "Other / Graduated",
]);

const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function validateRegistration(
  input: unknown,
  colleges: ReadonlyArray<{ id: string; name: string }> = collegeDirectory.colleges,
): RegistrationValidation {
  const data = typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
  const errors: Record<string, string> = {};

  const fullName = trim(data.fullName).replace(/\s+/g, " ");
  const email = trim(data.email).toLowerCase();
  const mobileInput = trim(data.mobile);
  const mobile = mobileInput.replace(/[\s().-]/g, "");
  const collegeId = trim(data.collegeId);
  const manualCollegeName = trim(data.collegeName).replace(/\s+/g, " ");
  const department = trim(data.department).replace(/\s+/g, " ");
  const yearOfStudy = trim(data.yearOfStudy);
  const webinarId = trim(data.webinarId);
  const selectedWebinar = webinars.find((webinar) => webinar.id === webinarId);
  const idempotencyKey = trim(data.idempotencyKey);
  const consent = data.consent === true;

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = "Enter your full name (2–100 characters).";
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Enter a valid email address.";
  }
  if (!/^\+?\d{10,15}$/.test(mobile)) {
    errors.mobile = "Enter a valid mobile number with 10–15 digits.";
  }

  let collegeName = "";
  let collegeSourceId: string | null = null;
  if (collegeId === OTHER_COLLEGE_ID) {
    collegeName = manualCollegeName;
    if (collegeName.length < 2 || collegeName.length > 200) {
      errors.collegeName = "Enter your college name (2–200 characters).";
    }
  } else {
    const selectedCollege = colleges.find((college) => college.id === collegeId);
    if (!selectedCollege) {
      errors.collegeId = "Choose a college or select Other / College not listed.";
    } else {
      collegeName = selectedCollege.name;
      collegeSourceId = selectedCollege.id;
    }
  }

  if (department.length < 2 || department.length > 100) {
    errors.department = "Enter your department (2–100 characters).";
  }
  if (!validYears.has(yearOfStudy)) {
    errors.yearOfStudy = "Choose your year of study.";
  }
  if (!selectedWebinar) {
    errors.webinarId = "Choose one of the listed webinars.";
  }
  if (!consent) {
    errors.consent = "Consent is required to register.";
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    errors.idempotencyKey = "Refresh the page and try again.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }
  if (!selectedWebinar) {
    return { valid: false, errors: { webinarId: "Choose one of the listed webinars." } };
  }

  return {
    valid: true,
    value: {
      fullName,
      email,
      mobile,
      collegeName,
      collegeSourceId,
      department,
      yearOfStudy,
      webinarId: selectedWebinar.id,
      consent,
      idempotencyKey,
    },
  };
}
