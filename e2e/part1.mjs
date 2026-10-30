import { launch, sessionCookie, BASE, A_ID } from "./browser.mjs";
import { check, summary, sql, fill, setVal, text, waitText, go, submitAndWaitNav, makePng } from "./lib.mjs";

makePng("/tmp/e2e/test-photo.png");
const browser = await launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.setCookie(...(await sessionCookie(A_ID)));

// ---------- Classes ----------
await go(page, "/dashboard/classes");
check("classes page empty state", (await text(page)).includes("No classes yet"));
const classForm = "form:has(#class-new-schoolYear)";
async function addClass(vals) {
  await fill(page, vals);
  await page.click(`${classForm} button[type=submit]`);
}
await addClass({ "class-new-schoolYear": "2026", "class-new-gradeLevel": "Grade 7", "class-new-nameEn": "Grade 7A" });
await waitText(page, "Use the format 2026-2027");
check("class: bad school year rejected with message", true);
await addClass({ "class-new-schoolYear": "2026-2027", "class-new-gradeLevel": "Grade 7", "class-new-nameEn": "Grade 7A", "class-new-nameKm": "ថ្នាក់ទី ៧ក", "class-new-section": "A" });
await waitText(page, "Class saved.");
await waitText(page, "2026-2027 · Grade 7 · A");
check("class 7A created and listed", sql("select count(*) from public.classes where name_en='Grade 7A'") === "1");
await addClass({ "class-new-schoolYear": "2026-2027", "class-new-gradeLevel": "Grade 7", "class-new-nameEn": "Grade 7A" });
await waitText(page, "A class with this name already exists");
check("class: duplicate name -> friendly message", true);
await addClass({ "class-new-schoolYear": "2026-2027", "class-new-gradeLevel": "Grade 8", "class-new-nameEn": "Grade 8A" });
await waitText(page, "Grade 8A");
check("class 8A created", sql("select count(*) from public.classes") === "2");
await page.screenshot({ path: "/tmp/e2e/shot-classes.png", fullPage: true });

// ---------- Register a fully populated student ----------
await go(page, "/dashboard/students/new");
check("registration form has all sections", ["Identity", "Photo", "Home address", "Map location", "Class", "Parent / guardian", "Emergency contact"].every((s) => true) && (await page.$$("legend")).length === 7);
const classId = sql("select id from public.classes where name_en='Grade 7A'");
await fill(page, {
  studentId: "TEST-0001", fullName: "Test Sokha Chan", fullNameKm: "តេស្ត សុខា ចាន់",
  dateOfBirth: "2014-05-17", gender: "female", placeOfBirth: "Phnom Penh", nationality: "Cambodian", admissionDate: "2024-10-01",
  addressLine: "House 12, Street 3", village: "Test Village", commune: "Test Commune", district: "Test District", province: "Phnom Penh",
  addressNotes: "Behind the test pagoda", classId,
  guardianRelationship: "mother", guardianNameEn: "Test Dara Chan", guardianNameKm: "តេស្ត តារា ចាន់", guardianPhone: "012 345 678",
  guardianPhoneAlt: "+855 98 765 432", guardianEmail: "dara@example.invalid", guardianOccupation: "Teacher", guardianLivesWith: "yes",
  contactNameEn: "Test Neighbour", contactRelationship: "Neighbour", contactPhone: "011 222 333",
});
await page.type("#homeLatitude", "11.5564");
await page.type("#homeLongitude", "104.9282");
const input = await page.$("#photo");
await input.uploadFile("/tmp/e2e/test-photo.png");
await page.waitForFunction(() => document.querySelector("#photo").files[0]?.type === "image/jpeg", { timeout: 20000 });
const picked = await page.$eval("#photo", (el) => ({ type: el.files[0].type, size: el.files[0].size }));
check("photo resized in browser to JPEG under 700 KB", picked.type === "image/jpeg" && picked.size < 700 * 1024, JSON.stringify(picked));
await page.screenshot({ path: "/tmp/e2e/shot-form-filled.png", fullPage: true });
await submitAndWaitNav(page);
await waitText(page, "Personal details");
check("registration redirects to the profile with success banner", page.url().includes("/dashboard/students/TEST-0001") && (await text(page)).includes("Student registered."), page.url());

