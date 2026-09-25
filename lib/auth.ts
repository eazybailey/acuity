// Server-side session access for pages and actions. See lib/session.ts: preview-only stand-in.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, STUDIO_COOKIE, isProductionRuntime, verifySession, verifyStudio } from "./session";
import { getStudio, isStudioCode, type Studio } from "./studios";

export async function getSessionEmail(): Promise<string | null> {
  if (isProductionRuntime()) return null;
  const jar = await cookies();
  const p = verifySession(jar.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  return p?.email ?? null;
}

export async function requireEmail(): Promise<string> {
  const email = await getSessionEmail();
  if (!email) redirect("/login");
  return email;
}

// Signed-in email plus the chosen, connected studio; redirects to /login or /studio otherwise.
export async function requireStudio(): Promise<{ email: string; studio: Studio }> {
  const email = await requireEmail();
  const jar = await cookies();
  const code = verifyStudio(jar.get(STUDIO_COOKIE)?.value, email, process.env.SESSION_SECRET);
  if (!isStudioCode(code)) redirect("/studio");
  const studio = getStudio(code);
  if (!studio.connected) redirect("/studio");
  return { email, studio };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
