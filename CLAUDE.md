@AGENTS.md

# AI Math Lesson Assistant — Project Guide

AI-powered platform for math teachers. Teachers upload lesson recordings (or start live Zoom/Meet sessions), an async pipeline transcribes and analyzes them, and students receive personalized homework targeting their weak topics.

## Stack (accurate)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Auth | **Neon Auth** (`@neondatabase/auth`) — NOT Supabase |
| Database | Neon Postgres — `src/lib/db.ts` (Pool singleton) |
| File storage | Supabase Storage — `src/lib/supabase/storage.ts` |
| Transcription | Deepgram Nova-2 — `src/services/ai/transcription.ts` |
| Analysis | OpenAI GPT-4o or Anthropic Claude — `src/services/ai/analysis.ts` |
| Homework gen | OpenAI GPT-4o — `src/services/ai/homework.ts` |
| Live recording | Recall.ai bots — `src/services/meeting/recall.ts` |

## Environment variables

All variables use the `ALEMATMA_` prefix. Required:

```
ALEMATMA_DATABASE_URL          # Neon Postgres connection string (pooled)
ALEMATMA_NEON_AUTH_BASE_URL    # Neon Auth endpoint
ALEMATMA_NEON_AUTH_COOKIE_SECRET
ALEMATMA_SUPABASE_URL          # Supabase project URL (storage only)
ALEMATMA_SUPABASE_SERVICE_ROLE_KEY
ALEMATMA_DEEPGRAM_API_KEY
ALEMATMA_OPENAI_API_KEY        # Required for analysis (default) and homework gen
ALEMATMA_APP_URL               # Base URL — used internally to chain pipeline steps
```

Optional:
```
ALEMATMA_ANTHROPIC_API_KEY     # Required when ALEMATMA_USE_ANTHROPIC=true
ALEMATMA_USE_ANTHROPIC         # Set to "true" to use Claude for lesson analysis
ALEMATMA_RECALL_API_KEY        # Required for live-lesson recording feature
ALEMATMA_RECALL_WEBHOOK_SECRET # Optional webhook signature verification
ALEMATMA_PIPELINE_API_SECRET   # Optional — pipeline routes check x-pipeline-secret header
```

## User roles

- **teacher** — default for all new signups (auto-provisioned by `ensureTeacher()` on first request)
- **student** — only created by accepting a teacher's invitation (`POST /api/invitations/accept`)
- **admin** — set manually in DB; sees all teachers, all students, all lessons

Role is stored in `users.role`. Teachers see only their own students/lessons. Students see only their own lessons.

## Pipeline

Upload or live recording → **transcribe** → **analyze** → **homework** → status: `ready`

- Each step calls the next via fire-and-forget `fetch()` (not awaited)
- All pipeline routes require `x-pipeline-secret: <ALEMATMA_PIPELINE_API_SECRET>` header
- Retries: 3 attempts, exponential backoff (1s, 2s, 4s)
- On failure: `lessons.status = 'error'`, `lessons.error_log` contains the error
- Live lessons: Recall.ai webhook (`POST /api/webhooks/recall`) drives status until `bot_done`, then hands off to the same transcribe→analyze→homework pipeline

## Lesson status state machine

Upload flow: `uploaded → transcribing → transcribed → analyzing → analyzed → generating_homework → ready`

Live flow: `bot_joining → bot_waiting → bot_recording → bot_done` then continues as upload flow from `uploaded`

## Key files for common tasks

| Task | File |
|---|---|
| Add/change DB queries | `src/lib/db.ts` |
| Change auth behavior / session | `src/lib/auth/server.ts` |
| Change route protection | `src/proxy.ts` (middleware) |
| Change pipeline logic | `src/utils/background.ts` |
| Change AI models / prompts | `src/services/ai/` |
| Add an API route | `src/app/api/<name>/route.ts` |
| DB schema | `database/schema.sql` |

## Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json`). Use `@/lib/db` not `../../lib/db`.

## Dev commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsx scripts/seed.ts                         # Reset DB + seed sample data
npx tsx scripts/test-pipeline.ts <lessonId>     # Manually trigger pipeline on a lesson
```
