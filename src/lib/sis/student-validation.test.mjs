import assert from "node:assert/strict";
import test from "node:test";
import {
  ageInYears,
  formGetter,
  isInsideCambodia,
  normalizePhone,
  parseClass,
  parseContact,
  parseEffectiveDate,
  parseGuardian,
  parseStudentCore,
  todayInPhnomPenh,
} from "./student-validation.ts";

const TODAY = "2026-10-29";
const getter = (fields) => (name) => fields[name] ?? "";
const base = {
  studentId: "TEST-001",
  fullName: "Test Sokha Chan",
  enrollmentStatus: "active",
};
const core = (fields, mode = "create") =>
  parseStudentCore(getter({ ...base, ...fields }), { mode, today: TODAY });

test("accepts a minimal student (ID, English name, status)", () => {
  const { errors, data } = core({});
  assert.deepEqual(errors, {});
  assert.equal(data.studentId, "TEST-001");
  assert.equal(data.fullNameKm, null);
  assert.equal(data.homeLatitude, null);
});

test("trims and collapses whitespace in every text field", () => {
  const { data } = core({ studentId: "  TEST-002 ", fullName: "  Test   Sokha  Chan " });
  assert.equal(data.studentId, "TEST-002");
  assert.equal(data.fullName, "Test Sokha Chan");
});

test("requires student ID on create but not on update", () => {
  assert.equal(core({ studentId: "" }).errors.studentId, "required");
  assert.deepEqual(core({ studentId: "" }, "update").errors, {});
  assert.equal(core({ studentId: "x".repeat(65) }).errors.studentId, "tooLong");
});

test("English name must contain Latin letters; Khmer name must contain Khmer", () => {
  assert.equal(core({ fullName: "សុខា" }).errors.fullName, "notLatin");
  assert.equal(core({ fullName: "" }).errors.fullName, "required");
  assert.equal(core({ fullName: "x".repeat(201) }).errors.fullName, "tooLong");
  assert.equal(core({ fullNameKm: "Sokha" }).errors.fullNameKm, "notKhmer");
  assert.deepEqual(core({ fullNameKm: "តេស្ត សុខា ចាន់" }).errors, {});
});

test("date of birth: real calendar date, not future, not before 1990", () => {
  assert.equal(core({ dateOfBirth: "2014-02-30" }).errors.dateOfBirth, "invalidDate");
  assert.equal(core({ dateOfBirth: "17/05/2014" }).errors.dateOfBirth, "invalidDate");
  assert.equal(core({ dateOfBirth: "2026-10-30" }).errors.dateOfBirth, "futureDate");
  assert.equal(core({ dateOfBirth: "1989-12-31" }).errors.dateOfBirth, "tooOld");
  assert.deepEqual(core({ dateOfBirth: "2026-10-29" }).errors, {});
  assert.deepEqual(core({ dateOfBirth: "2012-02-29" }).errors, {});
  assert.equal(core({ dateOfBirth: "2013-02-29" }).errors.dateOfBirth, "invalidDate");
});

test("admission date may be in the future (pre-registration)", () => {
  assert.deepEqual(core({ admissionDate: "2027-01-05" }).errors, {});
});

test("gender and status must come from the allowed lists", () => {
  assert.equal(core({ gender: "x" }).errors.gender, "invalidChoice");
  assert.deepEqual(core({ gender: "female" }).errors, {});
  assert.equal(core({ enrollmentStatus: "pending-ish" }).errors.enrollmentStatus, "invalidChoice");
  assert.equal(core({ enrollmentStatus: "" }).errors.enrollmentStatus, "required");
  for (const status of ["pending", "active", "on_leave", "graduated", "transferred", "withdrawn", "inactive"]) {
    assert.deepEqual(core({ enrollmentStatus: status }).errors, {}, status);
  }
});

