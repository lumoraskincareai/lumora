# AGENTS.md

Instructions for AI coding agents working anywhere in this monorepo. Each app has its own, more specific file. Read the one for the app you are changing **before** writing code:

| App | What it is | Agent instructions |
| --- | --- | --- |
| `apps/mobile/` | Expo SDK 54 React Native client | [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) |
| `apps/api/` | Express 5 + Prisma 6 REST API on Neon Postgres | [apps/api/AGENTS.md](apps/api/AGENTS.md) |
| `apps/website/` | Static HTML/CSS/JS download site, no build step | [apps/website/README.md](apps/website/README.md) |

What's done and what's open across all of them: [STATUS.md](STATUS.md).

## 1. Layout facts

- This is **one git repo**. Run git from anywhere in it, and let one commit span apps when a change does.
- npm workspaces, with a single `package-lock.json` at the root. Install with `npm ci` at the root, and add a dependency from inside its app. The website isn't a workspace because it has no dependencies.
- **Node**: 64-bit Node 22 (`.nvmrc`). Prisma and the API's TypeScript 7 fail on 32-bit Node, and `google-auth-library` needs 22+.
- The mobile app talks to the API only over REST. They share no code yet, so types are duplicated by hand: `apps/api/src/routes/*.ts` ↔ `apps/mobile/src/api/*.ts`.
- **TypeScript** differs by app on purpose: 5.9 at the root and for mobile (ESLint's tooling needs its JavaScript API), 7 for the API, nested in `apps/api/node_modules`. Don't remove the root pin. If a rebuilt lockfile breaks `npm run lint`, this is the first thing to check.
- `apps/mobile` pins React 19.1.0 and React Native needs exactly one copy of React. When adding a web app, keep its React out of the mobile app's resolution, and confirm `expo export` still works.

## 2. Cross-app contracts

When you change one side of these, change the other side in the same task, or say clearly that you didn't:

| Contract | API side | App side |
| --- | --- | --- |
| Endpoint paths and response shapes | `apps/api/src/routes/*.ts` (mounted in `src/index.ts`) | `apps/mobile/src/api/<resource>.ts` |
| Error shape `{ error: string }` | every `res.status(4xx/5xx).json({ error })` | `apiFetch` reads `data.error` and throws it |
| Auth | `Authorization: Bearer <access token>`, checked by `requireAuth` | added by `apiFetch` from `useAuthStore` |
| Google client ID | `GOOGLE_WEB_CLIENT_ID` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the values must be equal) |
| Android package | — | `apps/mobile/app.json` `android.package` must match the Play URL `id=` in `apps/website/site.js` |

Order of work for a new endpoint: API route → app `src/api` function with an explicit response type → screen. The [api-contract-checker](.claude/agents/api-contract-checker.md) agent audits this.

Commits land together, but **deploys don't**. Released app builds keep calling the old API until users update, so don't remove or rename a field that a released build uses.

## 3. Product principles for AI features

Lumora deliberately prefers **rule-based, explainable logic** over AI. The daily brief, product verdict and scan suggestions are all rules that cite their data.

- Don't add a new LLM or AI call unless the task asks for it. Extend the existing rules instead.
- The existing Gemini uses (face scan, "from the web" suggestions, identifying products missing from the catalog and Open Beauty Facts) live only in the API (`src/lib/geminiVision.ts`, `webProductSearch.ts`, `aiProductLookup.ts`). The product lookup only supplies the product's name and ingredients; the verdict and match % stay rule-based. Each one **must keep working without `GEMINI_API_KEY`**, using the heuristic fallback or by hiding the feature. Never call an AI API from the app.
- AI keys stay in the API's `.env` and never get an `EXPO_PUBLIC_` variable.
- Treat AI output as untrusted input: validate and clamp it before storing or showing it.

## 4. Secrets and generated files

Never read out, print, commit or edit these unless that is the task: `**/.env`, `apps/mobile/google-services.json`, keystores, `apps/mobile/android/`, `apps/mobile/.expo/`, `node_modules/`. The beta APK link https://getlumora.site/lumora-beta.apk is a Netlify redirect in `apps/website/_redirects` to the current EAS preview build (same URL as `betaApkUrl` in `site.js`).

The database in `apps/api/.env` may be a hosted Neon instance with real data. **Never** run `prisma migrate reset`, `prisma db push --force-reset` or destructive SQL without explicit permission.

## 5. Verification

| Scope | Run from the root |
| --- | --- |
| everything | `npm run verify` |
| mobile | `npm run typecheck -w lumora-app && npm test -w lumora-app && npm run lint` |
| API | `npm run typecheck -w lumora-backend && npm test` |
| website | open the HTML files; there is nothing to build |

The API and the mobile app both have unit tests for `src/lib` logic; mobile screens have none. Report exactly what you ran and what you didn't. Never claim a change works on a device unless you ran it there.

## 6. AI tooling

Open Claude Code at the repo root, because that's where it loads this configuration from.

| Path | Purpose |
| --- | --- |
| `AGENTS.md` (each level) | Instructions that any agent can read (Claude Code, Codex, Cursor, …) |
| `CLAUDE.md` (each level) | Just `@AGENTS.md`, so Claude Code loads the same instructions |
| `.claude/settings.json` | Permissions, hooks and the official Expo plugin |
| `.claude/hooks/guard.cjs` | Refuses destructive database commands and shell reads of `.env`; asks before migrations, seeds, EAS builds and pushes to main. A refusal is deliberate, so don't work around it; tell the user what you were trying to do |
| `.githooks/` + `scripts/` | Git gates for everyone, installed by `npm install` (`core.hooksPath`). `pre-commit` blocks `.env`, keys, keystores, secrets, `console.log` and local URLs in mobile code (a deliberate exception takes `gate:allow` plus a reason). `commit-msg` requires `type(scope): summary`. `pre-push` runs `npm run verify` and warns about contract, migration and flag drift. Logic and tests: `scripts/lib/gates.cjs`, `npm run test:gates`. Don't use `--no-verify`; CI runs the same checks |
| `.github/` | `workflows/ci.yml` (verify, commit messages, gitleaks, prisma migrations on a throwaway Postgres, expo export, Docker build, audit), Dependabot, PR template |
| `.claude/agents/` | `app-reviewer`, `backend-reviewer`, `api-contract-checker` |
| `.claude/skills/` | `/verify`, plus wrappers for the Prisma skills pinned in `apps/api/.agents/skills/` |

Keep these files short and current. When you change a convention, update the matching AGENTS.md in the same change.
