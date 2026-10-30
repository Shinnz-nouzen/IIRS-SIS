import { writeFileSync } from "node:fs";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

export const results = [];
export function check(label, ok, detail = "") {
  results.push({ label, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail && !ok ? "  -> " + detail : ""}`);
}
export function summary() {
  const fail = results.filter((r) => !r.ok).length;
  console.log(`SUMMARY pass=${results.length - fail} fail=${fail} total=${results.length}`);
  return fail;
}
export function sql(query) {
  return execFileSync("su", ["postgres", "-c", `psql -h /tmp/pg -p 54329 -d sis_e2e -At -F '|' -c "${query.replace(/"/g, '\\"')}"`], { encoding: "utf8" }).trim();
}
export async function setVal(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
export async function fill(page, values) {
  for (const [id, v] of Object.entries(values)) await setVal(page, `#${id}`, v);
}
export async function text(page, selector = "main") {
  return page.$eval(selector, (e) => e.innerText);
}
export async function waitText(page, needle, timeout = 60000) {
  await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout }, needle);
}
export async function go(page, path, base = "http://localhost:3000") {
  await page.goto(base + path, { waitUntil: "networkidle0", timeout: 120000 });
}
export async function submitAndWaitNav(page, selector = "main form button[type=submit]:not([disabled])") {
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 }), page.click(selector)]);
}
// Solid + gradient PNG, large on purpose, so the in-browser resize path is exercised.
export function makePng(path, w = 1600, h = 1200) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1); raw[row] = 0;
    for (let x = 0; x < w; x++) { raw[row + 1 + x * 3] = (x * 255 / w) | 0; raw[row + 2 + x * 3] = (y * 255 / h) | 0; raw[row + 3 + x * 3] = 150; }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

export async function waitSql(query, expected, timeout = 30000) {
  const end = Date.now() + timeout; let last = "";
  while (Date.now() < end) { last = sql(query); if (last === expected) return last; await new Promise((r) => setTimeout(r, 500)); }
  return last;
}
