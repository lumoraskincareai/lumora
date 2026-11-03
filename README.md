# Lumora

A skincare companion: a React Native app, the REST API behind it, and a static download site.

```
apps/
├── mobile/     Expo SDK 54 Android app
├── api/        Express 5 + Prisma REST API
└── website/    static landing, download and privacy pages (getlumora.site)
```

## Setup

You need 64-bit Node 22 (`.nvmrc`).

```bash
npm ci
cp apps/api/.env.example apps/api/.env        # then fill it in
cp apps/mobile/.env.example apps/mobile/.env  # then fill it in
```

Use a development database for local work, not the production one.

## Commands

Run these from the repo root.

| Command | Does |
| --- | --- |
| `npm run dev:api` | API on port 4000, restarting on changes |
| `npm run android` | Build and run the Android app (needs Android Studio and JDK 17) |
| `npm run start:mobile` | Metro dev server for an installed dev build |
| `npm run verify` | Type check, API tests, lint and guard tests |

Run EAS commands from `apps/mobile` (`eas build --profile preview --platform android`). Add a dependency from inside its app: `npx expo install <pkg>` for mobile, `npm install <pkg>` for the API.

## Deploying

| App | Where | Settings |
| --- | --- | --- |
| API | Render | Root directory: empty (the repo root). Build: `npm ci -w lumora-backend`. Start: `npm start -w lumora-backend`. Set `TZ=Asia/Kolkata` and the variables in `apps/api/.env.example` |
| Website | Netlify | Drag `apps/website` into the site's **Deploys** page, or connect the repo with publish directory `apps/website` and no build command |
| Mobile | EAS | `eas build` and `eas update` from `apps/mobile` |

Run database migrations as a deliberate step (`npx prisma migrate deploy` in `apps/api`), before deploying code that needs them.

## Start here

| I want to… | Read |
| --- | --- |
| Run the app | [apps/mobile/README.md](apps/mobile/README.md) |
| Run the API | [apps/api/README.md](apps/api/README.md) |
| Publish the website | [apps/website/README.md](apps/website/README.md) |
| Understand the app's code | [apps/mobile/docs/ARCHITECTURE.md](apps/mobile/docs/ARCHITECTURE.md) |
| See project status | [STATUS.md](STATUS.md) |
| Contribute | [apps/mobile/CONTRIBUTING.md](apps/mobile/CONTRIBUTING.md) |
| Understand the product decisions | [docs/ENGINEERING.md](docs/ENGINEERING.md) |

## Working with AI agents

Open Claude Code at the repo root. Instructions are layered: an agent reads the root [AGENTS.md](AGENTS.md) for cross-app rules, then the AGENTS.md of the app it is changing. Each `CLAUDE.md` contains only `@AGENTS.md`, so Claude Code and other agents follow the same rules.

| Tool | Use it for |
| --- | --- |
| `/verify` | running every check and reporting the results |
| `api-contract-checker` | checking that app API calls match API routes after an endpoint change |
| `app-reviewer` | reviewing app changes against the house rules (Text import, theming, apiFetch, …) |
| `backend-reviewer` | reviewing route, Prisma and migration changes |

Recommended loop for a feature: tell the agent which app it touches → let it make the change → `/verify` → run the matching reviewer agent → update STATUS.md if a checklist item changed.
