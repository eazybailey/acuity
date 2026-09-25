// Europe/London helpers shared by the Gate 0 route and the app. All studios are in London.

export const LONDON = "Europe/London";

function londonParts(at: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  return Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
}

// Europe/London offset in minutes for a given instant (0 in winter, 60 in BST).
export function londonOffsetMinutes(at: Date): number {
  const parts = londonParts(at);
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return Math.round((asUTC - at.getTime()) / 60_000);
}

// Today's date in London as YYYY-MM-DD (not UTC: 00:30 BST is still "yesterday" in UTC).
export function londonDate(at: Date = new Date()): string {
  const p = londonParts(at);
  return `${p.year}-${p.month}-${p.day}`;
}

// Current London month as YYYY-MM, plus the following month.
export function londonMonth(at: Date = new Date()): string {
  return londonDate(at).slice(0, 7);
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// Display helpers. Acuity returns datetimes with an explicit offset, so parsing is exact.
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, hour: "2-digit", minute: "2-digit" })
    .format(new Date(normaliseOffset(iso)));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(normaliseOffset(iso)));
}

// A YYYY-MM-DD calendar date, labelled as in London.
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${date}T12:00:00Z`));
}

// Acuity uses +0100; some engines only parse +01:00.
export function normaliseOffset(iso: string): string {
  return iso.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}
