// Display helpers shared by server and client components.

export function formatPhone(phone: string): string {
  if (/^\+855\d{8,9}$/.test(phone)) {
    const rest = phone.slice(4);
    return `+855 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`.trim();
  }
  if (/^0\d{8,9}$/.test(phone)) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`.trim();
  }
  return phone;
}

const monthNames: Record<"en" | "km", readonly string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  km: ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"],
};

// Calendar dates arrive as YYYY-MM-DD from the database. They are formatted from
// fixed month tables instead of Intl: Intl output for Khmer depends on the ICU
// data of the server and of the browser, which differ and cause hydration
// mismatches. No timezone conversion happens, so a date never shifts by a day.
export function formatDate(value: string, lang: "en" | "km"): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return value;
  return `${day} ${monthNames[lang][month - 1]} ${year}`;
}

// Timestamps are shown in Cambodia time (UTC+7, no daylight saving).
export function formatTimestamp(value: string, lang: "en" | "km"): string {
  const date = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) return value;
  const day = `${date.getUTCDate()} ${monthNames[lang][date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  const time = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return `${day}, ${time}`;
}

export function openStreetMapLink(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

export function openStreetMapEmbed(latitude: number, longitude: number): string {
  const delta = 0.004;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta]
    .map((n) => n.toFixed(6))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function displayName(
  nameEn: string | null,
  nameKm: string | null,
  lang: "en" | "km",
): { primary: string; secondary: string | null } {
  const first = lang === "km" ? nameKm ?? nameEn : nameEn ?? nameKm;
  const second = lang === "km" ? (nameKm ? nameEn : null) : nameEn ? nameKm : null;
  return { primary: first ?? "", secondary: second && second !== first ? second : null };
}
