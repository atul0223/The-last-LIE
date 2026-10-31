-- Push Tokens Table with Strict Row Level Security
-- SYSTEM_DESIGN §8.1 / §10 / WP-44s / WP-54

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Client RLS: Authenticated users can select and upsert only their OWN push tokens
create policy push_tokens_own_select
  on public.push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy push_tokens_own_insert
  on public.push_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy push_tokens_own_update
  on public.push_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy push_tokens_own_delete
  on public.push_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Revoke all access from anonymous role
revoke all on table public.push_tokens from anon;
