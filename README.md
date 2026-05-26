# Æsthetics Ranking

A small, non-commercial ranker for visual aesthetics sourced from the
[CARI Institute](https://cari.institute/aesthetics) archive and its linked
Are.na channels. The app helps people skim through the catalogue, compare the
aesthetics they liked, and share a personal top 5.

## Features

- Like/skip discovery pass through the aesthetics catalogue.
- Guarded Top-5 Insertion ranking algorithm, usually finishing in roughly 18-30
  comparisons for 10-15 liked aesthetics.
- Personal top 5, public share links, Open Graph images, and a global ranking.
- Mainstream-to-niche taste profile based on other users' aggregate choices.
- Internal aesthetic detail pages with CARI/Are.na attribution, image lightbox,
  and click-to-load video embeds.
- Anonymous Supabase sessions; no sign-up or email collection.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase Postgres with RLS
- Vercel hosting

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then open the SQL
Editor and run [`supabase/schema.sql`](supabase/schema.sql).

### 2. Configure environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is only needed for the seed script.

### 3. Seed the catalogue

The seed script fetches CARI metadata and enriches images/videos from Are.na:

```bash
npm run seed
```

For refreshing only existing rows after schema or enrichment changes:

```bash
npm run seed -- --enrich-only --concurrency=1 --delay-ms=1500
```

Are.na rate-limits aggressively; keep concurrency low.

### 4. Run locally

```bash
npm install
npm run dev
```

## Deployment

Deploy to Vercel and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Run the Supabase schema manually before the first deploy. Run the seed script
locally or from a trusted environment with `SUPABASE_SERVICE_ROLE_KEY`.

## Project Structure

```text
src/
  app/
    compare/              # Discovery + pairwise comparison flow
    ranking/              # Personal ranking and share link
    global/               # Aggregate global leaderboard
    share/[slug]/         # Public shared ranking
    aesthetics/[slug]/    # Internal detail page, gallery, videos
    about/                # Attribution, privacy, and methodology
  components/             # Cards, lightbox, navigation, UI primitives
  hooks/
    useSwipe.ts           # Like/skip discovery state
    useSession.ts         # Guarded insertion + Supabase persistence
    useNicheScore.ts      # Taste profile fetch hook
  lib/
    guarded-insertion.ts  # Ranking algorithm
    gallery.ts            # Image attribution normalization
    videos.ts             # Video normalization
    session.ts            # Anonymous session/localStorage helpers
    supabase/             # Browser/server Supabase clients
scripts/
  seed-aesthetics.ts      # CARI + Are.na data import
supabase/
  schema.sql              # Tables, indexes, RLS policies
```

## Content and Attribution

Images and videos are displayed for identification, research, and reference
only. The app links back to CARI, Are.na, and original source URLs where
available. See `/about` in the app for the non-commercial statement, takedown
contact, and privacy details.
