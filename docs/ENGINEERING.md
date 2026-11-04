# Lumora engineering notes

How the product is built, why, and what we've learned. How to run things is in the [README](../README.md); what's done and open is in [STATUS.md](../STATUS.md).

## Architecture

```
┌──────────── apps/mobile (Expo SDK 54, RN 0.81) ───────────┐
│ app/          expo-router screens (auth, onboarding, tabs) │
│ src/api/*.ts  one typed module per backend resource        │
│ src/api/client.ts  apiFetch: auth header, 401 → refresh    │
│                    → retry, { error } unwrapping           │
│ zustand + expo-secure-store (tokens), NativeWind, ML Kit   │
└──────────────────────────┬─────────────────────────────────┘
                           │ REST + JSON, Bearer JWT
┌──────────────────────────┴─────────────────────────────────┐
│ apps/api (Express 5, TypeScript via tsx, on Render)        │
│ src/routes/   thin handlers, requireAuth / requireAdmin    │
│ src/lib/      the product: rule engines (brief, verdict +  │
│               match %, ingredients, matching, suggestions),│
│               Gemini + fallbacks, external clients         │
│ src/jobs/     node-cron streak reminder (Expo push)        │
└───────┬───────────────┬───────────────┬────────────────────┘
   Prisma 6        Open-Meteo,      Gemini (optional),
   Neon Postgres   Open Beauty      Supabase Storage,
                   Facts            Resend (optional)
```

Deeper docs: [apps/mobile/docs/ARCHITECTURE.md](../apps/mobile/docs/ARCHITECTURE.md), [apps/api/README.md](../apps/api/README.md) (routes, env vars, where the logic lives).

### Key decisions and trade-offs

| Decision | Why | Cost |
| --- | --- | --- |
| **Rules over AI for every recommendation** | Skincare advice must be explainable and must not make things up. Each tip and verdict check shows the number or ingredient behind it, and rules can be unit-tested | Less flexible than an LLM; the rule lists need curating |
| **AI only where rules can't see:** face scan, "from the web" suggestions, identifying products missing from every database | Pixels and the open web need a model | Each AI path needs a non-AI fallback, or the feature is hidden when `GEMINI_API_KEY` is missing or quota runs out. Model output is validated and clamped before it is stored |
| **AI supplies data, rules decide.** For unknown products, Gemini returns only a name and ingredient list; the match % is computed by the tested rules | An AI-given score would vary between scans, couldn't explain itself and couldn't be tested | Answers are cached to protect the free-tier quota; a bare barcode is only looked up with live web search, so the model can't invent a product from digits |
| **Match % built from the verdict's own checks**, not a separate score | The number and its reasons always agree | The weights are hand-picked and documented, not learned |
| **Fix on the server where possible** (for example the face-scan crop has a default screen shape) | Already-installed APKs benefit without an update | Slightly less precise on unusual screens until the app is updated |
| **No shared code between app and backend** | A simple REST contract; no shared package yet | Types are duplicated by hand; the `api-contract-checker` agent audits them |
| **Stateless JWT:** 15-minute access token, 30-day refresh token | Simple, no session store | Logout can't revoke a refresh token on the server (listed under limitations) |
| **No build step (`tsx`), Node's built-in test runner** | Fewer moving parts; no new dependencies for tests | `tsx` must be available in production |
| **Hosted Postgres (Neon) from day one** | Same database for development and the beta APK | Destructive commands are banned for agents (see AGENTS.md) |

### Security

- Secrets only in `.env` (git-ignored). `.env.example` lists every variable without values. AI keys exist only on the backend; the app gets no `EXPO_PUBLIC_` AI key.
- bcrypt password hashes (cost 12), with server-side rules for new passwords. New accounts must verify their email with a one-time code before they get tokens. JWT auth on every user route. Writes are scoped to `req.userId`, so users can't touch each other's rows. Admin is an email allowlist.
- Google sign-in verifies the ID token's audience, and refuses unverified emails before linking to an existing account.
- Public user objects only expose `id`/`name`. Password-reset and email-verification codes are hashed and expire; verification codes also lock after 5 wrong tries.
- AI output is treated as untrusted input: scores are coerced and clamped to 0–100, boxes to 0–1000, text is length-capped, and `detected` is derived from the score. AI product lookups with fewer than 3 ingredients are rejected.

