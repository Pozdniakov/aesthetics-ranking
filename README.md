# Aesthetics Ranking

Compare visual aesthetics from [CARI Institute](https://cari.institute/aesthetics) side by side and build your personal ELO ranking. Share your ranking with a unique link.

## Features

- Pairwise comparison of 90 aesthetics
- ELO ranking algorithm (K=32)
- Smart pair selection (random early on, closest-rated later)
- Optional sign-in (Google OAuth) — works without an account, ratings persist via anonymous Supabase session
- Shareable links (`/share/<slug>`) for read-only ranking views

## Stack

- **Next.js 16** (App Router)
- **Supabase** (PostgreSQL + Auth)
- **Tailwind CSS + shadcn/ui**
- **Vercel** for hosting

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project.

### 2. Run the schema SQL

In Supabase Dashboard → SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql).

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and anon key from **Settings → API**.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Seed aesthetics

Run the seed script to fetch all aesthetics from CARI and populate your database.
Requires a **service role key** to bypass RLS:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

Or with anon key if you temporarily disable RLS on `aesthetics`:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run seed
```

### 5. Enable Google OAuth (optional)

In Supabase Dashboard → Authentication → Providers → Google, enable Google OAuth and add your credentials.

Add the callback URL to Google Cloud Console:
```
https://your-project.supabase.co/auth/v1/callback
```

### 6. Run locally

```bash
npm run dev
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set the same environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure

```
src/
  app/
    compare/          # Main comparison page
    ranking/          # Personal ranking page
    share/[slug]/     # Read-only shared ranking
    auth/callback/    # OAuth callback handler
  components/
    AestheticCard     # Clickable aesthetic comparison card
    RankingList       # Ranked list with ELO scores
    AuthButton        # Google sign-in / sign-out
  hooks/
    useSession        # Core state: session, ratings, pair selection
  lib/
    elo.ts            # ELO algorithm
    session.ts        # Anonymous session management
    supabase/         # Supabase client (browser + server)
scripts/
  seed-aesthetics.ts  # One-time DB seed from CARI API
supabase/
  schema.sql          # Database schema + RLS policies
```
