import assert from "node:assert/strict";
import test from "node:test";
import { displayName, formatDate, formatPhone, formatTimestamp, openStreetMapEmbed, openStreetMapLink } from "./format.ts";

test("formats Cambodian phone numbers readably and leaves others alone", () => {
  assert.equal(formatPhone("012345678"), "012 345 678");
  assert.equal(formatPhone("+85512345678"), "+855 12 345 678");
  assert.equal(formatPhone("+14155550100"), "+14155550100");
});

test("dates never shift across a timezone boundary", () => {
  assert.equal(formatDate("2014-05-17", "en"), "17 May 2014");
  assert.equal(formatDate("2014-01-01", "en"), "1 January 2014");
});

test("Khmer dates use Khmer month names and Latin digits, independent of ICU", () => {
  assert.equal(formatDate("2014-05-17", "km"), "17 ឧសភា 2014");
  assert.equal(formatDate("2026-10-30", "km"), "30 តុលា 2026");
  assert.equal(formatDate("garbage", "en"), "garbage");
});

test("timestamps are shown in Cambodia time", () => {
  assert.equal(formatTimestamp("2026-10-29T18:30:00Z", "en"), "30 October 2026, 01:30");
  assert.equal(formatTimestamp("2026-10-29T18:30:00Z", "km"), "30 តុលា 2026, 01:30");
});

test("display name prefers the interface language and shows the other as secondary", () => {
  assert.deepEqual(displayName("Test Sokha", "សុខា", "en"), { primary: "Test Sokha", secondary: "សុខា" });
  assert.deepEqual(displayName("Test Sokha", "សុខា", "km"), { primary: "សុខា", secondary: "Test Sokha" });
  assert.deepEqual(displayName("Test Sokha", null, "km"), { primary: "Test Sokha", secondary: null });
});

test("map links carry latitude then longitude in the right slots", () => {
  assert.match(openStreetMapLink(11.5564, 104.9282), /mlat=11\.5564&mlon=104\.9282/);
  assert.match(openStreetMapEmbed(11.5564, 104.9282), /marker=11\.5564%2C104\.9282/);
});
