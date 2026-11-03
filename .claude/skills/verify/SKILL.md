---
name: verify
description: Run the Lumora checks (type check, tests, lint, guard) and report what passed. Use before finishing a change or opening a PR, or when asked whether the project is healthy.
---

Start with `node -p "process.arch + ' ' + process.version"`. If it isn't 64-bit Node 22, stop and say so, because the results wouldn't mean anything. If `node_modules` is missing, run `npm ci` at the repo root first.

From the repo root, run each of these separately, so one failure doesn't hide the others:

```bash
npm run typecheck
npm test
npm run lint
npm run test:guard
```

If `apps/api/prisma` changed, also run `npx prisma validate` in `apps/api`. It doesn't connect, so if `DATABASE_URL` isn't set, prefix it with `DATABASE_URL=postgresql://x:x@localhost:5432/x`.

If `apps/mobile` changed in a way that could affect bundling (dependencies, config, imports), also run `npx expo export --platform android --output-dir <temp folder>` in `apps/mobile`.

Report a table of check and result, with the real counts (tests passed, lint errors and warnings). Quote the output of anything that failed, and separate problems your change caused from ones that were already there.

Then say what these checks don't cover: the mobile app has no test suite, backend tests cover only `src/lib` rules and not route handlers, the website has no checks, and nothing here runs the app on a device. Don't call a change working unless you exercised it.