## Lessons learned

| What went wrong | What I learned / changed |
| --- | --- |
| The AI wrote a heuristic face analyser that **looked right, passed review and typechecked, but measured the wrong pixels** (sharp `stats()` semantics). Nobody noticed for weeks | Code review isn't enough for numeric code. Tests with synthetic images caught it. New rule in AGENTS.md: changes to `src/lib` rules need a test |
| Bundling failed with `Unable to resolve "react-native-svg"`. The AI first blamed the Metro cache, partly because its file search skipped `node_modules` and it concluded the package wasn't installed | Make the AI check the actual files before guessing. The real cause: the package folder was missing `src/`, which the `react-native` entry points to. Reinstalling that package fixed it |
| The backend crashed: the Prisma client had been generated on Linux (`node_modules` copied between machines) | Added `postinstall: prisma generate`, so every install builds the engine for its own OS |
| The "8 pm" streak reminder used the server clock; on a UTC cloud host it would fire at 1:30 am IST | Pinned the cron to `Asia/Kolkata` and documented `TZ` |
| Settings showed three notification toggles the AI had generated as UI but never wired up | Removed them; Settings now describes only the reminder that exists. Built UI is not a built feature |
| The AI found my **GitHub token embedded in the git remote URLs**. Claude Code's permission guard stopped the AI from changing remotes on its own | The remotes were fixed by hand and now hold no token. Secrets can hide in `.git/config`, not just `.env` |
| Access tokens expired after 15 minutes and nothing used the refresh token, so the app quietly broke mid-session | Added `/auth/refresh`, plus refresh-and-retry in `apiFetch` with a single shared in-flight refresh |
| On my phone, the face-scan markers landed on my neck and T-shirt. The AI's original analysis assumed the photo matched the screen, but the camera preview fills a tall screen and shows only the middle of the 3:4 photo | From my screenshot, the AI worked out the geometry. The backend now crops each photo to the on-screen oval, with a default screen shape so already-installed APKs were fixed too. 4 tests cover it. Lesson: test camera features on a real device |
| The production deploy failed with Prisma **P3005**: the hosted database had every table but no migration history | Read-only checks first (`migrate status`, then `migrate diff` showed the live schema exactly matched), then a baseline with my approval. Never "fix" a live database by resetting it |
| The AI reported that the new features were **"MISSING"** from the build I was about to publish | Checking the actual files in that commit showed they were there; the AI's check had a scripting mistake. Verify an AI's claim against evidence before acting on it |
| While building the match %, the AI also changed when an unrelated "Take the skin quiz" link appears | It noticed and reverted its own change before shipping. Changes outside the request get reverted, even small "improvements" |

## Limitations

- No automated tests for routes or the app.
- Refresh tokens can't be revoked server-side.
- The offline face-scan heuristic is a pixel-statistics estimate, not face detection; its ranges need tuning against real selfies.
- The AI product lookup depends on Gemini's free-tier quota. Barcode-only lookups need Google Search grounding, which most free keys lack, so photographing the pack works better for unknown products.
- The API is on a free hosting tier and can be slow to respond after idling.
- Admin catalog tools are basic and not part of the user app.
- Premium has a flag but no purchase flow. Shared routines have a database column but no screen.
- Push notifications: only the streak reminder exists.
- Store launch blockers: placeholder Android package name, and the Play signing SHA-1 for Google sign-in.
- Next: route integration tests and CI, on-device face landmarks, a review queue that turns verified AI-found products into catalog entries, refresh-token rotation, and a separate staging database.
