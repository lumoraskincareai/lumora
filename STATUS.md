# Lumora — project status

Last updated: 2026-11-04. Covers `apps/mobile/`, `apps/api/` and `apps/website/`.

## Completed

### Accounts
- [x] Email/password signup and login (JWT, bcrypt cost 12; old hashes are upgraded on the next login)
- [x] **Email verification** (2026-11-04): signup emails a 6-digit code (15-minute expiry, 5 wrong tries, 60-second resend) and returns no tokens until `POST /auth/verify-email` succeeds. Login refuses unverified accounts and sends a fresh code. Google sign-in and a completed password reset count as verified. Accounts that existed before the migration are marked verified. A new `verify-email` screen handles the code
- [x] **Password rules on the server** (2026-11-04): 8+ characters, a letter and a number, at most 72 bytes, no common passwords, nothing containing the email name or display name. The signup screen shows a show/hide toggle, a strength meter and a live checklist
- [x] Emails are trimmed and lowercased; lookups ignore case, so old mixed-case accounts still log in
- [x] Google sign-in, which links to an existing account with the same email ([setup](apps/mobile/docs/GOOGLE_SIGN_IN.md))
- [x] Forgot / reset password with an emailed code (Resend; the code is logged to the console when no key is set, and the same applies to the verification code)
- [x] Four-step onboarding: skin type, concerns, sensitivities, goals, saved as a skin profile
- [x] Monthly budget on the skin profile
- [x] Edit profile and public user profiles
- [x] Sessions stay alive: the app refreshes the 15-minute access token automatically (`POST /auth/refresh`) and logs out with a message only when the refresh token is invalid
- [x] `isPremium` flag on users

### Daily use
- [x] Rule-based daily brief: headline, tips that cite UV/AQI/humidity/scan/check-in/expiry data, and one product pick that respects budget, sensitivities and "Not for me"
- [x] Live UV, air quality and humidity from Open-Meteo (no key)
- [x] Mood check-ins with notes and photos; edit and delete
- [x] Streaks and stats
- [x] Journal screen with check-in history
- [x] Free tier keeps check-in photos on the device; premium uploads them
- [x] Recommendation feedback

### Face scan
- [x] Selfie capture against an oval guide
- [x] Gemini vision analysis, with a model fallback chain and a heuristic pixel-analysis fallback
- [x] Concern scores and on-photo markers
- [x] Product suggestions from three sources: your shelf, the catalog (promoted products first), or the web via Gemini. Suggestions fit within the monthly budget and are cached per scan

### Products and routines
- [x] Catalog browse and search, product detail
- [x] Barcode scanner that returns its result to Add product or Write a review
- [x] In-shop "Is this right for me?" check: scan from the + menu to get a verdict covering sensitivities, skin type, concerns, overlaps and clashes with products you own, budget, and reviews from people with your skin type. Works for products that are only in Open Beauty Facts. "I bought it" adds the product to My Products. The same verdict appears on every product detail page
- [x] Match percentage on every verdict ("78% match for you") plus a bar per skin concern, computed by rules from the same checks (2026-10-29)
- [x] Products in neither the catalog nor Open Beauty Facts: Gemini identifies them from the pack text or barcode and finds the ingredient list; the verdict stays rule-based. Labelled as AI-found in the app; hidden without `GEMINI_API_KEY` (2026-10-29)
- [x] My Products shelf, including custom products
- [x] Product reviews
- [x] AM/PM routine builder, step logging, routine deletion
- [x] Ingredient glossary
- [x] "Popular in the community" row on Explore (`/products/popular`)

### Community
- [x] Feed with categories
- [x] Posts with images (Supabase Storage)
- [x] Likes, bookmarks, comments (including anonymous comments)
- [x] Reporting posts and deleting your own posts
- [x] My posts, bookmarked posts

### Engagement
- [x] Bounties with points: skin assessment, 3-day check-in streak, first review, first routine, first community post
- [x] Push token registration
- [x] Nightly streak-reminder push at 20:00 for users who haven't checked in

### Admin
- [x] Admin access by email allowlist (`ADMIN_EMAILS`)
- [x] Catalog create/edit/delete
- [x] Open Beauty Facts prefill by barcode or search

### Platform
- [x] Three themes: bloom, current, midnight
- [x] Plus Jakarta Sans embedded natively
- [x] EAS build profiles (development, preview, production) and OTA updates
- [x] Beta APK and a static website (landing, download, privacy policy)
- [x] 31 Prisma migrations
- [x] Demo data: `npm run seed:demo` / `unseed:demo` in the backend (8 `@demo.lumora.app` users, 16 extra products, reviews, posts, check-ins, routines)

### Quality
- [x] 174 backend unit tests (`npm test`) for password and email-verification rules, the daily brief, verdict and match %, ingredient rules, product matching, scan suggestions, heuristic face analysis and its oval crop, AI product lookup, and Gemini output validation. Written with AI agents; they found 10 bugs, all fixed
- [x] `.env.example` in both projects; app `.env` no longer tracked

## Open / not done

- [ ] **Admin + CMS website**: planned as `apps/admin`; catalog tools exist today only in the mobile app and `/admin` routes

- [x] **Settings notification toggles** (2026-10-27): removed the three toggles that did nothing; Settings now explains the one real notification (8 pm streak reminder, pinned to IST)
- [ ] **Shared routines**: partly built. The `isShared` column exists, but the link is commented out in Explore and there's no screen or route
- [ ] **Premium**: the flag exists, but there's no way to purchase or upgrade
- [ ] **Deploying email verification**: the new signup response has no tokens, so app builds released before this change can't sign up against an API that has it. Release the app with the API, and run `prisma migrate deploy` on the hosted database first
- [ ] **Move the accounts to Lumora**: the EAS project, Neon database and git remote already use `lumoraskincareai`. The Google Cloud project, Firebase project (`google-services.json`), Android OAuth client and the Resend sender are still the old ones ([Google setup](apps/mobile/docs/GOOGLE_SIGN_IN.md))
- [ ] **Rate limiting**: login and password-reset codes have no request limit yet (verification codes do: 5 tries)
- [ ] **Token revocation**: refresh tokens are stateless, so logout can't invalidate one server-side
- [ ] **Store launch**: the package name is still the placeholder `com.anonymous.lumoraapp`, the Play App Signing SHA-1 isn't registered for Google sign-in, and the website's `site.js` still has the placeholder Play Store URL (support email is set: hello@getlumora.site)
- [x] **Backend type error** in `prisma.config.ts` fixed; `start`, `test`, `typecheck` and `postinstall: prisma generate` scripts added
- [ ] **Tests**: backend `src/lib` is covered; routes and the app have no automated tests
- [x] **Deployment**: the backend runs on Render (`/health` returned 200 on 2026-11-03). After the monorepo move its build settings need updating; see the root README
- [x] **Cleanup** (2026-10-11, again 2026-11-04): Expo template leftovers, the unused `Button` primitive, stray IDE-extension folders and irrelevant Prisma agent skills removed; the Open Beauty Facts lookup no longer prints every raw response, and the upload route no longer logs twice

## Health check (backend tests re-run 2026-11-04; other rows from 2026-10-27)

| Check | Result |
| --- | --- |
| App `npx tsc --noEmit` | clean |
| App `npm run lint` | 0 errors, 2 warnings (deliberate mount-only effects) |
| Backend `npx tsc --noEmit` | clean |
| Backend `npm test` | 174 pass, 0 fail (run 2026-11-04) |
| API smoke test (curl as the demo user) | login, refresh, streak, feed, popular, shelf, routines, bounties, daily brief: OK |
| On-device run | not verified in this pass |
