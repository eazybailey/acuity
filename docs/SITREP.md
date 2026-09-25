updated: 2026-09-25T11:50Z
checked: 2026-09-25T11:50Z
state: waiting-on-eazy
next: QA the skeleton on a Muswell Hill Road preview once preview env vars are set; meanwhile scaffold magic-link login.

## Big picture
Equals Results: Browne Bailey's 9-studio North London PT group. Product: fast PWA on the Acuity API, dashboard from the API, WhatsApp agent concept. Growth: Mark Warner model for partners, Riviera first (deck held). PWA is an internal target, not a client deadline.

## Build
- Branch `claude/wizardly-volta-03o5or`, open as PR #2 (not merged); Vercel preview deployed (Vercel-login protected).
- Skeleton in code: login → my studio → my minutes → book → buy. Per-studio keys; writes only on MH and only `POST /appointments`, enforced before any request; buying links to Acuity checkout; login is a preview-only access-code stand-in. Gate 0 page at `/gate0`.
- 34 tests, typecheck, build pass. Never run against Acuity: no keys here.
- Not built: real auth, service worker, icons, dashboard, design.

## Done since last sitrep
- Roster, sitrep skill, CLAUDE.md, BRIEF in repo. Skeleton built, reviewed, two findings fixed. Relay applied.

## In flight
- None; PR #2 green.

## Needs Eazy
- Set `SESSION_SECRET`, `SKELETON_ACCESS_CODE` on Vercel Preview; confirm `ACUITY_USER_ID/API_KEY` are MH's. Recommend yes. Default: untested.
- Real login: recommend Supabase magic link. Default: build next.
- Other 8 studios' keys (read-only): default not connected.

## Risks
- Checkout URL format unconfirmed; MH-key ownership unchecked in code; Gate 0 API can delete certificates (leave `GATE0_SECRET` unset on previews).
- Minutes show 0 if certificates lack email; verify on MH.
- 9-account fan-out, rate limits, cross-studio identity unproven.

## Decisions
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