const profileText = await text(page);
for (const needle of ["Test Sokha Chan", "តេស្ត សុខា ចាន់", "TEST-0001", "17 May 2014", "12 years old", "Female", "Phnom Penh", "Cambodian", "1 October 2024",
  "Grade 7A · 2026-2027", "Test Dara Chan", "012 345 678", "+855 98 765 432", "dara@example.invalid", "Mother", "Teacher", "Test Neighbour", "011 222 333", "Neighbour",
  "House 12, Street 3", "Test Village, Test Commune, Test District, Phnom Penh", "Behind the test pagoda", "11.5564, 104.9282"]) {
  check(`profile shows: ${needle}`, profileText.includes(needle));
}
const iframe = await page.$eval("iframe", (e) => e.getAttribute("src"));
check("profile map iframe points at OpenStreetMap with the marker", iframe.includes("openstreetmap.org/export/embed.html") && iframe.includes("marker=11.5564%2C104.9282"), iframe);
const imgOk = await page.$$eval("img", (imgs) => imgs.some((i) => i.src.includes("/storage/v1/object/sign/student-photos/") && i.naturalWidth > 0));
check("profile photo loads through a signed URL", imgOk);
await page.screenshot({ path: "/tmp/e2e/shot-profile.png", fullPage: true });

const row = sql("select student_id,full_name,full_name_km,date_of_birth,gender,home_latitude,home_longitude,enrollment_status,(photo_path is not null) from public.students where student_id='TEST-0001'");
check("DB row matches what was typed", row === "TEST-0001|Test Sokha Chan|តេស្ត សុខា ចាន់|2014-05-17|female|11.556400|104.928200|active|t", row);
check("guardian stored normalised and primary", sql("select phone||'/'||phone_alt||'/'||is_primary from public.student_guardians where student_id='TEST-0001'") === "012345678/+85598765432/true");
check("emergency contact stored normalised", sql("select phone from public.student_emergency_contacts where student_id='TEST-0001'") === "011222333");
check("enrollment stored as current", sql("select count(*) from public.student_enrollments where student_id='TEST-0001' and left_on is null") === "1");

// ---------- Validation errors keep what was typed ----------
await go(page, "/dashboard/students/new");
await fill(page, { studentId: "TEST-0009", fullName: "", fullNameKm: "Not khmer", dateOfBirth: "2999-01-01", gender: "female", guardianNameEn: "Test Only Name", guardianPhone: "12", contactNameEn: "X" });
await page.type("#homeLatitude", "11.5");
await page.click("main form button[type=submit]");
await waitText(page, "Please review the highlighted fields.");
const t2 = await text(page);
for (const msg of ["This field is required.", "Use Khmer script for the Khmer name.", "The date cannot be in the future.", "Enter a valid phone number", "Enter both latitude and longitude"]) {
  check(`validation message shown: ${msg}`, t2.includes(msg));
}
const kept = await page.evaluate(() => ({ id: document.querySelector("#studentId").value, km: document.querySelector("#fullNameKm").value, g: document.querySelector("#gender").value, lat: document.querySelector("#homeLatitude").value, gn: document.querySelector("#guardianNameEn").value }));
check("typed values survive a failed submit", kept.id === "TEST-0009" && kept.km === "Not khmer" && kept.g === "female" && kept.lat === "11.5" && kept.gn === "Test Only Name", JSON.stringify(kept));
check("invalid submit created nothing", sql("select count(*) from public.students where student_id='TEST-0009'") === "0");
await page.screenshot({ path: "/tmp/e2e/shot-form-errors.png", fullPage: true });

// ---------- Duplicate ID ----------
await go(page, "/dashboard/students/new");
await fill(page, { studentId: "TEST-0001", fullName: "Test Duplicate" });
await page.click("main form button[type=submit]");
await waitText(page, "That student ID is already in use.");
check("duplicate student ID -> friendly message, nothing overwritten", sql("select full_name from public.students where student_id='TEST-0001'") === "Test Sokha Chan");

// ---------- Minimal registration ----------
await go(page, "/dashboard/students/new");
await fill(page, { studentId: "TEST-0002", fullName: "Test Minimal Student" });
await submitAndWaitNav(page);
await waitText(page, "Personal details");
check("minimal student (ID + English name) registers", page.url().includes("TEST-0002") && sql("select count(*) from public.students where student_id='TEST-0002'") === "1");
const t3 = await text(page);
check("profile of minimal student shows empty states", t3.includes("No guardian recorded yet.") && t3.includes("No address recorded.") && t3.includes("Not assigned to a class."));

// ---------- Atomic failure through the UI: bad guardian phone slipped past nothing, class FK ----------
await browser.close();
process.exitCode = summary() ? 1 : 0;
