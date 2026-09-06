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
