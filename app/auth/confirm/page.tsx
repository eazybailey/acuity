import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { confirmLogin } from "../../actions";
import { confirmParams } from "@/lib/magiclink";
import { authMode } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false } };

type Q = { token_hash?: string | string[]; type?: string | string[] };

// Magic-link landing. Renders a button only; verifying on GET would let mail scanners burn the link.
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const p = confirmParams(q.token_hash, q.type);
  if (authMode().mode !== "magic-link" || !p) redirect("/login?e=link");

  return (
    <main>
      <h1>Sign in</h1>
      <form action={confirmLogin}>
        <input type="hidden" name="token_hash" value={p.tokenHash} />
        <input type="hidden" name="type" value={p.type} />
        <p><button type="submit">Sign in</button></p>
      </form>
    </main>
  );
}
