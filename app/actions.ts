"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AcuityError } from "@/lib/acuity";
import { cookieOptions, requireStudio } from "@/lib/auth";
import { findClient, getAppointmentTypes, getCertificates } from "@/lib/data";
import { confirmMagicLink, sendMagicLink, supabaseMagicLink } from "@/lib/magiclink";
import { bookableTypes, pickCertificate } from "@/lib/packages";
import {
  SESSION_COOKIE, SESSION_TTL_SECONDS, STUDIO_COOKIE, appOrigin, authMode, checkAccessCode, looksLikeEmail,
  normaliseEmail, signSession,
} from "@/lib/session";
import { studioClient } from "@/lib/studios";
import { londonDate } from "@/lib/time";

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// Magic-link mode: email the sign-in link. The session is minted in app/auth/confirm.
export async function sendLoginLink(fd: FormData): Promise<void> {
  if (authMode().mode !== "magic-link") redirect("/login");
  const email = normaliseEmail(field(fd, "email"));
  if (!looksLikeEmail(email)) redirect("/login?e=email");
  redirect(await sendMagicLink(supabaseMagicLink(), email, appOrigin()!));
}

// Magic-link mode: the "Sign in" button on /auth/confirm. Only this POST spends the token.
export async function confirmLogin(fd: FormData): Promise<void> {
  if (authMode().mode !== "magic-link") redirect("/login?e=link");
  const email = await confirmMagicLink(supabaseMagicLink(), fd.get("token_hash"), fd.get("type"));
  if (!email) redirect("/login?e=link");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(email, process.env.SESSION_SECRET!), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
  jar.delete(STUDIO_COOKIE);
  redirect("/studio");
}

// Access-code mode (preview stand-in). Refused when magic link is configured.
export async function login(fd: FormData): Promise<void> {
  if (authMode().mode !== "access-code") redirect("/login");
  const email = normaliseEmail(field(fd, "email"));
  if (!looksLikeEmail(email)) redirect("/login?e=email");
  if (!checkAccessCode(field(fd, "code"), process.env.SKELETON_ACCESS_CODE)) redirect("/login?e=code");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(email, process.env.SESSION_SECRET!), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
  jar.delete(STUDIO_COOKIE);
  redirect("/studio");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(STUDIO_COOKIE);
  redirect("/login");
}

// Books with the client's own package certificate, as the client (NOT admin mode), so
// Acuity applies its normal availability and booking rules.
export async function book(fd: FormData): Promise<void> {
  const { email, studio } = await requireStudio();
  const typeID = Number(field(fd, "type"));
  const time = field(fd, "time");
  const back = `/book/confirm?type=${typeID}&time=${encodeURIComponent(time)}`;
  if (!studio.writable) redirect(`${back}&e=readonly`);
  if (!typeID || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:?\d{2}$/.test(time)) redirect("/book");

  let error: string | null = null;
  try {
    const today = londonDate();
    const [types, certs, client] = await Promise.all([
      getAppointmentTypes(studio.code),
      getCertificates(studio.code, email),
      findClient(studio.code, email),
    ]);
    const type = bookableTypes(types, certs, today).find((t) => t.id === typeID);
    const cert = type ? pickCertificate(certs, type, today) : null;
    if (!client) error = "client";
    else if (!type || !cert) error = "minutes";
    else {
      await studioClient(studio.code).write("POST", "/appointments", {
        query: studio.notify ? undefined : { noEmail: true },
        body: {
          datetime: time,
          appointmentTypeID: type.id,
          firstName: client.firstName ?? "",
          lastName: client.lastName ?? "",
          email: client.email ?? email,
          certificate: cert.certificate,
        },
      });
    }
  } catch (e) {
    const msg =
      e instanceof AcuityError && e.body && typeof e.body === "object" && "message" in e.body
        ? String((e.body as { message: unknown }).message)
        : e instanceof Error ? e.message : "unknown error";
    error = `acuity:${msg}`.slice(0, 300);
  }
  if (error) redirect(`${back}&e=${encodeURIComponent(error)}`);
  redirect("/?booked=1");
}