test("coordinates: both or neither, in range, comma decimal accepted, rounded to 6 places", () => {
  assert.equal(core({ homeLatitude: "11.5" }).errors.homeLongitude, "locationPair");
  assert.equal(core({ homeLongitude: "104.9" }).errors.homeLatitude, "locationPair");
  assert.equal(core({ homeLatitude: "91", homeLongitude: "104" }).errors.homeLatitude, "invalidLatitude");
  assert.equal(core({ homeLatitude: "11", homeLongitude: "181" }).errors.homeLongitude, "invalidLongitude");
  assert.equal(core({ homeLatitude: "abc", homeLongitude: "104" }).errors.homeLatitude, "invalidLatitude");
  const { data } = core({ homeLatitude: "11,55640049", homeLongitude: "104.92820049" });
  assert.equal(data.homeLatitude, 11.5564);
  assert.equal(data.homeLongitude, 104.9282);
});

test("soft Cambodia bounding-box helper", () => {
  assert.equal(isInsideCambodia(11.5564, 104.9282), true);
  assert.equal(isInsideCambodia(104.9282, 11.5564), false); // swapped
  assert.equal(isInsideCambodia(51.5, -0.12), false);
});

test("address fields enforce database length limits", () => {
  assert.equal(core({ addressLine: "x".repeat(201) }).errors.addressLine, "tooLong");
  assert.equal(core({ village: "x".repeat(121) }).errors.village, "tooLong");
  assert.equal(core({ addressNotes: "x".repeat(301) }).errors.addressNotes, "tooLong");
});

test("failed validation returns the cleaned values for re-display and no data", () => {
  const result = core({ fullName: "  ", dateOfBirth: "bad" });
  assert.equal(result.data, null);
  assert.equal(result.values.studentId, "TEST-001");
});

test("formGetter ignores non-string values (files)", () => {
  const form = new FormData();
  form.set("a", "text");
  form.set("photo", new File(["x"], "x.jpg"));
  const get = formGetter(form);
  assert.equal(get("a"), "text");
  assert.equal(get("photo"), "");
  assert.equal(get("missing"), "");
});

test("phone normalisation and validation", () => {
  assert.equal(normalizePhone("012 345-678"), "012345678");
  assert.equal(normalizePhone("(+855) 12 345 678"), "+85512345678");
  assert.equal(normalizePhone("00855 12 345 678"), "+85512345678");
});

const guardianFields = {
  gRelationship: "mother",
  gNameEn: "Test Dara Chan",
  gPhone: "012 345 678",
};

test("guardian: optional and fully blank is skipped", () => {
  const result = parseGuardian(getter({}), "g", { optional: true });
  assert.equal(result.blank, true);
  assert.equal(result.data, null);
  assert.deepEqual(result.errors, {});
});

test("guardian: required fields enforced once any field is filled", () => {
  const result = parseGuardian(getter({ gNameEn: "Test Dara" }), "g", { optional: true });
  assert.equal(result.errors.gRelationship, "required");
  assert.equal(result.errors.gPhone, "required");
  assert.equal(result.data, null);
});

test("guardian: accepts valid data, normalises phone, parses lives-with", () => {
  const { errors, data } = parseGuardian(
    getter({ ...guardianFields, gPhoneAlt: "+855 98 765 432", gEmail: "dara@example.invalid", gLivesWith: "yes", gIsPrimary: "on" }),
    "g",
    { optional: false },
  );
  assert.deepEqual(errors, {});
  assert.equal(data.phone, "012345678");
  assert.equal(data.phoneAlt, "+85598765432");
  assert.equal(data.livesWithStudent, true);
  assert.equal(data.isPrimary, true);
});

