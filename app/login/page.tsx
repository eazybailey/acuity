import { redirect } from "next/navigation";
import { login, sendLoginLink } from "../actions";
import { getSessionEmail } from "@/lib/auth";
import { authMode } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  code: "That access code is not right.",
  send: "We could not send a sign-in link just now. Please try again in a few minutes.",
  link: "That sign-in link has expired or was already used. Enter your email for a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string; sent?: string }> }) {
  if (await getSessionEmail()) redirect("/");
  const { e, sent } = await searchParams;
  const auth = authMode();
  const error = e && ERRORS[e] && <p className="err" role="alert">{ERRORS[e]}</p>;

  return (
    <main>
      <h1>Sign in</h1>
      {auth.mode === "blocked" ? (
        <p className="err">{auth.reason}</p>
      ) : auth.mode === "magic-link" ? (
        sent ? (
          <p role="status">Check your email. We have sent you a link to sign in; it works once and expires soon.</p>
        ) : (
          <form action={sendLoginLink}>
            <p className="muted">Use the email you book with at your studio.</p>
            {error}
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
            <p><button type="submit">Email me a sign-in link</button></p>
          </form>
        )
      ) : (
        <form action={login}>
          <p className="muted">Preview only. Use the email you book with at your studio.</p>
          {error}
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          <label htmlFor="code">Access code</label>
          <input id="code" name="code" type="password" autoComplete="off" required />
          <p><button type="submit">Sign in</button></p>
        </form>
      )}
    </main>
  );
}
