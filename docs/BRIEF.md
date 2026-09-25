# Equals Results — Brief

Owner: Eazy · Lead session repo: `eazybailey/acuity` · Started: 2026-09

## Outcome
A super-fast client app (PWA first, then wrapped for the Apple and Android stores) for the Equals Results group — 9 personal-training studios, ~2,500 active clients — built on the Acuity Scheduling API. Clients book, buy and use minutes-based packages from their phone; trainers keep using the Acuity dashboard unchanged.

## Milestones
1. Gate 0 (done): API-minted package certificates behave like purchased ones on the Muswell Hill Road account.
2. Backend on Vercel (the `acuity` repo) exposing bookings, packages, purchases per studio.
3. PWA: login → my studio → book → my minutes → buy package. Speed is the headline.
4. Multi-studio: 9 Acuity accounts, 9 Stripe accounts, one app.
5. Store wrappers (Apple, Android).

## Constraints
- Money: each studio is its own legal entity with its own Stripe and Acuity account; payments go through Acuity + that studio's Stripe. Never take payment any other way.
- Existing Acuity subscriptions / recurring packages are policy — keep them working.
- Packages are minutes-based (e.g. "5 × 30-min" = 150 minutes), not session counts.
- Trainers must keep getting everything they need from the Acuity dashboard.
- Test only on the Muswell Hill Road account unless Eazy says otherwise. Production data on the other 8 studios: read-only until a decision.
- Reporting reference: a competitor's Power BI model exists over all 9 accounts (studio codes AP, CH, HB, HGS, LL, MH, PR, SG, WMH); read-only for us.
- Tech: Next.js, Vercel, Supabase (Pro), Acuity keys in Vercel env vars.

## Definition of done (milestone 3)
A client on a phone can log in, see their minutes, and book in under 3 taps; deployed to a Vercel preview; Eazy has used it.

## Known unknowns
- Client identity across 9 Acuity accounts (same person, several studios?)
- Acuity rate limits at 2,500 clients
- Store wrapper choice (Capacitor vs PWABuilder)

## IC roster
backend-engineer (Acuity/Stripe API), frontend-engineer (PWA, performance), reviewer, qa (end-to-end on MH account), researcher (Acuity API edge cases)
