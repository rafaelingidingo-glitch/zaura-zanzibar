// Timezone-safe calendar date helpers.
// Booking dates are stored as UTC midnight of the property-local calendar date,
// so all comparisons are pure date math and never drift across timezones.

import { PROPERTY_TZ } from "./constants";

const DAY_MS = 86_400_000;

/** Parse 'YYYY-MM-DD' into a UTC-midnight Date. Returns null when invalid. */
export function parseDateOnly(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Format a UTC-midnight date as 'YYYY-MM-DD'. */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in the property timezone, as a UTC-midnight Date. */
export function todayInPropertyTz(): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseDateOnly(key)!;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** Inclusive list of calendar dates [from, to). */
export function eachDate(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) out.push(new Date(t));
  return out;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** '10 December 2026' */
export function formatLongDate(d: Date): string {
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** '10 Dec' */
export function formatShortDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** 'Thu, 10 Dec 2026' */
export function formatMediumDate(d: Date): string {
  const wd = WEEKDAYS[d.getUTCDay()];
  return `${wd}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** '2026-12-10' (or ISO timestamp) → '10 December 2026' (null-safe). */
export function formatKeyLong(key: string): string {
  const d = parseDateOnly(String(key).slice(0, 10));
  return d ? formatLongDate(d) : key;
}

export function monthLabel(year: number, monthZero: number): string {
  return `${MONTHS[monthZero]} ${year}`;
}

export { MONTHS, WEEKDAYS };

/** Client-side helper: local Date → 'YYYY-MM-DD' (uses local getters). */
export function dateKeyFromLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' → local-midnight Date (for calendar UIs). */
export function localFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
