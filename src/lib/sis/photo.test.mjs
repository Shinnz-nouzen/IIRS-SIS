import assert from "node:assert/strict";
import test from "node:test";
import { detectPhotoType, isSafePhotoPath } from "./photo.ts";

const bytes = (...values) => Uint8Array.from(values);

test("detects JPEG, PNG and WebP by content, not by declared type", () => {
  assert.equal(detectPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0)).ext, "jpg");
  assert.equal(detectPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)).ext, "png");
  assert.equal(
    detectPhotoType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)).ext,
    "webp",
  );
});

test("rejects other content (GIF, SVG, HTML, text, empty)", () => {
  assert.equal(detectPhotoType(new TextEncoder().encode("GIF89a....")), null);
  assert.equal(detectPhotoType(new TextEncoder().encode("<svg xmlns=...>")), null);
  assert.equal(detectPhotoType(new TextEncoder().encode("<html><script>")), null);
  assert.equal(detectPhotoType(new Uint8Array()), null);
});

test("only simple generated object names are treated as safe paths", () => {
  assert.equal(isSafePhotoPath("3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab.jpg"), true);
  assert.equal(isSafePhotoPath("../secret.jpg"), false);
  assert.equal(isSafePhotoPath("a/b.jpg"), false);
  assert.equal(isSafePhotoPath("a..b.jpg"), false);
  assert.equal(isSafePhotoPath(""), false);
});
