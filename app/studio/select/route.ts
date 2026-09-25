import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, getSessionEmail } from "@/lib/auth";
import { findClient } from "@/lib/data";
import { SESSION_TTL_SECONDS, STUDIO_COOKIE, signStudio } from "@/lib/session";
import { getStudio, isStudioCode } from "@/lib/studios";

export const dynamic = "force-dynamic";

// Sets the studio cookie after confirming (read-only) that the client exists at that studio.
export async function GET(req: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);
  const email = await getSessionEmail();
  if (!email) return to("/login");

  const code = req.nextUrl.searchParams.get("code");
  if (!isStudioCode(code) || !getStudio(code).connected) return to("/studio?e=notfound");
  try {
    if (!(await findClient(code, email))) return to("/studio?e=notfound");
  } catch {
    return to("/studio?e=notfound");
  }

  const res = to("/");
  res.cookies.set(STUDIO_COOKIE, signStudio(code, email, process.env.SESSION_SECRET!), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
