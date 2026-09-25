# Skeleton (unbranded PWA)

Flow: `/login` → `/studio` (my studio) → `/` (my minutes) → `/book` → `/buy`. Plain HTML, no design, server components and server actions; the only client JS refreshes minutes when the app regains focus.

- **Studios** (`lib/studios.ts`): AP, CH, HB, HGS, LL, MH, PR, SG, WMH, each with its own Acuity keys. Only MH (Muswell Hill Road) can be written to: `studioClient(code).write()` throws before any request for any other studio, and even on MH it only allows `POST /appointments`. Certificates and subscriptions are never changed.
- **My studio**: read-only `GET /clients?search=` on every connected studio, exact email match. One match skips straight through.
- **My minutes**: sum of `remainingMinutes` on unexpired certificates, upcoming appointments, and the next three free times for the client's usual session (one tap to confirm).
- **Book**: types the client's certificates cover → day → time → confirm → `POST /appointments` with the certificate, not admin mode, `noEmail=true` while the studio's `notify` is false. Disabled on read-only studios.
- **Buy**: `GET /products`, each linking to Acuity's hosted checkout (the studio's own Stripe). The link format in `checkoutUrl()` (`lib/packages.ts`) is **unverified**; check it against a "Direct link" from the MH admin.
- **Login is a preview-only stand-in** (`lib/session.ts`): email + shared access code, HMAC-signed httpOnly cookie, 7-day expiry. Anyone with the code can sign in as any email, so it refuses to run when `VERCEL_ENV=production`.

Env vars: see `.env.example` (`SESSION_SECRET`, `SKELETON_ACCESS_CODE`, `ACUITY_USER_ID_<CODE>` / `ACUITY_API_KEY_<CODE>`; MH falls back to `ACUITY_USER_ID` / `ACUITY_API_KEY`).

Scripts: `npm test` (vitest, pure logic with fetch stubbed), `npm run typecheck`, `npm run build`.

Not built yet: real identity verification (magic link / Supabase Auth), cancelling or moving bookings, service worker / offline, icons and branding, multi-studio switching beyond the studio picker, rate-limit handling, confirmation emails (`notify`).

The Gate 0 page now lives at `/gate0`.

# Gate 0 — Acuity certificate test

A one-page tool that answers: **do package certificates minted via the Acuity API behave exactly like packages bought through Acuity's own checkout?**

Your Acuity keys live only in Vercel's environment variables. They never touch this repo, the browser, or any chat.

## Deploy (browser only, ~10 minutes)

1. **GitHub** → New repository → *uploading an existing file* → drag every file from this folder in (keep the folder structure) → Commit.
2. **Vercel** → Add New → Project → Import that repo. Before clicking Deploy, open *Environment Variables* and add:
   - `ACUITY_USER_ID` — Acuity → Settings → Integrations → API → User ID
   - `ACUITY_API_KEY` — same page → API Key
   - `GATE0_SECRET` — any long random string you invent (this is the page's password)
3. Deploy. Open the URL Vercel gives you.

## Run the test

Open the page, enter the shared secret and your own email as the test client, then work through steps 1–7. Yellow boxes are checks you do inside Acuity's trainer view between steps. At the end, copy the Report box and paste it into the chat.

The page books with `admin=true&noEmail=true`, so no confirmations or reminders go to anyone. Step 7 cancels the API bookings and deletes the minted certificate; the booking a trainer made in step 5 must be cancelled in Acuity by hand.

## What passes

- Step 3: the minted package appears on the client's record with the right session count and expiry.
- Step 4: two API bookings reduce the balance by 2.
- Step 5: a trainer booking from Acuity's UI reduces it by 1 more — Acuity treats the code as a normal package.
- Step 6: cancelling restores a session; a manual top-up in Acuity is visible through the API.
- Step 1b vs 2: the only field the purchased certificate has that the minted one lacks is `orderID`.

## Afterwards

Keep the Vercel project — with the keys already in place it becomes the backend for the real app. Delete the `app/` page when that work starts; keep `lib/acuity.ts`.
