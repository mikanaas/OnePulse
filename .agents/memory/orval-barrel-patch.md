---
name: Orval codegen barrel patch
description: Orval regenerates api-zod/src/index.ts with a stale types export that breaks compilation when schemas config is removed.
---

# Orval Barrel Patch

**Rule:** The codegen script in `lib/api-spec/package.json` must `printf`-patch `lib/api-zod/src/index.ts` after Orval runs.

**Why:** Orval generates a barrel `src/index.ts` in the workspace directory. When `schemas` is removed from orval config (to avoid name collisions between Zod schemas and TypeScript types), Orval still writes `export * from './generated/types'` into `index.ts` — but `types/` no longer exists, causing TS2307 errors. The patch overwrites it with only `export * from "./generated/api"`.

**How to apply:** The fix is already in `lib/api-spec/package.json`:
```json
"codegen": "orval --config ./orval.config.ts && printf 'export * from \"./generated/api\";\\n' > ../api-zod/src/index.ts && pnpm -w run typecheck:libs"
```
Do NOT revert this. Do NOT add schemas back to orval config.
