---
name: deploy-platform
description: How Le chat dans la ville uses Supabase (email and password auth, profile and progress tables, rate limiting the voice route) and how it deploys to Vercel. Load before any Supabase schema work, auth work, or deployment.
---

# Supabase and Vercel for this project

## Ask before acting

Confirm with the user before each of these, every time:

- creating a Supabase project or a Vercel project (ask which organisation / team);
- applying a migration to a hosted database;
- setting or changing production environment variables;
- promoting a deployment to production.

Never print, log or commit a secret. `.env.local` is gitignored; keep it that way.

## Supabase

**Auth:** email and password only. Anonymous sign-in and social providers stay
disabled. The player must be signed in before the game starts.

- Use `@supabase/ssr` so the session lives in cookies and route handlers can read
  the user.
- `components/auth/AuthForm.tsx` has two modes, sign up (`auth.signUp`) and sign in
  (`auth.signInWithPassword`), and shows a plain message for each failure: wrong
  email or password, email already registered, password too short (minimum 8).
- Email confirmation is off for v1, so `signUp` returns a session and the player
  goes straight to the language picker. If the user turns it on, add the preview
  and production URLs to the allowed redirect URLs and handle the "check your
  email" state.
- On sign-in and on reload, call `store.setUser`. On sign-out, clear the store.
- Password reset by email is not in v1.

**Tables** (all with row-level security; policy: `user_id = auth.uid()` for select,
insert and update). `lang` is `'fr'`, `'es'` or `'de'` (check constraint):

```sql
profiles       (user_id uuid primary key references auth.users on delete cascade,
                lang text, created_at timestamptz default now())
venue_progress (user_id uuid, lang text, venue_id text, completed_at timestamptz,
                attempts int default 0, primary key (user_id, lang, venue_id))
vocab_seen     (user_id uuid, lang text, vocab_id text, seen_count int default 1,
                last_seen timestamptz default now(), primary key (user_id, lang, vocab_id))
voice_sessions (id text primary key, user_id uuid, lang text, venue_id text,
                started_at timestamptz default now(), ended_at timestamptz)
```

`profiles.lang` is null until the player picks a language; upsert the row when they
do. `vocab_id` is the item or phrase id from `content/`, the same in every language.

Keep migrations as SQL files in `supabase/migrations/`. After applying one, run the
security advisors and fix anything flagged about missing row-level security.

**Clients:** `lib/supabase/client.ts` (browser, publishable key) and
`lib/supabase/server.ts` (route handlers, reads the user from the request). Only the
publishable key may appear in browser code.

**Progress sync:** on sign-in, load `profiles.lang`, then that language's
`venue_progress` and `vocab_seen`, into the game store. Upsert on `setLang`,
`inspectItem` and `completeVenue`. When the language changes, replace the store's
progress with the new language's rows. The store stays the source of truth while
playing, so the game still works if a save fails.

## Protecting the voice route

`POST /api/voice-session` spends the Mistral key, so it must:

1. reject requests with no signed-in user (401);
2. count that user's `voice_sessions` rows in the last hour and return 429 over the
   cap (start with 20);
3. insert a `voice_sessions` row on create and set `ended_at` on delete.

## Vercel

- Framework preset: Next.js. No special build settings.
- Environment variables: `MISTRAL_API_KEY` (server only, never `NEXT_PUBLIC_`),
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The microphone needs HTTPS, which Vercel provides on every deployment.
- Set Supabase's site URL to the production URL (needed once email confirmation or
  password reset is switched on).
- Order: preview deploy, run the `playtest` skill against it, then production.

## After a deploy

Check build logs for a failed deployment; check runtime errors and logs for a live
one. Confirm the key is not in the client bundle (search the built JS for the first
characters of the key name's value, never paste the value anywhere).
