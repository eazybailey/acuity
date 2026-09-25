import { NextRequest, NextResponse } from "next/server";
import {
  acuity,
  AcuityError,
  acuityDatetime,
  remainingSessions,
  type Certificate,
} from "@/lib/acuity";
import { londonOffsetMinutes } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every action is a POST with a JSON body. The page sends the shared secret in a header.
// Actions map one-to-one onto the Gate 0 protocol steps.

type Body = Record<string, unknown>;

function str(b: Body, k: string): string | undefined {
  const v = b[k];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(b: Body, k: string): number | undefined {
  const v = b[k];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

// Tomorrow at HH:00 London time, as an Acuity datetime string.
function tomorrowAt(hourLondon: number): string {
  const now = new Date();
  const offset = londonOffsetMinutes(now);
  const londonNow = new Date(now.getTime() + offset * 60_000);
  const y = londonNow.getUTCFullYear(), m = londonNow.getUTCMonth(), d = londonNow.getUTCDate() + 1;
  const wallUTC = Date.UTC(y, m, d, hourLondon, 0, 0);
  const instant = new Date(wallUTC - offset * 60_000);
  return acuityDatetime(instant, londonOffsetMinutes(instant));
}

async function handle(action: string, b: Body): Promise<unknown> {
  switch (action) {
    // 1. Confirm auth, list what we need to choose from.
    case "discover": {
      const [me, products, types, calendars] = await Promise.all([
        acuity("GET", "/me"),
        acuity("GET", "/products"),
        acuity("GET", "/appointment-types"),
        acuity("GET", "/calendars"),
      ]);
      return { me, products, appointmentTypes: types, calendars };
    }

    // Reference: a genuinely purchased certificate to compare against the minted one.
    case "reference": {
      const productID = num(b, "productID");
      const all = await acuity<Certificate[]>("GET", "/certificates", { query: { productID } });
      const list = Array.isArray(all) ? all : [];
      const purchased = list.find((c) => c.orderID) ?? null;
      return {
        count: list.length,
        purchased,
        note: purchased
          ? "A certificate with an orderID — created via Acuity checkout. Compare its fields with the minted one."
          : "No certificate with an orderID found for this product. Try without productID, or pick a product that has been sold.",
        sample: list.slice(0, 5),
      };
    }

    // 2. Mint a package certificate for the test client.
    case "mint": {
      const productID = num(b, "productID");
      const email = str(b, "email");
      if (!productID || !email) throw new Error("productID and email are required");
      const cert = await acuity<Certificate>("POST", "/certificates", { body: { productID, email } });
      return { certificate: cert, remaining: remainingSessions(cert) };
    }

    // 3/5/6. Read the balance as Acuity sees it right now.
    case "balance": {
      const email = str(b, "email");
      const code = str(b, "certificate");
      if (!email) throw new Error("email is required");
      const list = await acuity<Certificate[]>("GET", "/certificates", { query: { email } });
      const arr = Array.isArray(list) ? list : [];
      const match = code ? arr.find((c) => c.certificate === code) ?? null : null;
      const clients = await acuity("GET", "/clients", { query: { search: email } });
      return {
        remaining: match ? remainingSessions(match) : null,
        certificate: match,
        allForEmail: arr,
        clientRecord: clients,
      };
    }

    // 4. Book via API with the certificate. Admin mode + noEmail: no availability check, no emails.
    case "book": {
      const appointmentTypeID = num(b, "appointmentTypeID");
      const calendarID = num(b, "calendarID");
      const email = str(b, "email");
      const certificate = str(b, "certificate");
      const hour = num(b, "hourLondon") ?? 10;
      const firstName = str(b, "firstName") ?? "Gate0";
      const lastName = str(b, "lastName") ?? "Test";
      if (!appointmentTypeID || !calendarID || !email) {
        throw new Error("appointmentTypeID, calendarID and email are required");
      }
      const datetime = str(b, "datetime") ?? tomorrowAt(hour);
      const appt = await acuity("POST", "/appointments", {
        query: { admin: true, noEmail: true },
        body: { datetime, appointmentTypeID, calendarID, firstName, lastName, email, certificate,
                notes: "Gate 0 test booking — safe to delete" },
      });
      return { requested: { datetime, certificate }, appointment: appt };
    }

    // 6. Cancel one via API.
    case "cancel": {
      const id = num(b, "id");
      if (!id) throw new Error("id is required");
      return acuity("PUT", `/appointments/${id}/cancel`, { query: { admin: true, noEmail: true } });
    }

    // Cleanup helpers.
    case "appointments": {
      const email = str(b, "email");
      if (!email) throw new Error("email is required");
      const minDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const maxDate = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
      return acuity("GET", "/appointments", { query: { email, minDate, maxDate, max: 50 } });
    }
    case "deleteCertificate": {
      const id = num(b, "id");
      if (!id) throw new Error("id is required");
      await acuity("DELETE", `/certificates/${id}`);
      return { deleted: id };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const secret = process.env.GATE0_SECRET;
  if (!secret) return NextResponse.json({ error: "GATE0_SECRET is not set" }, { status: 500 });
  if (req.headers.get("x-gate0-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { action } = await ctx.params;
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await handle(action, body);
    return NextResponse.json({ ok: true, action, startedAt, result });
  } catch (e) {
    if (e instanceof AcuityError) {
      return NextResponse.json(
        { ok: false, action, startedAt, error: e.message, status: e.status, acuity: e.body },
        { status: 502 }
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, action, startedAt, error: msg }, { status: 400 });
  }
}
