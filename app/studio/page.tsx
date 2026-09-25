import { redirect } from "next/navigation";
import { requireEmail } from "@/lib/auth";
import { findClient } from "@/lib/data";
import { allStudios } from "@/lib/studios";
import { Header } from "../header";

export const dynamic = "force-dynamic";

// My studio: which of the connected studios know this email? Read-only lookups, in parallel.
export default async function StudioPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const email = await requireEmail();
  const { e } = await searchParams;
  const studios = allStudios();
  const connected = studios.filter((s) => s.connected);
  const notConnected = studios.filter((s) => !s.connected);

  const results = await Promise.all(
    connected.map(async (s) => {
      try {
        return { studio: s, found: (await findClient(s.code, email)) !== null, failed: false };
      } catch {
        return { studio: s, found: false, failed: true };
      }
    })
  );
  const mine = results.filter((r) => r.found);
  const failed = results.filter((r) => r.failed);

  if (mine.length === 1 && !e) redirect(`/studio/select?code=${mine[0].studio.code}`);

  return (
    <main>
      <Header email={email} />
      <h1>My studio</h1>
      {e === "notfound" && <p className="err">That studio does not have a client with your email.</p>}

      {connected.length === 0 ? (
        <p>No studios are connected yet. Studio Acuity keys have not been added to this deployment.</p>
      ) : mine.length === 0 ? (
        <p>
          We could not find <strong>{email}</strong> at any connected studio. Check you used the email you
          book with, or ask your studio.
        </p>
      ) : (
        <ul>
          {mine.map(({ studio }) => (
            <li key={studio.code}>
              <a className="btn" href={`/studio/select?code=${studio.code}`}>{studio.name}</a>
            </li>
          ))}
        </ul>
      )}

      {failed.length > 0 && (
        <p className="err">Could not reach: {failed.map((r) => r.studio.name).join(", ")}. Try again shortly.</p>
      )}
      {notConnected.length > 0 && (
        <p className="muted">Not connected: {notConnected.map((s) => s.name).join(", ")}</p>
      )}
    </main>
  );
}
