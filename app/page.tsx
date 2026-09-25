import Link from "next/link";
import { Suspense } from "react";
import type { Appointment, AppointmentType } from "@/lib/acuity";
import { requireStudio } from "@/lib/auth";
import { getMinutes, getUpcoming, nextSlots } from "@/lib/data";
import { READ_ONLY_MESSAGE, type Studio } from "@/lib/studios";
import { formatDateTime } from "@/lib/time";
import { Header } from "./header";
import { RefreshOnReturn } from "./refresh-on-return";

export const dynamic = "force-dynamic";

// My minutes: the home screen once signed in and a studio is chosen.
export default async function Home({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const { email, studio } = await requireStudio();
  const { booked } = await searchParams;

  let data: { minutes: number; types: AppointmentType[]; upcoming: Appointment[] } | null = null;
  try {
    const [m, upcoming] = await Promise.all([getMinutes(studio.code, email), getUpcoming(studio.code, email)]);
    data = { minutes: m.minutes, types: m.types, upcoming };
  } catch {
    data = null;
  }

  // Quick-book type: the only bookable type, else the type of their next session.
  const quickType =
    data && (data.types.length === 1
      ? data.types[0]
      : data.types.find((t) => t.id === data.upcoming[0]?.appointmentTypeID));

  return (
    <main>
      <RefreshOnReturn />
      <Header email={email} studioName={studio.name} />
      {booked && <p role="status"><strong>Booked.</strong></p>}
      <h1>My minutes</h1>

      {!data ? (
        <p className="err">Could not reach {studio.name} right now. Try again shortly.</p>
      ) : (
        <>
          <p className="big">{data.minutes}</p>
          <p className="muted">minutes left</p>

          {quickType && studio.writable && (
            <Suspense fallback={<p className="muted">Finding next times…</p>}>
              <QuickBook studio={studio} type={quickType} />
            </Suspense>
          )}

          <p>
            {studio.writable ? (
              <Link className="btn" href="/book">Book</Link>
            ) : (
              <span className="muted">{READ_ONLY_MESSAGE}</span>
            )}{" "}
            <Link className="btn" href="/buy">Buy package</Link>
          </p>

          <h2>Upcoming</h2>
          {data.upcoming.length === 0 ? (
            <p className="muted">Nothing booked.</p>
          ) : (
            <ul>
              {data.upcoming.map((a) => (
                <li key={a.id}>
                  {formatDateTime(a.datetime)} · {a.type}
                  {a.calendar ? ` · ${a.calendar}` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

// Streams in after the minutes: the next few free times, one tap from confirm.
async function QuickBook({ studio, type }: { studio: Studio; type: AppointmentType }) {
  let slots: Awaited<ReturnType<typeof nextSlots>> = [];
  try {
    slots = await nextSlots(studio.code, type.id, 3);
  } catch {
    return null;
  }
  if (slots.length === 0) return null;
  return (
    <>
      <h2>Next free · {type.name}</h2>
      <ul>
        {slots.map((s) => (
          <li key={s.time}>
            <Link className="btn" href={`/book/confirm?type=${type.id}&time=${encodeURIComponent(s.time)}`}>
              {formatDateTime(s.time)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
