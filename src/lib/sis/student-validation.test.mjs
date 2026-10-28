import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStudentInput,
  validateStudentInput,
} from "./student-validation.ts";

test("accepts trimmed student directory values and provisional statuses", () => {
  const formData = new FormData();
  formData.set("studentId", "  TEST-001  ");
  formData.set("fullName", "  Synthetic Learner  ");
  formData.set("enrollmentStatus", "inactive");

  const result = parseStudentInput(formData);

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.input, {
    studentId: "TEST-001",
    fullName: "Synthetic Learner",
    enrollmentStatus: "inactive",
  });
});

test("rejects empty and overlength identifiers and names", () => {
  assert.equal(
    validateStudentInput({
      studentId: "",
      fullName: "",
      enrollmentStatus: "active",
    }).studentId,
    "Enter a student ID using 1 to 64 characters.",
  );
  assert.equal(
    validateStudentInput({
      studentId: "x".repeat(65),
      fullName: "x".repeat(201),
      enrollmentStatus: "active",
    }).studentId,
    "Enter a student ID using 1 to 64 characters.",
  );
  assert.equal(
    validateStudentInput({
      studentId: "TEST-001",
      fullName: "x".repeat(201),
      enrollmentStatus: "active",
    }).fullName,
    "Enter a name using 1 to 200 characters.",
  );
});

test("rejects status values outside the provisional vocabulary", () => {
  const formData = new FormData();
  formData.set("studentId", "TEST-001");
  formData.set("fullName", "Synthetic Learner");
  formData.set("enrollmentStatus", "pending");

  const result = parseStudentInput(formData);

  assert.equal(
    result.errors.enrollmentStatus,
    "Choose active or inactive.",
  );
});

test("rejects whitespace-only fields after trimming", () => {
  const formData = new FormData();
  formData.set("studentId", "   ");
  formData.set("fullName", " \t ");
  formData.set("enrollmentStatus", "active");

  const result = parseStudentInput(formData);

  assert.ok(result.errors.studentId);
  assert.ok(result.errors.fullName);
});
