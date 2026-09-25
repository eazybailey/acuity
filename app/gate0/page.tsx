"use client";

import { useEffect, useState } from "react";

type Json = Record<string, unknown>;
type Result = { ok: boolean; action: string; startedAt: string; result?: unknown; error?: string; acuity?: unknown; status?: number };

type Product = { id: number; name: string; price?: string; type?: string; appointmentTypeIDs?: number[]; expires?: unknown; [k: string]: unknown };
type ApptType = { id: number; name: string; duration?: number; price?: string; calendarIDs?: number[]; [k: string]: unknown };
type Calendar = { id: number; name: string; [k: string]: unknown };

type State = {
  secret: string;
  email: string;
  firstName: string;
  lastName: string;
  productID: string;
  appointmentTypeID: string;
  calendarID: string;
  certificateCode: string;
  certificateId: string;
  appointmentIds: number[];
};

const EMPTY: State = {
  secret: "", email: "", firstName: "Gate0", lastName: "Test",
  productID: "", appointmentTypeID: "", calendarID: "",
  certificateCode: "", certificateId: "", appointmentIds: [],
};

const KEY = "gate0-state";

export default function Page() {
  const [s, setS] = useState<State>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<Record<string, Result>>({});
  const [log, setLog] = useState<Array<{ step: string; at: string; res: Result }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<ApptType[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  const set = (k: keyof State) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setS((p) => ({ ...p, [k]: e.target.value }));

  async function call(step: string, action: string, body: Json = {}): Promise<Result> {
    setBusy(step);
    try {
      const r = await fetch(`/api/gate0/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gate0-secret": s.secret },
        body: JSON.stringify(body),
      });
      const res = (await r.json()) as Result;
      setOut((p) => ({ ...p, [step]: res }));
      setLog((p) => [...p, { step, at: new Date().toISOString(), res }]);
      return res;
    } catch (e) {
      const res: Result = { ok: false, action, startedAt: new Date().toISOString(), error: String(e) };
      setOut((p) => ({ ...p, [step]: res }));
      return res;
    } finally {
      setBusy(null);
    }
  }

  const rr = (res?: Result) => (res?.result ?? {}) as Json;

  // --- Steps ---------------------------------------------------------------

  async function discover() {
    const res = await call("1", "discover");
    if (!res.ok) return;
    const r = rr(res);
    setProducts((r.products as Product[]) ?? []);
    setTypes((r.appointmentTypes as ApptType[]) ?? []);
    setCalendars((r.calendars as Calendar[]) ?? []);
  }

  async function mint() {
    const res = await call("2", "mint", { productID: s.productID, email: s.email });
    if (!res.ok) return;
    const cert = (rr(res).certificate ?? {}) as Json;
    setS((p) => ({ ...p, certificateCode: String(cert.certificate ?? ""), certificateId: String(cert.id ?? "") }));
  }

  const balance = (step: string) => call(step, "balance", { email: s.email, certificate: s.certificateCode });

  async function book(step: string, hour: number) {
    const res = await call(step, "book", {
      appointmentTypeID: s.appointmentTypeID, calendarID: s.calendarID, email: s.email,
      firstName: s.firstName, lastName: s.lastName, certificate: s.certificateCode, hourLondon: hour,
    });
    if (!res.ok) return;
    const appt = (rr(res).appointment ?? {}) as Json;
    if (typeof appt.id === "number") setS((p) => ({ ...p, appointmentIds: [...p.appointmentIds, appt.id as number] }));
  }

  async function cancelFirst(step: string) {
    const id = s.appointmentIds[0];
    if (!id) return;
    const res = await call(step, "cancel", { id });
    if (res.ok) setS((p) => ({ ...p, appointmentIds: p.appointmentIds.slice(1) }));
  }

  async function cleanup() {
    for (const id of s.appointmentIds) await call("cleanup-cancel-" + id, "cancel", { id });
    setS((p) => ({ ...p, appointmentIds: [] }));
    await call("cleanup-appointments", "appointments", { email: s.email });
    if (s.certificateId) {
      const res = await call("cleanup-cert", "deleteCertificate", { id: s.certificateId });
      if (res.ok) setS((p) => ({ ...p, certificateCode: "", certificateId: "" }));
    }
  }

  const ready = Boolean(s.secret && s.email);
  const chosen = Boolean(s.productID && s.appointmentTypeID && s.calendarID);

  const report = JSON.stringify(
    { state: { ...s, secret: "(hidden)" }, log },
    null, 2
  );

  return (
    <main>
      <h1>Gate 0 — do API-minted certificates behave like purchased packages?</h1>
      <p>Runs the test against the Acuity account whose keys are set in Vercel. Nothing here emails anyone (<code>noEmail=true</code>). Work top to bottom; the yellow boxes are the checks you do in Acuity&rsquo;s trainer view.</p>

      <div className="setup">
        <label>Shared secret (GATE0_SECRET)<input type="password" value={s.secret} onChange={set("secret")} autoComplete="off" /></label>
        <label>Test client email (yours)<input type="email" value={s.email} onChange={set("email")} /></label>
        <label>First name<input value={s.firstName} onChange={set("firstName")} /></label>
        <label>Last name<input value={s.lastName} onChange={set("lastName")} /></label>
      </div>

      {/* 1 */}
      <section className="step">
        <div className="n">1</div>
        <div>
          <h2>Connect and choose what to test with</h2>
          <p>Confirms the keys work, then lists packages, session types and calendars. Pick the cheapest package and a short session type. Booking uses admin mode, so the calendar only needs to be one the session type is allowed on.</p>
          <div className="row"><button disabled={!ready || busy !== null} onClick={discover}>Connect &amp; list</button></div>
          {products.length > 0 && (
            <div className="setup" style={{ margin: "8px 0" }}>
              <label>Package (product)
                <select value={s.productID} onChange={set("productID")}>
                  <option value="">— choose —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.type ?? ""} · £{p.price ?? "?"} (#{p.id})</option>)}
                </select>
              </label>
              <label>Session type
                <select value={s.appointmentTypeID} onChange={set("appointmentTypeID")}>
                  <option value="">— choose —</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.duration ?? "?"} min (#{t.id})</option>)}
                </select>
              </label>
              <label>Calendar (trainer)
                <select value={s.calendarID} onChange={set("calendarID")}>
                  <option value="">— choose —</option>
                  {calendars.map((c) => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
                </select>
              </label>
            </div>
          )}
          <Out res={out["1"]} />
        </div>
      </section>

      {/* 1b */}
      <section className="step">
        <div className="n">1b</div>
        <div>
          <h2>Fetch a genuinely purchased certificate for comparison</h2>
          <p>Finds a certificate for the chosen package that has an <code>orderID</code> — i.e. one bought through Acuity&rsquo;s checkout. You&rsquo;ll compare its fields with the minted one after step 2.</p>
          <div className="row"><button disabled={!s.productID || busy !== null} onClick={() => call("1b", "reference", { productID: s.productID })}>Fetch reference</button></div>
          <Out res={out["1b"]} />
        </div>
      </section>

      {/* 2 */}
      <section className="step">
        <div className="n">2</div>
        <div>
          <h2>Mint a certificate via the API</h2>
          <p><code>POST /certificates</code> with the package&rsquo;s productID and your email. This is what the app would do after a Stripe payment.</p>
          <div className="row">
            <button disabled={!chosen || busy !== null || Boolean(s.certificateCode)} onClick={mint}>Mint certificate</button>
            {s.certificateCode && <span className="pill">code: {s.certificateCode} · id {s.certificateId}</span>}
          </div>
          <Out res={out["2"]} big="remaining" label="Sessions on the new certificate" />
        </div>
      </section>

      {/* 3 */}
      <section className="step">
        <div className="n">3</div>
        <div>
          <h2>Read the balance, then check the trainer view</h2>
          <div className="check"><strong>In Acuity:</strong> open Clients → search your test email. Does a package show with the same session count and an expiry that matches the product&rsquo;s settings? Does it look like any other package?</div>
          <div className="row"><button disabled={!s.certificateCode || busy !== null} onClick={() => balance("3")}>Read balance</button></div>
          <Out res={out["3"]} big="remaining" label="Remaining (API)" />
        </div>
      </section>

      {/* 4 */}
      <section className="step">
        <div className="n">4</div>
        <div>
          <h2>Book two sessions via the API using the code</h2>
          <p>Tomorrow at 10:00 and 11:00 London time on the chosen calendar. Admin mode skips availability rules. Expect the balance to drop by 2 and each appointment to show as paid by certificate.</p>
          <div className="row">
            <button disabled={!s.certificateCode || busy !== null} onClick={() => book("4a", 10)}>Book 10:00</button>
            <button disabled={!s.certificateCode || busy !== null} onClick={() => book("4b", 11)}>Book 11:00</button>
            <button className="secondary" disabled={!s.certificateCode || busy !== null} onClick={() => balance("4c")}>Read balance</button>
            {s.appointmentIds.length > 0 && <span className="pill">appointments: {s.appointmentIds.join(", ")}</span>}
          </div>
          <Out res={out["4a"]} /><Out res={out["4b"]} /><Out res={out["4c"]} big="remaining" label="Remaining after 2 API bookings" />
        </div>
      </section>

      {/* 5 */}
      <section className="step">
        <div className="n">5</div>
        <div>
          <h2>Trainer books one from Acuity&rsquo;s own UI</h2>
          <div className="check"><strong>In Acuity:</strong> as a trainer, add an appointment for the test client (any time, same session type) and apply the package. Does Acuity offer the minted package automatically, and does it take a session from it? Then read the balance here: expect −1 more.</div>
          <div className="row"><button disabled={!s.certificateCode || busy !== null} onClick={() => balance("5")}>Read balance</button></div>
          <Out res={out["5"]} big="remaining" label="Remaining after trainer booking" />
        </div>
      </section>

      {/* 6 */}
      <section className="step">
        <div className="n">6</div>
        <div>
          <h2>Cancel one via the API, then a manual top-up in Acuity</h2>
          <p>Cancel the 10:00 booking: expect the session to be returned (+1). Then:</p>
          <div className="check"><strong>In Acuity:</strong> open the client&rsquo;s package and manually add one session (this is how trainers will handle comps). Read the balance again: does the API see the top-up?</div>
          <div className="row">
            <button disabled={s.appointmentIds.length === 0 || busy !== null} onClick={() => cancelFirst("6a")}>Cancel first booking</button>
            <button className="secondary" disabled={!s.certificateCode || busy !== null} onClick={() => balance("6b")}>Read balance after cancel</button>
            <button className="secondary" disabled={!s.certificateCode || busy !== null} onClick={() => balance("6c")}>Read balance after manual top-up</button>
          </div>
          <Out res={out["6a"]} /><Out res={out["6b"]} big="remaining" label="After cancel" /><Out res={out["6c"]} big="remaining" label="After manual top-up" />
        </div>
      </section>

      {/* 7 */}
      <section className="step">
        <div className="n">7</div>
        <div>
          <h2>Clean up</h2>
          <p>Cancels any remaining API bookings, lists what&rsquo;s left on the test email (cancel the trainer-made one in Acuity yourself), and deletes the minted certificate.</p>
          <div className="row"><button className="secondary" disabled={busy !== null || (!s.certificateId && s.appointmentIds.length === 0)} onClick={cleanup}>Clean up</button></div>
          {Object.entries(out).filter(([k]) => k.startsWith("cleanup")).map(([k, v]) => <Out key={k} res={v} />)}
        </div>
      </section>

      {/* Report */}
      <section className="step">
        <div className="n">→</div>
        <div>
          <h2>Report</h2>
          <p>Everything the page did, with raw Acuity responses. Copy and paste this back into the chat. The secret is not included.</p>
          <textarea readOnly value={report} onFocus={(e) => e.currentTarget.select()} />
          <div className="row">
            <button className="secondary" onClick={() => { setLog([]); setOut({}); }}>Clear log</button>
            <button className="secondary" onClick={() => { setS({ ...EMPTY, secret: s.secret, email: s.email }); setLog([]); setOut({}); }}>Reset run</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Out({ res, big, label }: { res?: Result; big?: string; label?: string }) {
  if (!res) return null;
  const r = (res.result ?? {}) as Json;
  const bigVal = big ? r[big] : undefined;
  return (
    <div className={`out ${res.ok ? "ok" : "bad"}`}>
      <div className="head"><span>{res.ok ? "OK" : "FAILED"} · {res.action}</span><span>{res.startedAt}</span></div>
      {res.ok && big && <div className="big">{bigVal === null || bigVal === undefined ? "—" : String(bigVal)} <small style={{ fontSize: 13, fontWeight: 400 }}>{label}</small></div>}
      {!res.ok && <div><strong>{res.error}</strong></div>}
      <pre>{JSON.stringify(res.ok ? res.result : (res.acuity ?? res), null, 2)}</pre>
    </div>
  );
}