test("guardian: rejects bad phone, email, relationship, and nameless entries", () => {
  assert.equal(parseGuardian(getter({ ...guardianFields, gPhone: "12" }), "g", { optional: false }).errors.gPhone, "invalidPhone");
  assert.equal(parseGuardian(getter({ ...guardianFields, gEmail: "nope" }), "g", { optional: false }).errors.gEmail, "invalidEmail");
  assert.equal(parseGuardian(getter({ ...guardianFields, gRelationship: "cousin" }), "g", { optional: false }).errors.gRelationship, "invalidChoice");
  assert.equal(
    parseGuardian(getter({ gRelationship: "father", gPhone: "012345678" }), "g", { optional: false }).errors.gNameEn,
    "atLeastOneName",
  );
  assert.deepEqual(
    parseGuardian(getter({ gRelationship: "father", gPhone: "012345678", gNameKm: "តេស្ត វណ្ណា" }), "g", { optional: false }).errors,
    {},
  );
  assert.equal(
    parseGuardian(getter({ ...guardianFields, gNameEn: "សុខា" }), "g", { optional: false }).errors.gNameEn,
    "notLatin",
  );
});

test("emergency contact: relationship is free text, priority 1-9", () => {
  const ok = parseContact(
    getter({ cNameEn: "Test Neighbour", cRelationship: "Neighbour", cPhone: "011 222 333", cPriority: "2" }),
    "c",
    { optional: true },
  );
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.data.priority, 2);
  assert.equal(ok.data.phone, "011222333");

  const bad = parseContact(
    getter({ cNameEn: "X", cRelationship: "Aunt", cPhone: "011222333", cPriority: "12" }),
    "c",
    { optional: false },
  );
  assert.equal(bad.errors.cPriority, "invalidChoice");

  assert.equal(parseContact(getter({}), "c", { optional: true }).blank, true);
  assert.equal(parseContact(getter({ cNameEn: "X" }), "c", { optional: true }).errors.cPhone, "required");
});

test("class: school year must be consecutive years on create", () => {
  const fields = { schoolYear: "2026-2027", gradeLevel: "Grade 7", nameEn: "Grade 7A", isActive: "on" };
  assert.deepEqual(parseClass(getter(fields), { mode: "create" }).errors, {});
  assert.equal(parseClass(getter({ ...fields, schoolYear: "2026" }), { mode: "create" }).errors.schoolYear, "invalidSchoolYear");
  assert.equal(parseClass(getter({ ...fields, schoolYear: "2026-2028" }), { mode: "create" }).errors.schoolYear, "invalidSchoolYear");
  assert.equal(parseClass(getter({ ...fields, schoolYear: "" }), { mode: "create" }).errors.schoolYear, "required");
  assert.deepEqual(parseClass(getter({ ...fields, schoolYear: "" }), { mode: "update" }).errors, {});
  assert.equal(parseClass(getter({ ...fields, nameEn: "" }), { mode: "create" }).errors.nameEn, "required");
  assert.equal(parseClass(getter({ ...fields, nameKm: "Grade" }), { mode: "create" }).errors.nameKm, "notKhmer");
  assert.equal(parseClass(getter({ ...fields, isActive: "" }), { mode: "create" }).data.isActive, false);
});

test("effective date defaults to today and cannot be in the future", () => {
  assert.deepEqual(parseEffectiveDate("", TODAY), { value: TODAY, error: null });
  assert.equal(parseEffectiveDate("2026-11-01", TODAY).error, "futureDate");
  assert.equal(parseEffectiveDate("garbage", TODAY).error, "invalidDate");
});

test("age is whole years and handles birthdays and leap days", () => {
  assert.equal(ageInYears("2014-10-29", TODAY), 12);
  assert.equal(ageInYears("2014-10-30", TODAY), 11);
  assert.equal(ageInYears("2012-02-29", "2026-02-28"), 13);
  assert.equal(ageInYears("2030-01-01", TODAY), null);
});

test("Phnom Penh date rolls over at 17:00 UTC", () => {
  assert.equal(todayInPhnomPenh(new Date("2026-10-28T16:59:00Z")), "2026-10-28");
  assert.equal(todayInPhnomPenh(new Date("2026-10-28T17:00:00Z")), "2026-10-29");
});
