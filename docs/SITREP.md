updated: 2026-09-25T10:10Z
checked: 2026-09-25T10:10Z
state: waiting-on-eazy
next: QA the skeleton end-to-end on a Muswell Hill Road preview once the two preview env vars are set; meanwhile scaffold magic-link login.

## Big picture
Equals Results (=Results) is Browne Bailey's North London PT group: 9 studios, 35 trainers, 30-minute pre-planned sessions. EBA runs two workstreams. Product: a fast PWA on the Acuity API (later store-wrapped), a dashboard built from the Acuity API, and a WhatsApp agent concept. Growth: the Mark Warner model taken to partners, Riviera Travel first; deck held until Browne confirms whether it went. The PWA is an internal target the client does not need to see yet, not a month-end deadline. The trade mark is Eazy's (EBA files once Browne confirms class and applicant).

## Build
- Next.js 15.5.9 on Vercel. Branch `claude/wizardly-volta-03o5or`, not merged to main. Deploy/preview state can't be checked from the repo.
- **Skeleton, now in code**: login → my studio → my minutes (home) → book → buy. Per-studio Acuity keys (`ACUITY_*_<CODE>`); only MH may be written to, and only `POST /appointments`, enforced before any request. Buying is a link out to Acuity's hosted checkout. Login is a signed-cookie stand-in with an access code, refused on production.
- Gate 0 page moved to `/gate0`; its API is unchanged.
- 34 unit tests, typecheck and build pass. Never run against real Acuity: there are no keys in this environment.
- Not built: real auth, service worker, icons, dashboard, WhatsApp agent, design.

## Done since last sitrep
- 25 Sept: agent roster, sitrep skill, CLAUDE.md, BRIEF copied into the repo; .gitignore added.
- 25 Sept: skeleton built and reviewed (approved); two findings fixed (certificates must match the client's email exactly; production check fails closed).
- HQ relay applied (see Decisions).

## In flight
- Nothing running. Next: QA on an MH preview, then real login.

## Needs Eazy
- **Preview env vars.** Recommend setting `SESSION_SECRET` and `SKELETON_ACCESS_CODE` on Vercel *Preview* only, and confirming `ACUITY_USER_ID`/`ACUITY_API_KEY` are Muswell Hill Road's (writes go wherever those keys point). Default: skeleton stays untested against Acuity.
- **Real login.** Recommend Supabase Auth email magic link (Supabase Pro already in the BRIEF), with the email matched to Acuity clients. Default: build that next, on previews.
- **Other 8 studios.** Recommend adding their keys only when you decide read access is fine; the app is read-only for them anyway. Default: not connected.

## Risks
- Checkout link format (`catalog.php?action=addCart…`) not confirmed; check it against the MH admin's "Direct link".
- Nothing in code checks that MH keys belong to MH; the Gate 0 API can still cancel bookings and delete certificates on that account. Recommend leaving `GATE0_SECRET` unset on app previews.
- If Acuity's purchased certificates carry no email, minutes will show 0. Verify on MH.
- Access-code login lets anyone with the code act as any email. Previews only.
- 9-account fan-out, Acuity rate limits and cross-studio identity unproven.
- Trade mark filed without clearance; "Equals Results" isn't a Companies House name.

## Decisions
- 2026-09-25 · Buying links out to Acuity's hosted checkout; the app never takes payment · BRIEF money rule.
- 2026-09-25 · Writes allowed only on MH, only to create bookings, enforced in code · BRIEF test rule.
- 2026-09-25 · Signed-cookie login with an access code on previews only, until real auth · no email/auth decision yet.
- 2026-09-25 · Dashboard from Acuity API; Riviera deck held until Browne confirms; deck language becomes the design system; deck facts 20,000+ sessions/yr, MW origin as in deck, keep "MD" · CoS defaults after 48h.
- 2026-09-23 · PWA is an internal target, all functionality bare-bones first, design later · Eazy.
- 2026-09-23 · Trade mark: EBA files a series of three (Equals Results / =Results / = Results), class 41 + 9, 16 recommended; Browne confirms class and applicant Ltd · Eazy.
- 2026-09-23 · Cash rule: receivables live in the EBA sitrep only; money figures removed from this doc · org rule.
- 2026-09-23 · Sitrep header is four lines (updated/checked/state/next) · /sitrep v3.
- 2026-09-21 · EBA files the trade mark itself · cheap, urgent, gates pitches.
- 2026-09-21 · Create a =Results design system · before branded screens.
- 2026-09-21 · Next PWA step: unbranded skeleton, problem-solving only · flows before design.
- 2026-09-18 · Expand beyond cruise to any organisation with a gym; 3–5 partners in 24 months · Browne's brief.
- 2026-09-18 · Certify-first, place selectively; three plays · ≈75% vs ≈33% contribution.
- 2026-09-17 · PWA incl. dashboard; WhatsApp agent a deliverable · agenda.
- 2026-09-16 · ER is EBA's "Wellness" case study · portfolio framing.
- 2026-09-14 · Deck: 8-slide appetite-whetter; ask is one 30-minute call · listening exercise.
- 2026-09-14 · Deck: since 2007, 9 studios, 35 trainers, 20,000+ sessions/yr · needs confirmation.
- 2026-09-14 · Doodle language, lime ~#7DF94B, rounded sans · matches existing decks.
- 2026-09-14 · PWA "fully loaded with dashboard mirror" · agenda.
- 2026-09-11 · PWA at app.equalsresults.co.uk; dashboard mirrors Power BI; WhatsApp a concept · agenda.
- 2026-09-11 · Riviera first target, via Browne's 10-year client · warm route.
- 2026-09-11 · Pilot: one Radiance-class ship, 2027, one trainer; Route A · lowest friction.
- 2026-09 · PWA first on Acuity API, then wrap · Eazy's plan.
- 2026-09 · Gate 0 passed; minted certificates are the design; this repo is the backend.
- 2026-09 · Keep existing Acuity subscriptions · studios want them.
- 2026-09-04 · Review existing app; research Acuity API · workstream start.
- 2026-08-23 · Licence, don't franchise; file UK marks first; IP holding company.
- 2026-08-13 · Pilot residency then format licence; OneSpaWorld as channel.
