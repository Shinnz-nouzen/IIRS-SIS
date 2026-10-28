import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedStaffProfile } from "./staff-policy.ts";

test("allows active administrator and office staff profiles for their own user", () => {
  for (const role of ["administrator", "office_staff"]) {
    assert.equal(
      isAuthorizedStaffProfile("staff-1", {
        user_id: "staff-1",
        role,
        is_active: true,
      }),
      true,
    );
  }
});

test("denies missing, inactive, mismatched, or unsupported staff profiles", () => {
  assert.equal(isAuthorizedStaffProfile("staff-1", null), false);
  assert.equal(
    isAuthorizedStaffProfile("staff-1", {
      user_id: "staff-1",
      role: "office_staff",
      is_active: false,
    }),
    false,
  );
  assert.equal(
    isAuthorizedStaffProfile("staff-1", {
      user_id: "staff-2",
      role: "administrator",
      is_active: true,
    }),
    false,
  );
  assert.equal(
    isAuthorizedStaffProfile("staff-1", {
      user_id: "staff-1",
      role: "unknown",
      is_active: true,
    }),
    false,
  );
});
