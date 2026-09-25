# Skeleton (unbranded PWA)

Flow: `/login` → `/studio` (my studio) → `/` (my minutes) → `/book` → `/buy`. Plain HTML, no design, server components and server actions; the only client JS refreshes minutes when the app regains focus.

- **Studios** (`lib/studios.ts`): AP, CH, HB, HGS, LL, MH, PR, SG, WMH, each with its own Acuity keys. Only MH (Muswell Hill Road) can be written to: `studioClient(code).write()` throws before any request for any other studio, and even on MH it only allows `POST /appointments`. Certificates and subscriptions are never changed.
- **My studio**: read-only `GET /clients?search=` on every connected studio, exact email match. One match skips straight through.
- **My minutes**: sum of `remainingMinutes` on unexpired certificates, upcoming appointments, and the next three free times for the client's usual session (one tap to confirm).
- **Book**: types the client's certificates cover → day → time → confirm → `POST /appointments` with the certificate, not admin mode, `noEmail=true` while the studio's `notify` is false. Disabled on read-only studios.
- **Buy**: `GET /products`, each linking to Acuity's hosted checkout (the studio's own Stripe). The link format in `checkoutUrl()` (`lib/packages.ts`) is **unverified**; check it against a "Direct link" from the MH admin.
- **Login** (`lib/session.ts`): either way the result is our own HMAC-signed httpOnly `sess` cookie holding the email, 7-day expiry. `authMode()` picks the mode; both refuse to run when `VERCEL_ENV=production` until Eazy decides otherwise.
  - **Magic link** (used when `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `APP_URL` are set): `/login` asks only for the email, Supabase Auth emails a link to `<APP_URL>/auth/confirm?token_hash=…&type=email`. That page only shows a "Sign in" button; pressing it POSTs the token, which is verified (`verifyOtp`) and mints the cookie with the verified email (`lib/magiclink.ts`). Nothing is spent on GET, so mail scanners that open links first cannot use up the one-time link. No Supabase session is kept; anon key only. The page always says "Check your email", so it never reveals who has an account. The `?code=` (PKCE) flow is not supported: it needs a verifier stored at send time.
  - **Access code** (preview-only stand-in, used otherwise): email + shared `SKELETON_ACCESS_CODE`. Anyone with the code can sign in as any email.

Env vars: see `.env.example` (`SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL`, `SKELETON_ACCESS_CODE`, `ACUITY_USER_ID_<CODE>` / `ACUITY_API_KEY_<CODE>`; MH falls back to `ACUITY_USER_ID` / `ACUITY_API_KEY`).

Scripts: `npm test` (vitest, pure logic with fetch stubbed), `npm run typecheck`, `npm run build`.

## Supabase setup (for Eazy)

In the Supabase dashboard, for the project whose URL and anon key go in Vercel:

1. **Authentication > URL Configuration**: set Site URL to the app's origin (`APP_URL`), and add `<APP_URL>/auth/confirm` to Redirect URLs (one entry per preview/local origin you use).
2. **Authentication > Email Templates > Magic Link** and **Confirm signup** (a first sign-in by a new email uses Confirm signup): change the link in both to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   (or `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` to follow whichever allow-listed `APP_URL` sent it). The default templates' links will not sign anyone in here.
   First sign-in creates a Supabase Auth user for that email (`shouldCreateUser: true` in `lib/magiclink.ts`); whether to keep that is a decision in the sitrep.
3. **Email sending**: the built-in SMTP is for testing only: a very low hourly rate limit and, on current plans, delivery only to the project team's own addresses (others see "could not send"). Set up custom SMTP (Authentication > Emails > SMTP settings) before any real client uses it; that may cost money, so it is a decision.

Not built yet: production sign-in (both modes refuse on production), cancelling or moving bookings, service worker / offline, icons and branding, multi-studio switching beyond the studio picker, rate-limit handling, confirmation emails (`notify`).

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
