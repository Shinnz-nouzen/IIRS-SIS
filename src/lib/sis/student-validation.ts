// Pure, dependency-free validation and parsing for the student module. It runs on
// the server (Server Actions) and is unit-tested with `node --test`. Errors are
// returned as stable codes; the UI turns them into English or Khmer text.
// Keep this file free of imports and of TypeScript-only runtime syntax (enums,
// parameter properties) so Node can execute it directly with type stripping.

export const STUDENT_STATUSES = [
  "pending",
  "active",
  "on_leave",
  "graduated",
  "transferred",
  "withdrawn",
  "inactive",
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const GUARDIAN_RELATIONSHIPS = [
  "father",
  "mother",
  "grandparent",
  "uncle_aunt",
  "sibling",
  "legal_guardian",
  "other",
] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export type ErrorCode =
  | "required"
  | "tooLong"
  | "edgeSpaces"
  | "notLatin"
  | "notKhmer"
  | "invalidDate"
  | "futureDate"
  | "tooOld"
  | "invalidPhone"
  | "invalidEmail"
  | "invalidLatitude"
  | "invalidLongitude"
  | "locationPair"
  | "atLeastOneName"
  | "invalidChoice"
  | "invalidFormat"
  | "photoType"
  | "photoSize"
  | "invalidSchoolYear";

export type FieldErrors = Record<string, ErrorCode | undefined>;

export const LIMITS = {
  studentId: 64,
  name: 200,
  placeOfBirth: 120,
  nationality: 80,
  address: 200,
  addressPart: 120,
  addressNotes: 300,
  occupation: 100,
  contactRelationship: 60,
  email: 254,
  gradeLevel: 40,
  section: 20,
  className: 80,
} as const;

export const MIN_DATE = "1990-01-01";
export const MAX_RELATED_ROWS = 10;

export type Getter = (name: string) => string;

export function formGetter(formData: FormData): Getter {
  return (name) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function clean(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

const khmerPattern = /[\u1780-\u17FF]/;
const latinPattern = /[A-Za-z]/;

export function hasKhmer(value: string): boolean {
  return khmerPattern.test(value);
}

export function hasLatin(value: string): boolean {
  return latinPattern.test(value);
}

// Date "today" in Cambodia (UTC+7, no DST), as YYYY-MM-DD.
export function todayInPhnomPenh(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Strips spaces, hyphens, dots and brackets; "00855…" becomes "+855…".
export function normalizePhone(raw: string): string {
  let value = raw.replace(/[\s\-.()]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  return value;
}

export function isValidPhone(normalized: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(normalized);
}

export function isValidEmail(value: string): boolean {
  return value.length <= LIMITS.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function ageInYears(dateOfBirth: string, today: string): number | null {
  if (!isRealDate(dateOfBirth) || !isRealDate(today)) return null;
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age < 0 ? null : age;
}

// Cambodia's rough bounding box; used only for a soft warning, never to reject.
export function isInsideCambodia(latitude: number, longitude: number): boolean {
  return (
    latitude >= 9.9 && latitude <= 15.0 && longitude >= 102.2 && longitude <= 107.8
  );
}

function checkText(
  errors: FieldErrors,
  field: string,
  value: string,
  max: number,
  { required = false }: { required?: boolean } = {},
): string | null {
  if (value === "") {
    if (required) errors[field] = "required";
    return null;
  }
  if (value.length > max) {
    errors[field] = "tooLong";
    return null;
  }
  return value;
}

function checkDate(
  errors: FieldErrors,
  field: string,
  value: string,
  today: string,
  { allowFuture = false }: { allowFuture?: boolean } = {},
): string | null {
  if (value === "") return null;
  if (!isRealDate(value)) {
    errors[field] = "invalidDate";
    return null;
  }
  if (value < MIN_DATE) {
    errors[field] = "tooOld";
    return null;
  }
  if (!allowFuture && value > today) {
    errors[field] = "futureDate";
    return null;
  }
  return value;
}

function checkChoice<T extends string>(
  errors: FieldErrors,
  field: string,
  value: string,
  allowed: readonly T[],
  { required = false }: { required?: boolean } = {},
): T | null {
  if (value === "") {
    if (required) errors[field] = "required";
    return null;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    errors[field] = "invalidChoice";
    return null;
  }
  return value as T;
}

function checkPhone(
  errors: FieldErrors,
  field: string,
  raw: string,
  { required = false }: { required?: boolean } = {},
): string | null {
  const value = normalizePhone(clean(raw));
  if (value === "") {
    if (required) errors[field] = "required";
    return null;
  }
  if (!isValidPhone(value)) {
    errors[field] = "invalidPhone";
    return null;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Student core
// ---------------------------------------------------------------------------
export const studentFieldNames = [
  "studentId",
  "fullName",
  "fullNameKm",
  "dateOfBirth",
  "gender",
  "placeOfBirth",
  "nationality",
  "admissionDate",
  "enrollmentStatus",
  "addressLine",
  "village",
  "commune",
  "district",
  "province",
  "addressNotes",
  "homeLatitude",
  "homeLongitude",
] as const;
export type StudentFieldName = (typeof studentFieldNames)[number];
export type StudentFormValues = Record<StudentFieldName, string>;

export type StudentCoreData = {
  studentId: string;
  fullName: string;
  fullNameKm: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  placeOfBirth: string | null;
  nationality: string | null;
  admissionDate: string | null;
  enrollmentStatus: StudentStatus;
  addressLine: string | null;
  village: string | null;
  commune: string | null;
  district: string | null;
  province: string | null;
  addressNotes: string | null;
  homeLatitude: number | null;
  homeLongitude: number | null;
};

export const emptyStudentValues: StudentFormValues = {
  studentId: "",
  fullName: "",
  fullNameKm: "",
  dateOfBirth: "",
  gender: "",
  placeOfBirth: "",
  nationality: "",
  admissionDate: "",
  enrollmentStatus: "active",
  addressLine: "",
  village: "",
  commune: "",
  district: "",
  province: "",
  addressNotes: "",
  homeLatitude: "",
  homeLongitude: "",
};

function parseCoordinate(raw: string): number | null {
  const text = clean(raw);
  if (text === "") return null;
  const normalized = /^-?\d+,\d+$/.test(text) ? text.replace(",", ".") : text;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function parseStudentCore(
  get: Getter,
  {
    mode,
    today = todayInPhnomPenh(),
  }: { mode: "create" | "update"; today?: string },
): { values: StudentFormValues; errors: FieldErrors; data: StudentCoreData | null } {
  const values = { ...emptyStudentValues };
  for (const name of studentFieldNames) values[name] = clean(get(name));
  const errors: FieldErrors = {};

  // The ID is only editable on creation; updates identify the row separately.
  const studentId = checkText(errors, "studentId", values.studentId, LIMITS.studentId, {
    required: mode === "create",
  });

  const fullName = checkText(errors, "fullName", values.fullName, LIMITS.name, {
    required: true,
  });
  if (fullName && !errors.fullName && !hasLatin(fullName)) errors.fullName = "notLatin";

  const fullNameKm = checkText(errors, "fullNameKm", values.fullNameKm, LIMITS.name);
  if (fullNameKm && !errors.fullNameKm && !hasKhmer(fullNameKm)) {
    errors.fullNameKm = "notKhmer";
  }

  const dateOfBirth = checkDate(errors, "dateOfBirth", values.dateOfBirth, today);
  const gender = checkChoice(errors, "gender", values.gender, GENDERS);
  const placeOfBirth = checkText(errors, "placeOfBirth", values.placeOfBirth, LIMITS.placeOfBirth);
  const nationality = checkText(errors, "nationality", values.nationality, LIMITS.nationality);
  const admissionDate = checkDate(errors, "admissionDate", values.admissionDate, today, {
    allowFuture: true,
  });
  const enrollmentStatus = checkChoice(
    errors,
    "enrollmentStatus",
    values.enrollmentStatus,
    STUDENT_STATUSES,
    { required: true },
  );

  const addressLine = checkText(errors, "addressLine", values.addressLine, LIMITS.address);
  const village = checkText(errors, "village", values.village, LIMITS.addressPart);
  const commune = checkText(errors, "commune", values.commune, LIMITS.addressPart);
  const district = checkText(errors, "district", values.district, LIMITS.addressPart);
  const province = checkText(errors, "province", values.province, LIMITS.addressPart);
  const addressNotes = checkText(errors, "addressNotes", values.addressNotes, LIMITS.addressNotes);

  const latitude = parseCoordinate(values.homeLatitude);
  const longitude = parseCoordinate(values.homeLongitude);
  let homeLatitude: number | null = null;
  let homeLongitude: number | null = null;
  if (latitude !== null && Number.isNaN(latitude)) errors.homeLatitude = "invalidLatitude";
  if (longitude !== null && Number.isNaN(longitude)) errors.homeLongitude = "invalidLongitude";
  if (!errors.homeLatitude && !errors.homeLongitude) {
    if ((latitude === null) !== (longitude === null)) {
      errors[latitude === null ? "homeLatitude" : "homeLongitude"] = "locationPair";
    } else if (latitude !== null && longitude !== null) {
      if (latitude < -90 || latitude > 90) errors.homeLatitude = "invalidLatitude";
      if (longitude < -180 || longitude > 180) errors.homeLongitude = "invalidLongitude";
      if (!errors.homeLatitude && !errors.homeLongitude) {
        homeLatitude = Math.round(latitude * 1e6) / 1e6;
        homeLongitude = Math.round(longitude * 1e6) / 1e6;
      }
    }
  }

  if (Object.values(errors).some(Boolean) || !fullName || !enrollmentStatus) {
    return { values, errors, data: null };
  }
  if (mode === "create" && !studentId) return { values, errors, data: null };

  return {
    values,
    errors,
    data: {
      studentId: studentId ?? "",
      fullName,
      fullNameKm,
      dateOfBirth,
      gender,
      placeOfBirth,
      nationality,
      admissionDate,
      enrollmentStatus,
      addressLine,
      village,
      commune,
      district,
      province,
      addressNotes,
      homeLatitude,
      homeLongitude,
    },
  };
}

// ---------------------------------------------------------------------------
// Guardian
// ---------------------------------------------------------------------------
export type GuardianData = {
  relationship: GuardianRelationship;
  fullNameEn: string | null;
  fullNameKm: string | null;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  occupation: string | null;
  isPrimary: boolean;
  livesWithStudent: boolean | null;
};

export const guardianFieldSuffixes = [
  "Relationship",
  "NameEn",
  "NameKm",
  "Phone",
  "PhoneAlt",
  "Email",
  "Occupation",
  "LivesWith",
] as const;

export function parseGuardian(
  get: Getter,
  prefix: string,
  { optional }: { optional: boolean },
): {
  values: Record<string, string>;
  errors: FieldErrors;
  data: GuardianData | null;
  blank: boolean;
} {
  const values: Record<string, string> = {};
  for (const suffix of guardianFieldSuffixes) values[prefix + suffix] = clean(get(prefix + suffix));
  values[`${prefix}IsPrimary`] = get(`${prefix}IsPrimary`) === "on" ? "on" : "";

  const blank = guardianFieldSuffixes.every((suffix) => values[prefix + suffix] === "");
  if (optional && blank) return { values, errors: {}, data: null, blank: true };

  const errors: FieldErrors = {};
  const relationship = checkChoice(
    errors,
    `${prefix}Relationship`,
    values[`${prefix}Relationship`],
    GUARDIAN_RELATIONSHIPS,
    { required: true },
  );
  const fullNameEn = checkText(errors, `${prefix}NameEn`, values[`${prefix}NameEn`], LIMITS.name);
  const fullNameKm = checkText(errors, `${prefix}NameKm`, values[`${prefix}NameKm`], LIMITS.name);
  if (fullNameEn && !errors[`${prefix}NameEn`] && !hasLatin(fullNameEn)) {
    errors[`${prefix}NameEn`] = "notLatin";
  }
  if (fullNameKm && !errors[`${prefix}NameKm`] && !hasKhmer(fullNameKm)) {
    errors[`${prefix}NameKm`] = "notKhmer";
  }
  if (!fullNameEn && !fullNameKm && !errors[`${prefix}NameEn`] && !errors[`${prefix}NameKm`]) {
    errors[`${prefix}NameEn`] = "atLeastOneName";
  }
  const phone = checkPhone(errors, `${prefix}Phone`, values[`${prefix}Phone`], { required: true });
  const phoneAlt = checkPhone(errors, `${prefix}PhoneAlt`, values[`${prefix}PhoneAlt`]);
  let email: string | null = null;
  if (values[`${prefix}Email`] !== "") {
    if (isValidEmail(values[`${prefix}Email`])) email = values[`${prefix}Email`];
    else errors[`${prefix}Email`] = "invalidEmail";
  }
  const occupation = checkText(errors, `${prefix}Occupation`, values[`${prefix}Occupation`], LIMITS.occupation);
  const livesWithRaw = values[`${prefix}LivesWith`];
  let livesWithStudent: boolean | null = null;
  if (livesWithRaw === "yes") livesWithStudent = true;
  else if (livesWithRaw === "no") livesWithStudent = false;
  else if (livesWithRaw !== "") errors[`${prefix}LivesWith`] = "invalidChoice";

  if (Object.values(errors).some(Boolean) || !relationship || !phone) {
    return { values, errors, data: null, blank };
  }
  return {
    values,
    errors,
    blank,
    data: {
      relationship,
      fullNameEn,
      fullNameKm,
      phone,
      phoneAlt,
      email,
      occupation,
      isPrimary: values[`${prefix}IsPrimary`] === "on",
      livesWithStudent,
    },
  };
}

// ---------------------------------------------------------------------------
// Emergency contact
// ---------------------------------------------------------------------------
export type ContactData = {
  fullNameEn: string | null;
  fullNameKm: string | null;
  relationship: string;
  phone: string;
  phoneAlt: string | null;
  priority: number;
};

export const contactFieldSuffixes = [
  "NameEn",
  "NameKm",
  "Relationship",
  "Phone",
  "PhoneAlt",
] as const;

export function parseContact(
  get: Getter,
  prefix: string,
  { optional }: { optional: boolean },
): {
  values: Record<string, string>;
  errors: FieldErrors;
  data: ContactData | null;
  blank: boolean;
} {
  const values: Record<string, string> = {};
  for (const suffix of contactFieldSuffixes) values[prefix + suffix] = clean(get(prefix + suffix));
  values[`${prefix}Priority`] = clean(get(`${prefix}Priority`)) || "1";

  const blank = contactFieldSuffixes.every((suffix) => values[prefix + suffix] === "");
  if (optional && blank) return { values, errors: {}, data: null, blank: true };

  const errors: FieldErrors = {};
  const fullNameEn = checkText(errors, `${prefix}NameEn`, values[`${prefix}NameEn`], LIMITS.name);
  const fullNameKm = checkText(errors, `${prefix}NameKm`, values[`${prefix}NameKm`], LIMITS.name);
  if (fullNameEn && !errors[`${prefix}NameEn`] && !hasLatin(fullNameEn)) {
    errors[`${prefix}NameEn`] = "notLatin";
  }
  if (fullNameKm && !errors[`${prefix}NameKm`] && !hasKhmer(fullNameKm)) {
    errors[`${prefix}NameKm`] = "notKhmer";
  }
  if (!fullNameEn && !fullNameKm && !errors[`${prefix}NameEn`] && !errors[`${prefix}NameKm`]) {
    errors[`${prefix}NameEn`] = "atLeastOneName";
  }
  const relationship = checkText(
    errors,
    `${prefix}Relationship`,
    values[`${prefix}Relationship`],
    LIMITS.contactRelationship,
    { required: true },
  );
  const phone = checkPhone(errors, `${prefix}Phone`, values[`${prefix}Phone`], { required: true });
  const phoneAlt = checkPhone(errors, `${prefix}PhoneAlt`, values[`${prefix}PhoneAlt`]);
  const priority = Number(values[`${prefix}Priority`]);
  if (!Number.isInteger(priority) || priority < 1 || priority > 9) {
    errors[`${prefix}Priority`] = "invalidChoice";
  }

  if (Object.values(errors).some(Boolean) || !relationship || !phone) {
    return { values, errors, data: null, blank };
  }
  return {
    values,
    errors,
    blank,
    data: { fullNameEn, fullNameKm, relationship, phone, phoneAlt, priority },
  };
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------
export type ClassData = {
  schoolYear: string;
  gradeLevel: string;
  section: string | null;
  nameEn: string;
  nameKm: string | null;
  isActive: boolean;
};

export function parseClass(
  get: Getter,
  { mode }: { mode: "create" | "update" },
): {
  values: Record<string, string>;
  errors: FieldErrors;
  data: ClassData | null;
} {
  const values: Record<string, string> = {
    schoolYear: clean(get("schoolYear")),
    gradeLevel: clean(get("gradeLevel")),
    section: clean(get("section")),
    nameEn: clean(get("nameEn")),
    nameKm: clean(get("nameKm")),
    isActive: get("isActive") === "on" ? "on" : "",
  };
  const errors: FieldErrors = {};

  if (mode === "create") {
    const match = /^(\d{4})-(\d{4})$/.exec(values.schoolYear);
    if (values.schoolYear === "") errors.schoolYear = "required";
    else if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      errors.schoolYear = "invalidSchoolYear";
    }
  }
  const gradeLevel = checkText(errors, "gradeLevel", values.gradeLevel, LIMITS.gradeLevel, {
    required: true,
  });
  const section = checkText(errors, "section", values.section, LIMITS.section);
  const nameEn = checkText(errors, "nameEn", values.nameEn, LIMITS.className, { required: true });
  const nameKm = checkText(errors, "nameKm", values.nameKm, LIMITS.className);
  if (nameKm && !errors.nameKm && !hasKhmer(nameKm)) errors.nameKm = "notKhmer";

  if (Object.values(errors).some(Boolean) || !gradeLevel || !nameEn) {
    return { values, errors, data: null };
  }
  return {
    values,
    errors,
    data: {
      schoolYear: values.schoolYear,
      gradeLevel,
      section,
      nameEn,
      nameKm,
      isActive: values.isActive === "on",
    },
  };
}

// ---------------------------------------------------------------------------
// Class assignment date
// ---------------------------------------------------------------------------
export function parseEffectiveDate(
  raw: string,
  today: string = todayInPhnomPenh(),
): { value: string; error: ErrorCode | null } {
  const value = clean(raw) || today;
  if (!isRealDate(value)) return { value, error: "invalidDate" };
  if (value < MIN_DATE) return { value, error: "tooOld" };
  if (value > today) return { value, error: "futureDate" };
  return { value, error: null };
}
