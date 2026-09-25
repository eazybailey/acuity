// Read-only Acuity lookups for the app, per studio. React cache() dedupes within one request.

import { cache } from "react";
import type {
  Appointment, AppointmentType, AvailabilityDate, AvailabilityTime, Certificate, Client, Product,
} from "./acuity";
import { studioClient, type StudioCode } from "./studios";
import { LONDON, londonDate } from "./time";
import { bookableTypes, totalMinutes } from "./packages";

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// Exact, case-insensitive email match (Acuity's search is fuzzy).
export function matchClient(clients: Client[], email: string): Client | null {
  const e = email.trim().toLowerCase();
  return clients.find((c) => typeof c.email === "string" && c.email.trim().toLowerCase() === e) ?? null;
}

export const findClient = cache(async (code: StudioCode, email: string): Promise<Client | null> => {
  const list = await studioClient(code).get("/clients", { search: email });
  return matchClient(arr<Client>(list), email);
});

export const getCertificates = cache(async (code: StudioCode, email: string): Promise<Certificate[]> =>
  arr<Certificate>(await studioClient(code).get("/certificates", { email }))
    // Defensive: only this client's certificates, whatever the API's matching does.
    .filter((c) => !c.email || c.email.toLowerCase() === email.toLowerCase())
);

export const getUpcoming = cache(async (code: StudioCode, email: string): Promise<Appointment[]> =>
  arr<Appointment>(
    await studioClient(code).get("/appointments", { email, minDate: londonDate(), direction: "ASC", max: 20 })
  )
);

export const getAppointmentTypes = cache(async (code: StudioCode): Promise<AppointmentType[]> =>
  arr<AppointmentType>(await studioClient(code).get("/appointment-types"))
);

export const getProducts = cache(async (code: StudioCode): Promise<Product[]> =>
  arr<Product>(await studioClient(code).get("/products"))
);

export const getDates = cache(async (code: StudioCode, appointmentTypeID: number, month: string) =>
  arr<AvailabilityDate>(
    await studioClient(code).get("/availability/dates", { appointmentTypeID, month, timezone: LONDON })
  )
);

export const getTimes = cache(async (code: StudioCode, appointmentTypeID: number, date: string) =>
  arr<AvailabilityTime>(
    await studioClient(code).get("/availability/times", { appointmentTypeID, date, timezone: LONDON })
  )
);

// Minutes plus the types they can be spent on.
export const getMinutes = cache(async (code: StudioCode, email: string) => {
  const today = londonDate();
  const [certs, types] = await Promise.all([getCertificates(code, email), getAppointmentTypes(code)]);
  return { certs, today, minutes: totalMinutes(certs, today), types: bookableTypes(types, certs, today) };
});
