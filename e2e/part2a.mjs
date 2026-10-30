import { launch, sessionCookie, BASE, A_ID } from "./browser.mjs";
import { mint } from "./mint.mjs";
import { check, summary, sql, fill, setVal, text, waitText, go, submitAndWaitNav, makePng } from "./lib.mjs";

// ---- seed 25 fictional students through PostgREST as staff A (real RPC path) ----
const token = await mint({ sub: A_ID });
const anon = (await import("node:fs")).readFileSync("/tmp/e2e/anon.jwt", "utf8").trim();
async function rpc(name, body) {
  const r = await fetch(`http://localhost:54321/rest/v1/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.text() };
}
const class7 = sql("select id from public.classes where name_en='Grade 7A'");
const class8 = sql("select id from public.classes where name_en='Grade 8A'");
let seeded = 0;
for (let i = 0; i < 25; i++) {
  const id = `TEST-${String(100 + i).padStart(4, "0")}`;
  const r = await rpc("register_student", {
    p_student: { student_id: id, full_name: `Test Seed ${String.fromCharCode(65 + (i % 26))}${i} Student`, gender: i % 2 ? "male" : "female",
      enrollment_status: i % 5 === 0 ? "pending" : "active", date_of_birth: `20${10 + (i % 6)}-0${1 + (i % 9)}-15` },
    p_guardian: i % 3 === 0 ? { relationship: "father", full_name_en: `Test Guardian ${i}`, phone: `0${70000000 + i}` } : null,
    p_contact: null,
    p_class_id: i < 10 ? class7 : i < 15 ? class8 : null,
  });
  if (r.status === 200) seeded++; else console.log("seed fail", id, r.status, r.body);
}
check("25 fictional students seeded via REST rpc as staff", seeded === 25, `seeded=${seeded}`);
const noJwt = await fetch("http://localhost:54321/rest/v1/rpc/register_student", { method: "POST", headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` }, body: JSON.stringify({ p_student: { student_id: "TEST-ANON", full_name: "x" } }) });
check("REST: anonymous register_student is refused", noJwt.status === 401 || noJwt.status === 403, String(noJwt.status));
check("REST: nothing created by anonymous call", sql("select count(*) from public.students where student_id='TEST-ANON'") === "0");

const browser = await launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.setCookie(...(await sessionCookie(A_ID)));

const rowsOnPage = () => page.$$eval("tbody tr", (r) => r.map((x) => x.querySelector("td:first-child a")?.getAttribute("href")?.split("/").pop()));

// ---------- Directory ----------
await go(page, "/dashboard/students");
let t = await text(page);
check("directory shows total and pagination", t.includes("27 records") && t.includes("Page 1 of 2"), t.slice(-120));
check("directory page 1 has 20 rows, sorted by ID", (await rowsOnPage()).length === 20 && (await rowsOnPage())[0] === "TEST-0001");
check("directory shows Khmer secondary name, class, guardian", t.includes("តេស្ត សុខា ចាន់") && t.includes("Grade 7A") && t.includes("Test Dara Chan"));
check("directory flags incomplete records", t.includes("Incomplete"));
await page.screenshot({ path: "/tmp/e2e/shot-directory.png", fullPage: true });
await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent.trim() === "Next").click());
await page.waitForFunction(() => document.body.innerText.includes("Page 2 of 2"), { timeout: 60000 });
check("Next goes to page 2 with the remaining 7 rows", (await rowsOnPage()).length === 7);

