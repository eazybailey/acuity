import { redirect } from "next/navigation";
import { login } from "../actions";
import { getSessionEmail } from "@/lib/auth";
import { loginBlockedReason } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  code: "That access code is not right.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getSessionEmail()) redirect("/");
  const { e } = await searchParams;
  const blocked = loginBlockedReason();

  return (
    <main>
      <h1>Sign in</h1>
      {blocked ? (
        <p className="err">{blocked}</p>
      ) : (
        <form action={login}>
          <p className="muted">Preview only. Use the email you book with at your studio.</p>
          {e && ERRORS[e] && <p className="err" role="alert">{ERRORS[e]}</p>}
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
