# Lumora features

What Lumora does, how each feature really works, and what is still wanted. Verified against the code on **2026-11-04**; where this file and another doc disagree, the code wins (and the other doc should be fixed).

**Legend:** ✅ Live · 🟡 Partial · 🔲 Planned

Paths: screens are `apps/mobile/app/...`, routes are `apps/api/src/routes/...`, logic is `apps/api/src/lib/...`.

## The idea in one page

Lumora is a skincare companion for people who are tired of generic advice. It learns your skin, then explains every recommendation with the data behind it. Three principles run through every feature:

1. **Rules first, AI second.** The daily brief, product verdict, match %, ingredient checks and scan suggestions are plain, tested functions that cite their inputs. Gemini is used in exactly three places (face scan, "from the web" suggestions, finding a product that isn't in any database), and each one has a non-AI fallback or is hidden when `GEMINI_API_KEY` is missing.
2. **AI supplies data, rules decide.** When Gemini identifies a product it only returns the name and ingredient list; the verdict and match % are still computed by rules. All AI output is validated and clamped before it is used.
3. **No AI keys in the app.** Every AI call happens on the API.

**Stack:** Expo SDK 54 / React Native 0.81 / expo-router 6 / NativeWind / zustand (app) · Express 5 / Prisma 6 / Neon Postgres (API) · Supabase Storage (images) · Resend (email) · Open-Meteo and Open Beauty Facts (free data) · Render (API hosting) · EAS (builds, OTA updates) · static HTML site on Netlify.

---

## 1. Accounts

### Sign-up, email verification, login ✅
- **User value:** a safe account that only the real email owner can create.
- **Screens:** `(auth)/signup`, `(auth)/verify-email`, `(auth)/login`.
- **Endpoints:** `POST /auth/signup`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/login` · logic: `routes/auth.ts`, `lib/password.ts`, `lib/emailVerification.ts`, `lib/mailer.ts`.
- **How it works:**
  - Sign-up validates the password on the server (8+ characters, a letter and a number, at most 72 bytes, not a common password, not containing your email name or display name), stores a bcrypt (cost 12) hash, and emails a 6-digit code. It returns **no tokens** until the code is confirmed.
  - The code is stored hashed, expires after 15 minutes, locks after 5 wrong tries, and can be re-sent once a minute (the app shows a countdown).
  - Login refuses unverified accounts (HTTP 403 with `needsVerification`) and sends a fresh code. Emails are trimmed and lowercased; lookups ignore case, and a login for an unknown email takes as long as a real one.
  - An unverified sign-up can be taken over by a new sign-up for the same address, so nobody can squat on someone else's email.
- **Fallbacks and limits:** without `RESEND_API_KEY` the code is printed in the API console. Without `EMAIL_FROM`, mail is sent from `onboarding@resend.dev`, which only delivers to the Resend account owner. No rate limiting on login yet (verification codes do have an attempt limit).
- **Tests:** `test/password.test.ts`, `test/emailVerification.test.ts` (rules only; the routes have no automated tests).

### Google sign-in ✅
- **Screens:** the "Continue with Google" button on login and sign-up. **Endpoint:** `POST /auth/google`.
- **How it works:** the app gets a Google ID token for the web client ID; the API verifies its audience, refuses unverified Google emails, then logs in, links the Google identity to an existing account with the same email, or creates a new account. Google accounts count as email-verified.
- **Limits:** needs the Google Cloud web client and an Android client per signing key; see [apps/mobile/docs/GOOGLE_SIGN_IN.md](../apps/mobile/docs/GOOGLE_SIGN_IN.md).

### Password reset ✅
- **Screens:** `(auth)/forgot-password`, `(auth)/reset-password`. **Endpoints:** `POST /auth/forgot-password`, `/auth/reset-password`.
- **How it works:** a hashed 6-digit code (15 minutes) is emailed; the reply is identical whether or not the account exists. A successful reset applies the same password rules, logs you in and marks the email verified.
- **Limits:** no attempt limit or rate limit on reset codes yet.

### Sessions ✅
- 15-minute access token and 30-day refresh token. `apiFetch` refreshes on a 401 and retries once (one shared refresh at a time); the user is logged out only when the refresh token is invalid. Refresh tokens are stateless, so logout cannot revoke one server-side.

---

## 2. Onboarding and skin profile

### Onboarding questions ✅ (deeper version, 2026-11-05)
- **Screens:** one screen, `(onboarding)/skin-type`, runs the whole flow (one question per screen, animated progress, haptics). `?section=skin|safety|you` edits just that part of an existing profile. **Endpoints:** `POST /skin-profile`, `PATCH /skin-profile`, `GET /skin-profile/me`, `PATCH /skin-profile/budget`. **Logic:** `apps/mobile/src/lib/onboardingSteps.ts` (questions, step plan, quiz), `apps/api/src/lib/skinProfile.ts` (validation, restrictions, completeness).
- **How it works:**
  - **Questions:** skin type (or a 4-question quiz if you're not sure), how easily your skin reacts, up to 3 concerns in priority order, an acne follow-up only if you chose acne, sensitivities plus ingredients you type in, optional safety answers (pregnancy, breastfeeding, isotretinoin, prescription retinoid), skin tone, age range, ranked goals and a monthly budget. Each question has a "why we ask" line, and everything except skin type and concerns can be skipped.
  - **Saving:** the API validates every answer against allowlists (unknown answers are dropped, typed ingredients are cleaned and capped at 10) and records which sections are done. The first assessment awards the bounty; retakes don't. Older app builds that send only the four original fields still work.
  - **Resume:** answers are kept as a draft on the device so closing the app doesn't lose them. The private safety answers are never written to the device, so someone resuming past that question is asked it again.
  - **Editing:** the Profile tab shows "Profile N% complete" with Edit/Add per section; each opens just that section, pre-filled. Existing users keep working with the old four answers; missing answers count as "unknown" and change nothing.
- **Limits:** skin tone and age can be changed but not cleared. `climateZone` is still stored but unused. The Home screen has no "complete your profile" nudge yet.
- **Tests:** `test/skinProfile.test.ts` and the profile cases in the verdict, brief, suggestions and web-prompt tests. The app has no test runner; the step logic was checked with a script.

### Skin profile and budget ✅
- `SkinProfile` holds skin type, sensitivity level, concerns, acne type, sensitivities, typed avoid-list, special situations, skin tone, age range, goals and an optional monthly budget (set in onboarding or from the face-scan results screen). The Profile tab shows the answers, the avoid-list and the completeness.
- **Who reads it:** product verdict, daily brief, scan suggestions and the web-suggestions prompt (details under each feature). **The face-scan analysis itself still receives no profile**, on purpose.
- **Safety rule:** pregnancy, breastfeeding, trying to conceive, isotretinoin and a prescription retinoid all mean "steer away from retinoids". That one derived restriction is the only part ever sent to Gemini, never the answer behind it.

### Edit profile and public profile ✅
- `(main)/edit-profile`, `(main)/user/[id]`; `/users/me`, `/users/:id/public`. Other users only ever see an id and a name.

---

## 3. Face scan

### AI face scan ✅
- **User value:** scores for dark circles, dark spots, acne, dryness, oiliness and dullness, with markers on the photo.
- **Screens:** `(main)/face-scan`, `(main)/face-scan-results`. **Endpoints:** `POST /face-scan/analyze`, `GET /face-scan/latest`. **Logic:** `lib/geminiVision.ts`, `lib/faceAnalysis.ts`, `lib/skinConcerns.ts`.
- **How it works:** the selfie is taken against an oval guide. The server crops the photo to what the oval showed (using the phone's preview aspect), tries Gemini (primary model, then an optional fallback model, with retries and early stop on daily quota), and clamps and validates everything it returns: scores 0–100, boxes 0–1000, capped text. A score of 40+ counts as "detected". The crop is stored in Supabase Storage.
- **Fallback:** without a key or quota, an offline pixel-heuristic analysis runs instead; each scan is tagged `ai` or `heuristic`.
- **Deliberate limit:** the Gemini prompt receives **no profile** and is told never to guess age, habits or lifestyle.
- **Tests:** `test/geminiVision.test.ts`, `test/faceAnalysis.test.ts`.

### Product suggestions from a scan ✅
- **Endpoint:** `GET /recommendations/from-scan?source=owned|promoted|web`. **Logic:** `lib/scanSuggestions.ts`, `lib/webProductSearch.ts`.
- **How it works:** three sources for your detected concerns: **your shelf** (free, keyword match on products you own), **catalog** (products flagged as promoted rank first as "Featured"; owned ones and ones conflicting with your sensitivities are dropped), and **the web** (Gemini with Google Search grounding; the only call that gets your profile: concerns, skin type, sensitivities, budget, owned products). The monthly budget is treated as a total across all suggestions. Web results are cached on the scan.
- **Limits:** the cache is refreshed whenever the profile changes (skin type, concerns, sensitivities, avoid-list, restrictions, tone, age or budget). The catalog and owned sources skip retinoids for people who should avoid them. The catalog source otherwise ignores skin type. The web source is hidden/503 without a key or if search fails.
- **Tests:** `test/scanSuggestions.test.ts`.

---

## 4. Products

### Product verdict and match % ✅
- **User value:** "78% match for you", with the reasons.
- **Screens:** `(main)/product-check`, `(main)/product/[id]` (same `components/ProductVerdict.tsx`). **Endpoints:** `GET /products/:id/verdict`, `GET /products/barcode/:code/check`. **Logic:** `lib/productVerdict.ts`, `lib/ingredientRules.ts`.
- **How it works:** a list of explainable checks, each "good", "caution" or "bad": your **sensitivities** and any ingredient you typed in (any hit caps the match at 15%), a **safety warning** for retinoids when your situation says to avoid them (caps the match at 5% and uses cautious, non-medical wording; bakuchiol isn't treated as a retinoid), **skin type** (oily/combination avoid pore-cloggers; dry avoid denatured alcohol and sulfates), the same irritant check for anyone whose skin reacts easily (so oily + sensitive works), **concerns** (keyword fit), **products you already own** (duplicates, active clashes), **budget**, and **reviews** from people with your skin type. The match % starts at 40 plus half the average concern fit (70 with no concerns), then adjusts for skin type, clashes and community reviews. It is rule-based end to end and `null` without a profile or an ingredient list.
- **Tests:** `test/productVerdict.test.ts`, `test/ingredientRules.test.ts`.

### Barcode check ✅
- **Screen:** `(main)/scan-product` (opened from the "+" menu). **Logic:** catalog first, then Open Beauty Facts (`lib/openBeautyFacts.ts`), then Gemini (`lib/aiProductLookup.ts`) only for what's still missing (the product name and ingredients, never the verdict).
- **Limits:** if Open Beauty Facts knows the name but lists fewer than 3 ingredients, Gemini fills the list. Without a Gemini key, unknown products return 404.

### Photo scanner ✅
- **Screen:** `(main)/product-scanner` (Explore → "Scan a product"). **Endpoints:** `POST /products/match`, `POST /products/identify`.
- **How it works:** ML Kit reads the pack text **on the phone** (the photo never leaves the device); only the words are sent. The API matches them against the catalog and Open Beauty Facts (word overlap + edit distance, size-weighted). If nothing matches, Gemini can identify the product; the result is labelled "AI-found". **Tests:** `test/productMatch.test.ts`, `test/aiProductLookup.test.ts`.

### Catalog, search, popular, details ✅
- Explore tab and `(main)/product/[id]`; `GET /products?category&query` (name contains-match), `GET /products/popular` (most reviewed; feeds Explore's "Popular in the community" row). Catalog data is seeded; admins can edit it.

### My Products ✅
- `(main)/my-products`, `(main)/add-my-product`; `/user-products`. Catalog or custom products with opened and expiry dates and a "finished" flag; the brief and suggestions use what you own.

### Reviews ✅
- `(main)/share-review`; `/reviews`. Rating, comment, your skin type and concerns, optional anonymity; can create a catalog product inline. Awards a bounty on the first review.

### Ingredient glossary ✅
- `(main)/glossary`; `/ingredients`. A seeded table with search. No AI.

---

## 5. Daily use

### Daily brief ✅
- **Screen:** the Home tab (`components/DailyBrief.tsx`). **Endpoints:** `POST /recommendations/generate`, `GET /latest`, `POST /:id/feedback`. **Logic:** `lib/dailyBrief.ts`, `lib/environment.ts` (live Open-Meteo data, no key).
- **How it works:** combines UV, air quality, humidity and temperature at your location with your skin type, concerns, latest scan (if under 45 days old), the last week of moods, your morning routine, and the expiry dates of your products. Signals compete by priority (for example UV 8+ scores 90) and produce one headline, up to four tips that each cite a number, and one product pick that prefers products you own and skips over-budget items, sensitivity conflicts and anything you marked "Not for me" in the last 60 days. Saved as a snapshot; you can mark it helpful or not.
- **Limits:** needs a skin profile and a location; returns nothing without network or location. Your ranked concerns decide the pick first, then your goals (hydration, even tone, clear skin, oil control, anti-ageing). Skin that burns easily (tone I or II) reaches each UV warning level one point sooner. `climateZone` is not used. The home widget's temperature/condition comes from a separate OpenWeather call (`GET /weather/current`, needs `OPENWEATHER_API_KEY`).
- **Tests:** `test/dailyBrief.test.ts`.

### Check-ins, streaks, journal, stats ✅
- Home check-in (mood 1–5, a note, up to 6 photos), `(main)/journal`, `(main)/my-stats`. Same-day edit and delete; deleting removes uploaded photos. The streak counts consecutive local days ending today, so it reads 0 until you check in. Free accounts keep photos on the device; premium accounts upload them.

### Routines ✅
- `(main)/routine-builder`; `/routines`, `/routine-steps`. AM or PM routines built from catalog products, with step logging. The first routine awards a bounty.

---

## 6. Community and rewards

### Community ✅
- Community tab, `(main)/post/[id]`, `(main)/my-posts`; `/posts`. Feed by category (General, Products, My Story, Study Hub, Challenges), posts with up to 6 images, likes, bookmarks, threaded comments (optionally anonymous), reporting, deleting your own posts.
- **Limits:** reports are stored but nothing acts on them (no moderation queue).

### Bounties and points ✅ / 🟡
- Five seeded bounties (skin assessment 50, 3-day streak 30, first review 25, first routine 20, first post 15 points), awarded by the routes that detect the event. **Limit:** points can't be spent yet.

### Notifications ✅ / 🟡
- The app registers a push token. The only push is a **nightly 8 pm streak reminder** (server timezone, IST by default) for users who haven't checked in.

---

## 7. Platform

- **Themes** ✅ bloom (default), current and midnight, saved on the device. **Fonts:** Plus Jakarta Sans.
- **Premium** 🟡 a flag on the user that only decides whether check-in photos are uploaded. No purchase flow.
- **Admin** ✅ for emails in `ADMIN_EMAILS`: catalog create/edit/delete with Open Beauty Facts prefill (`(main)/admin/*`, `/admin`).
- **Website** ✅ `apps/website`: landing page, download page (QR code), privacy policy. The Play Store link is still a placeholder.
- **Builds and updates** ✅ EAS profiles (development, preview, production) with OTA updates.

---

## Wanted / planned

| Feature | Why | Depends on | Priority |
| --- | --- | --- | --- |
| Onboarding follow-ups: a dismissible "complete your profile" card on Home, clearing skin tone/age, sun habits, climate, current actives, lifestyle questions | Last 10% of accuracy and nudging existing users | Deeper onboarding (done) | Medium |
| Use the stored `climateZone` as a weather fallback in the daily brief | The brief returns nothing without location | A climate question | Medium |
| Rate limiting on login and reset codes | Brute-force protection | A limiter (new dependency) | High |
| Fix bounty self-completion (see below) | Points can be farmed | - | High |
| Store launch (real package name, Play link, signing SHA-1) | Distribution | Decide the package name first | Medium |
| Move Google/Firebase/Resend accounts to Lumora | One owner for everything | New Cloud project, new keystore SHA-1 | Medium |
| Shared routines screen | The `isShared` column exists, no UI | - | Medium |
| Moderation for reported posts | Reports go nowhere | Admin UI | Medium |
| Premium purchase flow | The flag has no way to be set | Payments provider | Medium |
| Refresh-token revocation | Logout can't invalidate a token | Token store | Low |
| Admin/CMS web app | Catalog tools only exist in the mobile app | `apps/admin` | Low |
| Tests for routes and the app | Only `src/lib` is covered | Test setup | Low |

## Known issues found (not yet fixed)

| Severity | Issue | Suggested fix |
| --- | --- | --- |
| **High** | `POST /bounties/:id/complete` lets any signed-in user complete any active bounty and collect points | Award only from the server-side events that already call `awardBounty`; remove or restrict that endpoint |
| Medium | Reports on posts have no consumer, so abuse can't be actioned | Moderation queue or auto-hide threshold |
| Medium | `GET /reviews` needs no login | Require auth, and confirm anonymous reviews hide the author |
| Low | `completedToday` on routine steps is never reset | Compare against today's date instead of a stored flag |
