## What and why

## Checks
- [ ] `npm run verify` passes
- [ ] Both sides of any API change are updated (`apps/api/src/routes` and `apps/mobile/src/api`), or I say here why not:
- [ ] No field a released app build uses was removed or renamed
- [ ] A new migration is applied (`prisma migrate deploy`) before the API deploy
- [ ] A new feature has a flag in `apps/api/src/lib/features.ts` and `apps/api/.env.example`
- [ ] No secrets, `.env` files or keystores added
- [ ] Docs updated (`AGENTS.md`, `STATUS.md`) if a convention or status changed
- [ ] Tested on a real device? (say yes or no, do not guess)
