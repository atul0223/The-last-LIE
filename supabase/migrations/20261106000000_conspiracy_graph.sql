-- Conspiracy Graph Backend Migrations + RLS
-- SYSTEM_DESIGN §6 / §8.1 / WP-51s

-- 1. Conspiracy nodes table
create table if not exists public.conspiracy_nodes (
  id text primary key,
  kind text not null check (kind in ('character', 'organization', 'location', 'symbol', 'transaction', 'case')),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Conspiracy edges table
create table if not exists public.conspiracy_edges (
  id text primary key,
  from_node text not null references public.conspiracy_nodes(id) on delete cascade,
  to_node text not null references public.conspiracy_nodes(id) on delete cascade,
  rel text not null,
  revealed_by_case_id text references public.cases(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Player graph reveals table
create table if not exists public.player_graph_reveals (
  user_id uuid not null references auth.users(id) on delete cascade,
  edge_id text not null references public.conspiracy_edges(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  primary key (user_id, edge_id)
);

-- Indexes
create index if not exists idx_conspiracy_edges_revealed_by on public.conspiracy_edges(revealed_by_case_id);
create index if not exists idx_player_graph_reveals_user on public.player_graph_reveals(user_id);

-- Enable RLS
alter table public.conspiracy_nodes enable row level security;
alter table public.conspiracy_edges enable row level security;
alter table public.player_graph_reveals enable row level security;

-- Client access: Clients CANNOT read raw conspiracy_nodes or conspiracy_edges directly.
-- Access is mediated strictly via the /graph route which filters on player_graph_reveals.
revoke all on table public.conspiracy_nodes from anon, authenticated;
revoke all on table public.conspiracy_edges from anon, authenticated;

-- Player graph reveals: users can read their own reveals; direct writes revoked
grant select on table public.player_graph_reveals to authenticated;
create policy player_graph_reveals_select_own
  on public.player_graph_reveals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on table public.player_graph_reveals from anon, authenticated;
