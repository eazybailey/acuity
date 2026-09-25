updated: 2026-09-25T16:25Z
checked: 2026-09-25T16:25Z
state: waiting-on-eazy
next: QA login → book on a Muswell Hill Road preview once Supabase and preview env vars are set.

## Big picture
Equals Results: Browne Bailey's 9-studio PT group. Fast PWA on the Acuity API, dashboard, WhatsApp concept; Riviera partner pitch held. PWA is an internal target.

## Build
- Main: skeleton (PR #2 merged) — login → studio → minutes → book → buy; writes MH-only, bookings only; buy links to Acuity checkout.
- Branch `claude/modest-thompson-3m80cm`: Supabase magic-link login (link opens a Sign-in button; mints our own session). Access code stays as fallback; production refused. 46 tests, build pass. Never run against Acuity or Supabase: no keys here.

## Done since last sitrep
- PR #2 merged; magic-link login built and reviewed; relay applied.

## In flight
- Magic-link PR, for Eazy to merge.

## Needs Eazy
- Supabase for preview (README "Supabase setup"): Vercel Preview env vars, redirect URL, two email templates. Recommend yes. Default: access-code login.
- Custom SMTP (may cost): recommend before real clients. Default: built-in, team only.
- Confirm preview Acuity keys are MH's. Default: untested.

## Risks
- Sandbox Supabase env vars of unknown project, deliberately unused.
- Checkout URL format, certificate email, rate limits, cross-studio identity unproven.

## Decisions
- 2026-09-25 · Trade mark proposal emailed to Browne; filing follows reply · Eazy (relay).
- 2026-09-25 · Login = Supabase magic link, Sign-in button page · scanner-safe.
- 2026-09-25 · Production sign-in refused until Eazy decides · lead default.
- 2026-09-25 · Buy = link to Acuity checkout; app takes no payment · BRIEF.
- 2026-09-25 · Writes only on MH, bookings only, enforced in code · BRIEF.
- 2026-09-25 · Preview-only access-code login until real auth · no auth decision yet.
- 2026-09-25 · Dashboard from API; Riviera deck held for Browne; deck language = design system; 20,000+ sessions, MW story as deck, keep "MD" · CoS defaults.
- 2026-09-23 · PWA internal target; functionality first, design later · Eazy.
- 2026-09-23 · Trade mark: series of three, class 41 (+9, 16); Browne confirms class and applicant · Eazy.
- 2026-09-23 · Cash rule: money lives in EBA sitrep only · org rule.
- 2026-09-23 · Four-line sitrep header · /sitrep v3.
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
