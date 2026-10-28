import assert from "node:assert/strict";
import test from "node:test";
import { escapeLikePattern } from "./search-escape.ts";

test("leaves ordinary and Khmer text unchanged", () => {
  assert.equal(escapeLikePattern("Synthetic Learner"), "Synthetic Learner");
  assert.equal(escapeLikePattern("សិស្ស សាកល្បង"), "សិស្ស សាកល្បង");
});

test("escapes LIKE wildcards so they match literally", () => {
  assert.equal(escapeLikePattern("50%"), "50\\%");
  assert.equal(escapeLikePattern("A_B"), "A\\_B");
});

test("escapes the escape character itself first", () => {
  assert.equal(escapeLikePattern("a\\b"), "a\\\\b");
  assert.equal(escapeLikePattern("\\%"), "\\\\\\%");
});
