// Minutes-based package logic (pure). Packages are minutes, not sessions:
// a "5 x 30-min" package is 150 minutes on the certificate's `remainingMinutes`.

import type { AppointmentType, Certificate } from "./acuity";

// Acuity expiration is a date string (YYYY-MM-DD, sometimes with time) or null.
export function isExpired(c: Certificate, today: string): boolean {
  if (!c.expiration) return false;
  return String(c.expiration).slice(0, 10) < today;
}

export function minutesOf(c: Certificate): number {
  return typeof c.remainingMinutes === "number" && c.remainingMinutes > 0 ? c.remainingMinutes : 0;
}

// Certificates that still hold minutes and have not expired.
export function usableCertificates(certs: Certificate[], today: string): Certificate[] {
  return certs.filter((c) => minutesOf(c) > 0 && !isExpired(c, today));
}

export function totalMinutes(certs: Certificate[], today: string): number {
  return usableCertificates(certs, today).reduce((sum, c) => sum + minutesOf(c), 0);
}

// A certificate with no appointmentTypeIDs (or an empty list) covers every type.
export function covers(c: Certificate, appointmentTypeID: number): boolean {
  const ids = c.appointmentTypeIDs;
  return !Array.isArray(ids) || ids.length === 0 || ids.map(Number).includes(appointmentTypeID);
}

// Appointment types the client can book with their minutes.
export function bookableTypes(types: AppointmentType[], certs: Certificate[], today: string): AppointmentType[] {
  const usable = usableCertificates(certs, today);
  return types.filter(
    (t) => t.active !== false && usable.some((c) => covers(c, t.id) && minutesOf(c) >= (t.duration || 0))
  );
}

// Certificate to redeem for a booking: covers the type, has enough minutes, soonest to expire.
export function pickCertificate(certs: Certificate[], type: AppointmentType, today: string): Certificate | null {
  const candidates = usableCertificates(certs, today).filter(
    (c) => covers(c, type.id) && minutesOf(c) >= (type.duration || 0)
  );
  candidates.sort((a, b) => {
    const ea = a.expiration ? String(a.expiration) : "9999";
    const eb = b.expiration ? String(b.expiration) : "9999";
    return ea < eb ? -1 : ea > eb ? 1 : 0;
  });
  return candidates[0] ?? null;
}

// Acuity hosted catalogue checkout for one product. Payment happens entirely inside Acuity
// using that studio's own Stripe; the app never takes payment.
//
// UNVERIFIED: Acuity does not document this URL. The form `catalog.php?owner=<user id>&
// action=addCart&id=<product id>` appears on live Acuity pages (indexed by search engines),
// and Acuity's help centre says each package has a "Direct link" in the Packages panel but
// does not print its format. `clear=1` (empty the cart first) is not verified. Before launch,
// compare with a "Direct link" copied from the MH admin (Packages, Gifts & Subscriptions >
// Types > Direct link) and adjust here only.
export function checkoutUrl(ownerUserId: string, productID: number): string {
  const q = new URLSearchParams({
    owner: ownerUserId,
    action: "addCart",
    clear: "1",
    id: String(productID),
  });
  return `https://app.acuityscheduling.com/catalog.php?${q.toString()}`;
}
