import Link from "next/link";
import { requireStudio } from "@/lib/auth";
import { getMinutes } from "@/lib/data";
import { pickCertificate } from "@/lib/packages";
import { READ_ONLY_MESSAGE } from "@/lib/studios";
import { formatDateTime } from "@/lib/time";
import { book } from "../../actions";
import { Header } from "../../header";

export const dynamic = "force-dynamic";

function errorText(e: string): string {
  if (e === "readonly") return READ_ONLY_MESSAGE;
  if (e === "client") return "Your client record was not found at this studio.";
  if (e === "minutes") return "You do not have enough minutes for this session.";
  if (e.startsWith("acuity:")) return `Acuity said: ${e.slice(7)}`;
  return "Booking failed.";
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; time?: string; e?: string }>;
}) {
  const { email, studio } = await requireStudio();
  const sp = await searchParams;
  const time = sp.time ?? "";

  let body: React.ReactNode;
  if (!studio.writable) {
    body = <p>{READ_ONLY_MESSAGE}</p>;
  } else {
    try {
      const { certs, types, today, minutes } = await getMinutes(studio.code, email);
      const type = types.find((t) => t.id === Number(sp.type));
      const cert = type ? pickCertificate(certs, type, today) : null;
      if (!type || !cert || !time) {
        body = <p>This session can no longer be booked with your minutes. <Link href="/book">Pick again</Link></p>;
      } else {
        body = (
          <form action={book}>
            <p>
              <strong>{type.name}</strong>
              <br />
              {formatDateTime(time)} · {type.duration} min
            </p>
            <p className="muted">
              Uses {type.duration} of your {minutes} minutes.
            </p>
            <input type="hidden" name="type" value={type.id} />
            <input type="hidden" name="time" value={time} />
            <p><button type="submit">Confirm booking</button></p>
          </form>
        );
      }
    } catch {
      body = <p className="err">Could not reach {studio.name}. Try again shortly.</p>;
    }
  }

  return (
    <main>
      <Header email={email} studioName={studio.name} />
      <p><Link href={sp.type ? `/book?type=${encodeURIComponent(sp.type)}` : "/book"}>← Other times</Link></p>
      <h1>Confirm</h1>
      {sp.e && <p className="err" role="alert">{errorText(sp.e)}</p>}
      {body}
    </main>
  );
}
