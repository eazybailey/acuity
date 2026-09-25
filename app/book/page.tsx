import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudio } from "@/lib/auth";
import { getDates, getMinutes, getTimes } from "@/lib/data";
import { READ_ONLY_MESSAGE } from "@/lib/studios";
import { formatDay, formatTime, londonMonth, nextMonth } from "@/lib/time";
import { Header } from "../header";

export const dynamic = "force-dynamic";

type Params = { type?: string; month?: string; date?: string };

// Book: type -> date -> time -> confirm. Each step is a plain link; no client JS.
export default async function BookPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { email, studio } = await requireStudio();
  const sp = await searchParams;

  const shell = (body: React.ReactNode) => (
    <main>
      <Header email={email} studioName={studio.name} />
      <p><Link href="/">← My minutes</Link></p>
      <h1>Book</h1>
      {body}
    </main>
  );

  if (!studio.writable) return shell(<p>{READ_ONLY_MESSAGE}</p>);

  let types;
  try {
    types = (await getMinutes(studio.code, email)).types;
  } catch {
    return shell(<p className="err">Could not reach {studio.name}. Try again shortly.</p>);
  }

  if (types.length === 0) {
    return shell(
      <p>You have no minutes that can be booked. <Link href="/buy">Buy a package</Link></p>
    );
  }

  const type = types.find((t) => t.id === Number(sp.type));
  if (!type) {
    if (types.length === 1) redirect(`/book?type=${types[0].id}`);
    return shell(
      <ul>
        {types.map((t) => (
          <li key={t.id}>
            <Link className="btn" href={`/book?type=${t.id}`}>{t.name} ({t.duration} min)</Link>
          </li>
        ))}
      </ul>
    );
  }

  const thisMonth = londonMonth();
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) && sp.month >= thisMonth ? sp.month : thisMonth;
  let dates, times;
  try {
    dates = await getDates(studio.code, type.id, month);
    const date = dates.find((d) => d.date === sp.date)?.date ?? dates[0]?.date;
    times = date ? { date, list: await getTimes(studio.code, type.id, date) } : null;
  } catch {
    return shell(<p className="err">Could not load availability. Try again shortly.</p>);
  }

  const base = `/book?type=${type.id}`;
  return shell(
    <>
      <p>
        {type.name} · {type.duration} min
        {types.length > 1 && <> · <Link href="/book">change</Link></>}
      </p>

      <h2>Day</h2>
      {dates.length === 0 ? (
        <p className="muted">No free days this month.</p>
      ) : (
        <p>
          {dates.map((d) => (
            <span key={d.date}>
              {d.date === times?.date ? (
                <strong className="btn">{formatDay(d.date)}</strong>
              ) : (
                <Link className="btn" href={`${base}&month=${month}&date=${d.date}`}>{formatDay(d.date)}</Link>
              )}{" "}
            </span>
          ))}
        </p>
      )}
      <p><Link href={`${base}&month=${nextMonth(month)}`}>Next month →</Link></p>

      {times && (
        <>
          <h2>Time · {formatDay(times.date)}</h2>
          {times.list.length === 0 ? (
            <p className="muted">No free times on this day.</p>
          ) : (
            <p>
              {times.list.map((t) => (
                <span key={t.time}>
                  <Link className="btn" href={`/book/confirm?type=${type.id}&time=${encodeURIComponent(t.time)}`}>
                    {formatTime(t.time)}
                  </Link>{" "}
                </span>
              ))}
            </p>
          )}
        </>
      )}
    </>
  );
}