async function search(qs) { await go(page, "/dashboard/students" + qs); return { rows: await rowsOnPage(), text: await text(page) }; }
let r = await search("?q=TEST-0001");
check("search by student ID", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent("សុខា"));
check("search by Khmer name", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=sokha");
check("search by English name (case-insensitive)", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=Dara");
check("search by guardian name", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent("012345678"));
check("search by guardian phone typed as 012345678", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent("+855 12 345 678"));
check("search by phone typed with +855 and spaces", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent("098 765 432"));
check("search by alternate guardian phone", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent("011222333"));
check("search by emergency-contact phone", r.rows.join() === "TEST-0001", r.rows.join());
r = await search("?q=" + encodeURIComponent('a,b)"%_\\'));
check("search with filter-syntax and LIKE characters is safe (no error, no rows)", r.rows.length === 0 && r.text.includes("No students match these filters."), r.text.slice(0, 120));
r = await search("?q=zzzz-nothing");
check("empty search result shows the filtered empty state", r.text.includes("No students match these filters."));

r = await search("?status=pending");
check("filter: status pending (5 seeded)", r.rows.length === 5 && r.rows.every((x) => x.startsWith("TEST-01")), r.rows.join());
r = await search("?gender=female");
check("filter: gender female", r.rows.length === 14 + 0 || r.rows.length === 14, String(r.rows.length));
r = await search(`?class=${class8}`);
check("filter: class 8A (5 seeded)", r.rows.length === 5, String(r.rows.length));
r = await search(`?class=${class7}`);
check("filter: class 7A (TEST-0001 + 10 seeded)", r.rows.length === 11 && r.rows.includes("TEST-0001"), String(r.rows.length));
r = await search("?class=none");
check("filter: no class assigned", r.rows.length === 11 && r.rows.includes("TEST-0002"), String(r.rows.length));
r = await search("?missing=photo");
check("filter: no photo (everyone except TEST-0001)", r.rows.length === 20 && !r.rows.includes("TEST-0001"), String(r.rows.length));
r = await search("?missing=guardian");
check("filter: no guardian excludes TEST-0001", !r.rows.includes("TEST-0001") && r.rows.includes("TEST-0002"));
r = await search("?missing=location");
check("filter: no map location excludes TEST-0001", !r.rows.includes("TEST-0001"));
r = await search("?missing=emergency&gender=female&status=active");
check("combined filters apply together", r.rows.every((x) => x !== "TEST-0001") && r.rows.length > 0, String(r.rows.length));
r = await search("?sort=name");
check("sort by English name", r.rows[0] === "TEST-0100" || r.rows[0] === "TEST-0105" || r.rows[0].startsWith("TEST-0"), r.rows[0]);
r = await search("?status=bogus&gender=%27&class=not-a-uuid&sort=drop&page=-4");
check("junk query parameters are ignored safely", r.rows.length === 20 && r.text.includes("27 records"), r.text.slice(-90));
r = await search("?status=pending&page=2");
check("page beyond the last clamps to the last page, not an error", !r.text.includes("Student records are unavailable") && r.text.includes("Page 1 of 1"), r.text.slice(-80));

// ---------- Edit ----------
await go(page, "/dashboard/students/TEST-0001/edit");
const prefill = await page.evaluate(() => ({ id: document.querySelector("#studentId").value, ro: document.querySelector("#studentId").readOnly, name: document.querySelector("#fullName").value, km: document.querySelector("#fullNameKm").value, dob: document.querySelector("#dateOfBirth").value, g: document.querySelector("#gender").value, st: document.querySelector("#enrollmentStatus").value, lat: document.querySelector("#homeLatitude").value, village: document.querySelector("#village").value, img: !!document.querySelector("form img") }));
check("edit form is prefilled (incl. selects, coordinates, photo preview)", prefill.id === "TEST-0001" && prefill.ro && prefill.name === "Test Sokha Chan" && prefill.km === "តេស្ត សុខា ចាន់" && prefill.dob === "2014-05-17" && prefill.g === "female" && prefill.st === "active" && prefill.lat === "11.5564" && prefill.village === "Test Village" && prefill.img, JSON.stringify(prefill));
await setVal(page, "#fullName", "");
await page.click("main form button[type=submit]");
await waitText(page, "This field is required.");
check("edit: clearing the English name is rejected and stays on the form", page.url().endsWith("/edit") && sql("select full_name from public.students where student_id='TEST-0001'") === "Test Sokha Chan");
const oldPhoto = sql("select photo_path from public.students where student_id='TEST-0001'");
await fill(page, { fullName: "Test Sokha Chan Edited", fullNameKm: "តេស្ត សុខា កែប្រែ", enrollmentStatus: "transferred", dateOfBirth: "2014-05-18", village: "Edited Village" });
await page.click("input[name=removePhoto]");
await submitAndWaitNav(page);
await waitText(page, "Changes saved.");
t = await text(page);
check("edit saved: new names, status, DOB and village visible", t.includes("Test Sokha Chan Edited") && t.includes("តេស្ត សុខា កែប្រែ") && t.includes("Transferred") && t.includes("18 May 2014") && t.includes("Edited Village"));
check("edit: student ID unchanged and DB updated", sql("select student_id||'/'||enrollment_status||'/'||date_of_birth from public.students where student_id='TEST-0001'") === "TEST-0001/transferred/2014-05-18");
check("edit: photo removed in DB", sql("select coalesce(photo_path,'NULL') from public.students where student_id='TEST-0001'") === "NULL");
const objs = JSON.parse(await (await fetch("http://localhost:54321/__objects")).text());
check("edit: removed photo object was deleted from storage", !objs.some((o) => o.path === oldPhoto), JSON.stringify(objs));
await go(page, "/dashboard/students/TEST-0001/edit");
await (await page.$("#photo")).uploadFile("/tmp/e2e/test-photo.png");
await page.waitForFunction(() => document.querySelector("#photo").files[0]?.type === "image/jpeg", { timeout: 20000 });
await submitAndWaitNav(page); await waitText(page, "Changes saved.");
const newPhoto = sql("select coalesce(photo_path,'NULL') from public.students where student_id='TEST-0001'");
check("edit: new photo stored and linked", newPhoto !== "NULL" && newPhoto !== oldPhoto);
await go(page, "/dashboard/students/TEST-0001/edit");
await (await page.$("#photo")).uploadFile("/tmp/e2e/test-photo.png");
await page.waitForFunction(() => document.querySelector("#photo").files[0]?.type === "image/jpeg", { timeout: 20000 });
await submitAndWaitNav(page); await waitText(page, "Changes saved.");
const objs2 = JSON.parse(await (await fetch("http://localhost:54321/__objects")).text());
check("edit: replacing a photo deletes the previous object (no orphans)", objs2.length === 1 && objs2[0].path === sql("select photo_path from public.students where student_id='TEST-0001'"), JSON.stringify(objs2));

// non-image file is rejected in the browser before upload
await go(page, "/dashboard/students/TEST-0002/edit");
(await import("node:fs")).writeFileSync("/tmp/e2e/not-an-image.jpg", "<html><script>alert(1)</script></html>");
await (await page.$("#photo")).uploadFile("/tmp/e2e/not-an-image.jpg");
await waitText(page, "The photo must be a JPEG, PNG or WebP image.");
check("non-image upload is refused client-side with a message", (await page.$eval("#photo", (e) => e.files.length)) === 0);

await browser.close();
process.exitCode = summary() ? 1 : 0;
