-- Le chat dans la ville: profile, progress and voice-session tables.
-- Every table has row-level security: a signed-in user sees and writes only their own rows.

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  lang       text check (lang in ('fr', 'es', 'de')),
  created_at timestamptz not null default now()
);

create table public.venue_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lang         text not null check (lang in ('fr', 'es', 'de')),
  venue_id     text not null,
  completed_at timestamptz,
  attempts     int not null default 0,
  primary key (user_id, lang, venue_id)
);

create table public.vocab_seen (
  user_id    uuid not null references auth.users (id) on delete cascade,
  lang       text not null check (lang in ('fr', 'es', 'de')),
  vocab_id   text not null,
  seen_count int not null default 1,
  last_seen  timestamptz not null default now(),
  primary key (user_id, lang, vocab_id)
);

create table public.voice_sessions (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  lang       text not null check (lang in ('fr', 'es', 'de')),
  venue_id   text not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);

-- Used by the per-user hourly cap on the voice route.
create index voice_sessions_user_started_idx
  on public.voice_sessions (user_id, started_at desc);

alter table public.profiles       enable row level security;
alter table public.venue_progress enable row level security;
alter table public.vocab_seen     enable row level security;
alter table public.voice_sessions enable row level security;

-- (select auth.uid()) is evaluated once per statement rather than once per row.
create policy "own rows: select" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.venue_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.venue_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.venue_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.vocab_seen
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.vocab_seen
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.vocab_seen
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.voice_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.voice_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.voice_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
