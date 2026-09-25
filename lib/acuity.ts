// Thin Acuity Scheduling API v1 client. Server-only: reads credentials from env.
// Docs: https://developers.acuityscheduling.com/reference

const BASE = "https://acuityscheduling.com/api/v1";

export class AcuityError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, path: string) {
    super(`Acuity ${status} on ${path}`);
    this.status = status;
    this.body = body;
  }
}

// Per-call credentials. When omitted, falls back to ACUITY_USER_ID / ACUITY_API_KEY
// (the Gate 0 route relies on that). App code should go through studioClient() in
// lib/studios.ts, which passes each studio's own keys and enforces the write guard.
export interface AcuityCredentials {
  userId: string;
  apiKey: string;
}

export function authHeader(creds?: AcuityCredentials): string {
  const user = creds ? creds.userId : process.env.ACUITY_USER_ID;
  const key = creds ? creds.apiKey : process.env.ACUITY_API_KEY;
  if (!user || !key) {
    throw new Error("ACUITY_USER_ID / ACUITY_API_KEY are not set in the environment");
  }
  return "Basic " + Buffer.from(`${user}:${key}`).toString("base64");
}

export type Method = "GET" | "POST" | "PUT" | "DELETE";
export type Query = Record<string, string | number | boolean | undefined>;

function qs(query?: Query): string {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function acuity<T = unknown>(
  method: Method,
  path: string,
  opts: { query?: Query; body?: unknown; credentials?: AcuityCredentials } = {}
): Promise<T> {
  const url = `${BASE}${path}${qs(opts.query)}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(opts.credentials),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* leave as text */
  }

  if (!res.ok) throw new AcuityError(res.status, parsed, `${method} ${path}`);
  return parsed as T;
}

// --- Loose types: Acuity's JSON is not strictly documented, so keep these permissive.

export interface Certificate {
  id: number;
  certificate: string;
  productID?: number;
  orderID?: number | null;
  appointmentTypeIDs?: number[];
  name?: string;
  email?: string;
  type?: string;
  remainingCounts?: Record<string, number>;
  remainingMinutes?: number | null;
  expiration?: string | null;
  [k: string]: unknown;
}

export function remainingSessions(c: Certificate): number | null {
  if (c.remainingCounts && typeof c.remainingCounts === "object") {
    return Object.values(c.remainingCounts).reduce((a, b) => a + Number(b || 0), 0);
  }
  if (typeof c.remainingMinutes === "number") return c.remainingMinutes;
  return null;
}

// Format a Date as Acuity expects: ISO 8601 with numeric offset, no milliseconds.
// Acuity parses it in the business/calendar timezone; an explicit offset removes ambiguity.
export function acuityDatetime(d: Date, offsetMinutes = 0): string {
  const shifted = new Date(d.getTime() + offsetMinutes * 60_000);
  const iso = shifted.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss (UTC)
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${iso}${sign}${hh}${mm}`;
}

export interface Client {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [k: string]: unknown;
}

export interface AppointmentType {
  id: number;
  name: string;
  duration: number;
  price?: string;
  active?: boolean;
  category?: string;
  calendarIDs?: number[];
  [k: string]: unknown;
}

export interface Appointment {
  id: number;
  datetime: string;
  type?: string;
  appointmentTypeID?: number;
  duration?: string | number;
  calendar?: string;
  certificate?: string | null;
  [k: string]: unknown;
}

export interface Product {
  id: number;
  name: string;
  price?: string;
  description?: string;
  type?: string;
  minutes?: number;
  appointmentTypeIDs?: number[];
  hidden?: boolean;
  [k: string]: unknown;
}

export interface AvailabilityDate {
  date: string; // YYYY-MM-DD
}

export interface AvailabilityTime {
  time: string; // ISO 8601 with offset, e.g. 2026-09-26T09:00:00+0100
  slotsAvailable?: number;
}
