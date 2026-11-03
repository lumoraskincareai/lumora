---
name: prisma-cli
description: Prisma ORM CLI commands reference covering init, generate, migrate, db, dev, studio, validate, format, debug, and mcp. Use for ORM/database CLI workflows, not Prisma Compute app deployment. For Prisma Compute, `@prisma/cli app deploy`, `compute:deploy`, `create-prisma --deploy`, apps, deployments, logs, or domains, use the `prisma-compute` skill instead. Triggers on "prisma init", "prisma generate", "prisma migrate", "prisma db", "prisma studio", "prisma mcp".
---

The full skill is in `apps/api/.agents/skills/prisma-cli/`. Read `SKILL.md` there and follow it, along with whichever files in its `references/` apply.

This repo is on Prisma 6.19 and the skill is written for 7.x. Where they differ, follow what the installed version does, and don't upgrade as a side effect.
