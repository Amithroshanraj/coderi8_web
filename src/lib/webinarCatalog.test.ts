import { describe, expect, it } from "vitest";
import {
  collegeDirectory,
  OTHER_COLLEGE_ID,
  validateRegistration,
  webinars,
} from "./webinarCatalog";

const validInput = {
  fullName: "  Test   Student ",
  email: " STUDENT@example.com ",
  mobile: "+91 98765 43210",
  collegeId: OTHER_COLLEGE_ID,
  collegeName: "  Example   College ",
  department: " Computer Science ",
  yearOfStudy: "2nd Year",
  webinarId: "WEB001",
  consent: true,
  idempotencyKey: "a9be5b11-b51b-4ad3-b38b-13af5a1529ac",
};

describe("webinar registration validation", () => {
  it.each([
    ["Artificial Intelligence", "WEB001"],
    ["Python Programming", "WEB002"],
    ["Java Programming", "WEB003"],
    ["Web Development", "WEB004"],
  ])("accepts %s with its correct ID", (name, id) => {
    expect(webinars.find((webinar) => webinar.name === name)?.id).toBe(id);
    expect(validateRegistration({ ...validInput, webinarId: id }).valid).toBe(true);
  });

  it("normalizes values and accepts required manual college entry", () => {
    const result = validateRegistration(validInput);
    expect(result.valid).toBe(true);
    if (result.valid === true) {
      expect(result.value.fullName).toBe("Test Student");
      expect(result.value.email).toBe("student@example.com");
      expect(result.value.mobile).toBe("+919876543210");
      expect(result.value.collegeName).toBe("Example College");
      expect(result.value.collegeSourceId).toBeNull();
    }
  });

  it("accepts a verified college only when its directory ID and name are known", () => {
    const options = [{ id: "TN-001", name: "Verified College" }];
    const result = validateRegistration({
      ...validInput,
      collegeId: "TN-001",
      collegeName: "",
    }, options);
    expect(result.valid).toBe(true);
    if (result.valid === true) {
      expect(result.value.collegeName).toBe("Verified College");
      expect(result.value.collegeSourceId).toBe("TN-001");
    }
    expect(collegeDirectory.colleges).toHaveLength(0);
  });

  it("rejects missing fields, malformed values, unknown IDs, and missing consent", () => {
    const result = validateRegistration({
      ...validInput,
      fullName: " ",
      email: "invalid",
      mobile: "123",
      collegeName: "",
      department: "",
      yearOfStudy: "Year 99",
      webinarId: "WEB999",
      consent: false,
    });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(Object.keys(result.errors)).toEqual(expect.arrayContaining([
        "fullName",
        "email",
        "mobile",
        "collegeName",
        "department",
        "yearOfStudy",
        "webinarId",
        "consent",
      ]));
    }
  });

  it("does not accept a client-supplied unverified college identifier", () => {
    expect(validateRegistration({
      ...validInput,
      collegeId: "invented-id",
      collegeName: "Invented College",
    }).valid).toBe(false);
  });
});
