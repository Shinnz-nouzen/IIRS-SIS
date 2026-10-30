import { launch, sessionCookie, BASE, A_ID, B_ID } from "./browser.mjs";
import { check, summary, sql, fill, setVal, text, waitText, go, waitSql } from "./lib.mjs";
import { readFileSync } from "node:fs";

const browser = await launch();
const page = await browser.newPage();
let pageErrors = 0;
page.on("pageerror", (e) => { pageErrors++; console.log("PAGEERROR", e.message.slice(0, 300)); });
page.on("dialog", (d) => d.accept());
await page.setCookie(...(await sessionCookie(A_ID)));
const sid = (s) => sql(s);
const class8 = sid("select id from public.classes where name_en='Grade 8A'");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (sel) => page.$eval(sel, (el) => { el.scrollIntoView({ block: "center" }); el.click(); });
const clickText = (selector, label) => page.evaluate((s, l) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(l)); if (!el) throw new Error("no element " + s + " " + l); el.click(); }, selector, label);

// ---------- Guardians ----------
await go(page, "/dashboard/students/TEST-0001");
await clickText("summary", "Add guardian");
await fill(page, { "g-new-guardianRelationship": "father", "g-new-guardianNameEn": "Test Vanna Chan", "g-new-guardianPhone": "12" });
await click("form:has(#g-new-guardianPhone) button[type=submit]");
await waitText(page, "Enter a valid phone number");
check("guardian form: invalid phone shows error and keeps typed values", (await page.$eval("#g-new-guardianNameEn", (e) => e.value)) === "Test Vanna Chan" && (await page.$eval("#g-new-guardianRelationship", (e) => e.value)) === "father");
await setVal(page, "#g-new-guardianPhone", "+855 12 000 111");
await click("details:has(#g-new-guardianPhone) input[name=guardianIsPrimary]");
await click("form:has(#g-new-guardianPhone) button[type=submit]");
await waitText(page, "Test Vanna Chan");
check("guardian added; becomes the only primary", sid("select string_agg(full_name_en||':'||is_primary, ',' order by full_name_en) from public.student_guardians where student_id='TEST-0001'") === "Test Dara Chan:false,Test Vanna Chan:true");
let t = await text(page);
check("profile lists both guardians with a Primary badge", t.includes("Test Dara Chan") && t.includes("Test Vanna Chan") && t.includes("Primary") && t.includes("+855 12 000 111"));
const mother = sid("select id from public.student_guardians where full_name_en='Test Dara Chan'");
await clickText("summary", "Edit guardian");
const phoneSel = `#g-${mother}-guardianPhone`;
await page.waitForSelector(phoneSel, { visible: true }).catch(async () => { await page.evaluate((sel) => document.querySelector(sel).closest("details").open = true, phoneSel); });
check("edit guardian form is prefilled", (await page.$eval(phoneSel, (e) => e.value)) === "012345678" && (await page.$eval(`#g-${mother}-guardianRelationship`, (e) => e.value)) === "mother" && (await page.$eval(`#g-${mother}-guardianLivesWith`, (e) => e.value)) === "yes");
await page.evaluate((sel) => { const d = document.querySelector(sel).closest("details"); d.open = true; }, phoneSel);
await setVal(page, phoneSel, "093 555 777");
await click(`form:has(${phoneSel}) button[type=submit]`);
await waitText(page, "093 555 777");
check("guardian phone edited and normalised in DB", sid(`select phone from public.student_guardians where id='${mother}'`) === "093555777");
await page.evaluate(() => { [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Delete")[0].click(); });
await page.waitForFunction(() => !document.body.innerText.includes("Test Vanna Chan"), { timeout: 30000 });
check("guardian deleted after confirmation", sid("select count(*) from public.student_guardians where student_id='TEST-0001'") === "1");

// ---------- Emergency contacts ----------
await clickText("summary", "Add emergency contact");
await fill(page, { "c-new-contactNameKm": "តេស្ត មីង", "c-new-contactRelationship": "Aunt", "c-new-contactPhone": "070 111 222", "c-new-contactPriority": "2" });
await click("form:has(#c-new-contactPhone) button[type=submit]");
await waitText(page, "តេស្ត មីង");
check("emergency contact added with priority and Khmer name", sid("select priority||':'||phone from public.student_emergency_contacts where full_name_km='តេស្ត មីង'") === "2:070111222");
await page.evaluate(() => { const card = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Delete"); card[card.length - 1].click(); });
await page.waitForFunction(() => !document.body.innerText.includes("តេស្ត មីង"), { timeout: 30000 });
check("emergency contact deleted", sid("select count(*) from public.student_emergency_contacts where full_name_km='តេស្ត មីង'") === "0");

// ---------- Class assignment ----------
await setVal(page, "#assign-classId", class8);
await click("form:has(#assign-classId) button[type=submit]");
const history = "select string_agg(c.name_en||':'||(e.left_on is null), ',' order by e.created_at) from public.student_enrollments e join public.classes c on c.id=e.class_id where e.student_id='TEST-0001'";
const got = await waitSql(history, "Grade 7A:false,Grade 8A:true");
check("class changed: current class 8A, 7A closed and kept in history", got === "Grade 7A:false,Grade 8A:true", got);
await page.waitForFunction(() => document.body.innerText.includes("Class history") && /Current class\s+Grade 8A/.test(document.body.innerText), { timeout: 30000 });
check("profile shows 8A as the current class and a class history", true);
await setVal(page, "#assign-classId", "");
await click("form:has(#assign-classId) button[type=submit]");
await waitText(page, "This field is required.");
await setVal(page, "#assign-classId", sid("select id from public.classes where name_en='Grade 7A'"));
await setVal(page, "#assign-effectiveOn", "2999-01-01");
await click("form:has(#assign-classId) button[type=submit]");
await waitText(page, "The date cannot be in the future.");
check("class change with no class or a future date is rejected, enrollment unchanged", sid("select count(*) from public.student_enrollments where student_id='TEST-0001' and left_on is null") === "1" && sid("select c.name_en from public.student_enrollments e join public.classes c on c.id=e.class_id where e.student_id='TEST-0001' and e.left_on is null") === "Grade 8A");
await clickText("button", "Remove from current class");
await waitText(page, "Not assigned to a class.");
check("student removed from current class (history retained)", sid("select count(*) from public.student_enrollments where student_id='TEST-0001'") === "2" && sid("select count(*) from public.student_enrollments where student_id='TEST-0001' and left_on is null") === "0");

// ---------- Language ----------
await clickText("button", "ខ្មែរ");
await page.waitForFunction(() => document.documentElement.lang === "km" && document.body.innerText.includes("ប្រវត្តិរូប") === false && document.body.innerText.includes("ព័ត៌មានផ្ទាល់ខ្លួន"), { timeout: 30000 });
t = await text(page);
check("switching to Khmer translates the profile page", t.includes("ព័ត៌មានផ្ទាល់ខ្លួន") && t.includes("ឪពុកម្តាយ និងអាណាព្យាបាល") && t.includes("ទំនាក់ទំនងពេលអាសន្ន") && t.includes("ស្រី"));
check("Khmer interface shows the Khmer name as primary", (await page.$eval("h1", (e) => e.textContent)).includes("តេស្ត សុខា កែប្រែ"));
check("language is saved for the account (DB) and in a cookie", sid("select language from public.staff_preferences where user_id='" + A_ID + "'") === "km" && (await page.cookies()).some((c) => c.name === "sis_lang" && c.value === "km"));
const nav = await page.$$eval("nav a", (a) => a.map((x) => x.textContent.trim()));
check("sidebar is in Khmer", nav.includes("សិស្ស") && nav.includes("ថ្នាក់រៀន") && nav.includes("ការកំណត់"), nav.join("|"));
await go(page, "/dashboard/students/new");
await page.click("main form button[type=submit]");
await waitText(page, "សូមបំពេញចន្លោះនេះ។");
check("validation messages appear in Khmer", (await text(page)).includes("សូមពិនិត្យចន្លោះដែលបានគូសបញ្ជាក់។"));
await page.screenshot({ path: "/tmp/e2e/shot-form-km.png", fullPage: true });
await go(page, "/dashboard/students");
await page.screenshot({ path: "/tmp/e2e/shot-directory-km.png", fullPage: true });
check("Khmer directory has Khmer headings", (await text(page)).includes("ចុះឈ្មោះសិស្ស") && (await text(page)).includes("អត្តលេខសិស្ស"));
await go(page, "/dashboard/students/TEST-0001");
await page.screenshot({ path: "/tmp/e2e/shot-profile-km.png", fullPage: true });
await clickText("button", "EN");
await page.waitForFunction(() => document.documentElement.lang === "en", { timeout: 30000 });
check("switching back to English updates the saved preference", sid("select language from public.staff_preferences where user_id='" + A_ID + "'") === "en" && sid("select count(*) from public.staff_preferences") === "1");

// ---------- Theme ----------
check("theme starts dark", await page.$eval("main", (m) => !!m.closest(".dark")));
await click("button[aria-label='Switch to light mode']");
await page.waitForFunction(() => !document.querySelector("main").closest(".dark"), { timeout: 30000 });
await page.reload({ waitUntil: "networkidle0" });
check("light theme persists across reload (cookie)", await page.$eval("main", (m) => !m.closest(".dark")));
await page.screenshot({ path: "/tmp/e2e/shot-profile-light.png", fullPage: true });
await click("button[aria-label='Switch to dark mode']");
await page.waitForFunction(() => !!document.querySelector("main").closest(".dark"), { timeout: 30000 });

// ---------- Sidebar navigation (client-side), prefetch must not log the user out ----------
await go(page, "/dashboard");
for (const [label, heading] of [["Students", "Students"], ["Classes", "Classes"], ["Attendance", "Attendance"], ["Grades", "Grades"], ["Reports", "Reports"], ["Staff & Access", "Staff & Access"], ["Settings", "Settings"], ["Overview", "School operations"]]) {
  await page.evaluate((l) => [...document.querySelectorAll("aside nav a")].find((a) => a.textContent.trim() === l).click(), label);
  await page.waitForFunction((h) => document.querySelector("h1")?.textContent === h, { timeout: 60000 }, heading);
  check(`sidebar navigation to ${label} stays signed in`, !page.url().includes("/login"), page.url());
}
await page.evaluate(() => [...document.querySelectorAll("aside nav a")].find((a) => a.textContent.trim() === "Students").click());
await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Students", { timeout: 60000 });
await page.evaluate(() => [...document.querySelectorAll("tbody a")][0].click());
await page.waitForFunction(() => document.body.innerText.includes("Personal details"), { timeout: 60000 });
check("directory row link opens the profile via client navigation", page.url().includes("/dashboard/students/TEST-"));
await go(page, "/dashboard/attendance");
check("placeholder pages say plainly that they are not implemented", (await text(page)).includes("not connected to any data source"));
await page.goto(BASE + "/dashboard/students/NO-SUCH-ID", { waitUntil: "networkidle0" });
await waitText(page, "Student not found");
check("unknown student ID shows a translated not-found page inside the dashboard", (await text(page)).includes("does not exist, or you do not have access") && (await page.$("aside nav")) !== null);

// ---------- Accessibility basics on the registration form ----------
await go(page, "/dashboard/students/new");
const unlabeled = await page.$$eval("form input:not([type=hidden]), form select, form textarea", (els) => els.filter((e) => !(e.labels && e.labels.length) && !e.getAttribute("aria-label")).map((e) => e.name));
check("every visible form control has a label", unlabeled.length === 0, unlabeled.join(","));
const reqMarks = await page.$$eval("label", (l) => l.filter((x) => x.textContent.includes("*")).length);
check("required fields are marked", reqMarks >= 2);

// ---------- Mobile ----------
const mobile = await browser.newPage();
await mobile.setCookie(...(await sessionCookie(A_ID)));
await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
for (const path of ["/dashboard", "/dashboard/students", "/dashboard/students/new", "/dashboard/students/TEST-0001", "/dashboard/classes"]) {
  await mobile.goto(BASE + path, { waitUntil: "networkidle0", timeout: 120000 });
  const m = await mobile.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  check(`mobile 390px: no horizontal overflow on ${path}`, m.sw <= m.iw, JSON.stringify(m));
  await mobile.screenshot({ path: `/tmp/e2e/shot-mobile${path.replace(/\//g, "-")}.png`, fullPage: true });
}
await mobile.goto(BASE + "/dashboard/students", { waitUntil: "networkidle0" });
await mobile.click("button[aria-label='Open navigation']");
check("mobile menu opens with all navigation links", (await mobile.$$eval("header nav a", (a) => a.length)) === 8);
await mobile.screenshot({ path: "/tmp/e2e/shot-mobile-menu.png" });

// ---------- Inactive staff (profile exists, is_active=false) ----------
const otherBrowser = await launch();
const bPage = await otherBrowser.newPage();
await bPage.setCookie(...(await sessionCookie(B_ID)));
for (const path of ["/dashboard", "/dashboard/students", "/dashboard/students/TEST-0001", "/dashboard/students/new", "/dashboard/classes"]) {
  await bPage.goto(BASE + path, { waitUntil: "networkidle0", timeout: 120000 });
  check(`inactive staff is sent to /login from ${path}`, new URL(bPage.url()).pathname === "/login", bPage.url());
}
const anonBrowser = await launch();
const anonPage = await anonBrowser.newPage();
await anonPage.goto(BASE + "/dashboard/students/TEST-0001", { waitUntil: "networkidle0", timeout: 120000 });
check("signed-out visitor is sent to /login", new URL(anonPage.url()).pathname === "/login");

check("no hydration or runtime errors reached the browser console during the run", pageErrors === 0, String(pageErrors));

// ---------- Audit trail and logs ----------
const audit = sid("select string_agg(entity||'/'||action||'='||n, ', ' order by entity, action) from (select entity, action, count(*) n from public.student_record_audit group by 1,2) x");
console.log("audit summary:", audit);
check("audit trail covers student, guardian, emergency_contact and enrollment events incl. deletes", ["student/insert", "student/update", "guardian/insert", "guardian/update", "guardian/delete", "emergency_contact/insert", "emergency_contact/delete", "enrollment/insert", "enrollment/update"].every((k) => audit.includes(k)), audit);
check("every audit row has an actor", sid("select count(*) from public.student_record_audit where actor_id is null") === "0");
check("audit never stores personal values", sid("select count(*) from public.student_record_audit a, unnest(a.changed_fields) f where f ~* '(sokha|dara|vanna|345|555|example|test )'") === "0");
// Next.js itself logs request lines (including the ?q= search URLs this test deliberately used);
// only lines written by application code are checked.
const log = readFileSync("/tmp/e2e/next.log", "utf8").split("\n").filter((l) => !/^\s*(GET|POST) \//.test(l)).join("\n");
const leaks = ["Test Sokha", "012345678", "dara@example", "093555777", "តេស្ត", "11.5564"].filter((needle) => log.includes(needle));
check("server log contains no student/guardian personal data", leaks.length === 0, leaks.join(","));

await otherBrowser.close();
await anonBrowser.close();
await browser.close();
process.exitCode = summary() ? 1 : 0;
