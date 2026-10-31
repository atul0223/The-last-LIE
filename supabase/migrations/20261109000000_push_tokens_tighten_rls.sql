-- WP-64: Tighten push_tokens RLS
-- Revoke direct insert/update/delete from authenticated, read none.
-- POST /push/token and DELETE /push/token via Edge Function API (service role) is the ONLY path.

-- 1. Drop existing client policies on push_tokens
drop policy if exists push_tokens_own_select on public.push_tokens;
drop policy if exists push_tokens_own_insert on public.push_tokens;
drop policy if exists push_tokens_own_update on public.push_tokens;
drop policy if exists push_tokens_own_delete on public.push_tokens;

-- 2. Revoke all permissions from anon and authenticated roles (read none, write none)
revoke all on table public.push_tokens from anon, authenticated;

-- 3. Confirm RLS is enabled (no policies = default deny all for clients)
alter table public.push_tokens enable row level security;
