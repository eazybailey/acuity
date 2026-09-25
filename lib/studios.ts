// Studio registry and the studio-aware Acuity client.
//
// Each of the 9 studios is its own Acuity account (and its own Stripe). Hard rule: only
// Muswell Hill Road (MH) may ever be written to; the other 8 are production data and
// read-only. This is enforced here in code, not by convention:
//   - `writable` is derived from the code (only "MH" can be true), never from env;
//   - every non-GET through studioClient() goes through assertWriteAllowed(), which throws
//     before any network call unless the studio is MH AND the write is on the allowlist.
// The allowlist also guarantees the app never cancels, modifies or deletes certificates or
// subscriptions: the only write the app can make is creating an appointment.

import { acuity, type AcuityCredentials, type Method, type Query } from "./acuity";

export const STUDIO_CODES = ["AP", "CH", "HB", "HGS", "LL", "MH", "PR", "SG", "WMH"] as const;
export type StudioCode = (typeof STUDIO_CODES)[number];

// Only this studio may ever be written to.
export const WRITABLE_STUDIO: StudioCode = "MH";

const NAMES: Partial<Record<StudioCode, string>> = {
  MH: "Muswell Hill Road",
};

export interface Studio {
  code: StudioCode;
  name: string;
  connected: boolean;
  writable: boolean;
  // Send Acuity confirmation/reminder emails on booking. Off while testing.
  notify: boolean;
  credentials: AcuityCredentials | null;
}

type Env = Record<string, string | undefined>;

export function isStudioCode(v: unknown): v is StudioCode {
  return typeof v === "string" && (STUDIO_CODES as readonly string[]).includes(v);
}

function credentialsFor(code: StudioCode, env: Env): AcuityCredentials | null {
  let userId = env[`ACUITY_USER_ID_${code}`];
  let apiKey = env[`ACUITY_API_KEY_${code}`];
  if (code === "MH" && (!userId || !apiKey)) {
    // MH is the Gate 0 account; its keys already live in the unsuffixed vars.
    userId = env.ACUITY_USER_ID;
    apiKey = env.ACUITY_API_KEY;
  }
  return userId && apiKey ? { userId, apiKey } : null;
}

export function getStudio(code: StudioCode, env: Env = process.env): Studio {
  const credentials = credentialsFor(code, env);
  return {
    code,
    name: NAMES[code] ?? code,
    connected: credentials !== null,
    writable: code === WRITABLE_STUDIO,
    notify: false,
    credentials,
  };
}

export function allStudios(env: Env = process.env): Studio[] {
  return STUDIO_CODES.map((c) => getStudio(c, env));
}

export class StudioWriteBlocked extends Error {}

// The only writes the app is allowed to make.
const WRITE_ALLOWLIST: Array<{ method: Method; path: RegExp }> = [
  { method: "POST", path: /^\/appointments$/ },
];

export function assertWriteAllowed(studio: Studio, method: Method, path: string): void {
  if (method === "GET") return;
  if (studio.code !== WRITABLE_STUDIO || !studio.writable) {
    throw new StudioWriteBlocked(`Writes are disabled on studio ${studio.code} (read-only)`);
  }
  if (!WRITE_ALLOWLIST.some((w) => w.method === method && w.path.test(path))) {
    throw new StudioWriteBlocked(`${method} ${path} is not an allowed write`);
  }
}

export interface StudioClient {
  studio: Studio;
  get<T = unknown>(path: string, query?: Query): Promise<T>;
  write<T = unknown>(method: Exclude<Method, "GET">, path: string, opts?: { query?: Query; body?: unknown }): Promise<T>;
}

export function studioClient(code: StudioCode, env: Env = process.env): StudioClient {
  const studio = getStudio(code, env);
  const credentials = studio.credentials;
  if (!credentials) throw new Error(`Studio ${code} is not connected`);
  return {
    studio,
    get: (path, query) => acuity("GET", path, { query, credentials }),
    write: async (method, path, opts = {}) => {
      assertWriteAllowed(studio, method, path);
      return acuity(method, path, { ...opts, credentials });
    },
  };
}
