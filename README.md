# AI Math Lesson Assistant

Upload math lesson recordings and get AI-powered transcription, analysis, weakness detection, and personalized homework generation — automatically.

## Tech Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Database:** Neon Postgres (serverless)
- **Storage:** Supabase Storage (lesson audio/video files)
- **Auth:** Supabase Auth (email/password)
- **Transcription:** Deepgram Nova-2 (swap for Whisper if preferred)
- **Analysis:** OpenAI GPT-4o or Anthropic Claude (configurable)
- **Hosting:** Vercel

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/   # Supabase Auth callback
│   │   ├── lessons/          # GET lessons list / detail
│   │   ├── pipeline/
│   │   │   ├── transcribe/   # Step 1: Speech-to-text
│   │   │   ├── analyze/      # Step 2: LLM analysis
│   │   │   └── homework/     # Step 3: Homework generation
│   │   └── upload/           # File upload + pipeline trigger
│   ├── dashboard/            # Teacher dashboard (lesson list + detail)
│   ├── login/                # Auth page (login/signup)
│   ├── upload/               # Drag & drop file upload
│   ├── layout.tsx            # Root layout with NavBar
│   └── page.tsx              # Landing page
├── components/
│   └── nav-bar.tsx           # Navigation bar with auth state
├── lib/
│   ├── db.ts                 # Neon Postgres Pool client
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       ├── middleware.ts      # Auth session refresh + route protection
│       └── server.ts         # Server Supabase client
├── services/ai/
│   ├── transcription.ts      # Deepgram / Whisper integration
│   ├── analysis.ts           # GPT-4 / Claude lesson analysis
│   └── homework.ts           # Homework generator from weaknesses
├── types/
│   └── index.ts              # All TypeScript types
├── utils/
│   └── background.ts         # Retry logic + pipeline trigger helpers
└── middleware.ts              # Next.js middleware (auth guard)

database/
└── schema.sql                # Full Postgres schema

scripts/
├── seed.ts                   # Seed DB with sample data
└── test-pipeline.ts          # Test pipeline end-to-end
```

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd ai-math-lesson-assistant
npm install
```

### 2. Set up services

You need accounts on:

| Service | Purpose | Sign up |
|---------|---------|---------|
| **Neon** | Postgres database | https://console.neon.tech |
| **Supabase** | Auth + file storage | https://app.supabase.com |
| **Deepgram** | Speech-to-text | https://console.deepgram.com |
| **OpenAI** | Lesson analysis + homework | https://platform.openai.com |
| **Anthropic** *(optional)* | Alternative analysis LLM | https://console.anthropic.com |

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
DATABASE_URL=postgresql://...          # Neon connection string
NEXT_PUBLIC_SUPABASE_URL=https://...   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...          # Supabase service role key
OPENAI_API_KEY=sk-...                  # OpenAI API key
DEEPGRAM_API_KEY=...                   # Deepgram API key
PIPELINE_API_SECRET=...                # Any random secret string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up database

```bash
npx tsx scripts/seed.ts
```

This runs `database/schema.sql` and inserts sample data (a demo lesson with transcript, summary, weaknesses, and homework).

### 5. Set up Supabase Storage

In your Supabase dashboard:
1. Go to **Storage** → **New Bucket**
2. Create a bucket named `lesson-files`
3. Set it to **Public** (or configure RLS policies for authenticated uploads)

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000

### 7. Test the pipeline

1. **Sign up** at `/login` with an email/password
2. **Upload** a lesson recording at `/upload`
3. Watch the **dashboard** at `/dashboard` — status updates automatically via polling

Or test programmatically:

```bash
# Make sure dev server is running first
npx tsx scripts/test-pipeline.ts <lessonId>
```

## Pipeline Flow

```
Upload (audio/video)
  → POST /api/upload (stores file in Supabase Storage, creates lesson record)
  → POST /api/pipeline/transcribe (Deepgram speech-to-text, 3x retry)
  → POST /api/pipeline/analyze (GPT-4/Claude analysis, 3x retry)
  → POST /api/pipeline/homework (GPT-4 homework generation, 3x retry)
  → Status: "ready" — dashboard auto-refreshes
```

Each step:
- Updates lesson status in DB
- Retries up to 3x with exponential backoff (1s, 2s, 4s)
- Logs errors to `lessons.error_log`
- Triggers the next step via fire-and-forget HTTP call

## Dashboard Features

- **Lesson list** with real-time status badges (polling every 5s)
- **Lesson detail** showing: transcript, summary, understanding score, weaknesses, homework
- **Error display** with raw error log from pipeline
- **Auto-refresh** during processing — no page reload needed

## Swapping AI Providers

### Transcription
- Default: **Deepgram Nova-2** (`src/services/ai/transcription.ts`)
- Alternative: Uncomment the Whisper implementation in the same file

### Analysis
- Default: **OpenAI GPT-4o**
- Set `USE_ANTHROPIC=true` in `.env.local` to use **Claude** instead

## Future Hooks (Layer 2/3)

The codebase includes typed interfaces for future expansion:
- `KnowledgeGraphHook` — integrate knowledge graph from lesson data
- `AITutorHook` — generate AI tutoring sessions per student
- `StudentDashboardHook` — personalized student recommendations

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

> **Note:** Pipeline API routes use `maxDuration = 300` (5 min) which requires a Vercel Pro plan for function timeout > 60s. On the free plan, transcription of long files may time out.
