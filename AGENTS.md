<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Auth library mismatch

README says "Supabase Auth" — **the code uses Neon Auth** (`@neondatabase/auth`). Supabase is used only for file storage. Auth lives in `src/lib/auth/server.ts` and `src/lib/auth/client.ts`, configured via `ALEMATMA_NEON_AUTH_BASE_URL` and `ALEMATMA_NEON_AUTH_COOKIE_SECRET`.

## All new signups become teachers

`ensureTeacher()` in `src/lib/db.ts` runs on every authenticated teacher-facing request. It inserts a `users` row with `role='teacher'` and a `teachers` row on first call. A user becomes a student **only** by accepting an invitation (`POST /api/invitations/accept`), which overwrites their role to `student`. There is no other way to create a student.

## Pipeline is fire-and-forget

Each pipeline step (`/api/pipeline/transcribe`, `/api/pipeline/analyze`, `/api/pipeline/homework`) triggers the next via a `fetch()` that is never awaited. Errors in downstream steps will not propagate back to the caller — check `lessons.error_log` in the DB and lesson `status` to debug failures.

## `ALEMATMA_APP_URL` is required locally

`ALEMATMA_APP_URL` is used internally to build the URLs that pipeline steps call each other with. If it is unset or wrong, the pipeline chain silently breaks after the first step. Default fallback is `http://localhost:3000`.

## React Compiler

`reactCompiler: true` is set in `next.config.ts`. The compiler handles memoization automatically — do **not** add `useMemo`, `useCallback`, or `React.memo` purely as performance optimizations.

## Instant client-side navigation

Suspense boundaries alone do **not** guarantee instant navigations. Any route that should navigate instantly must also export `unstable_instant`. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

## `use cache` directive

The `use cache` directive (and `cacheLife`, `cacheTag`) require `cacheComponents: true` in `next.config.ts`. That option is **not currently enabled** — do not write `use cache` code without first enabling it and reading `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`.
