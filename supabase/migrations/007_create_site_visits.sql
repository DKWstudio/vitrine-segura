create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);

create index if not exists site_visits_path_created_at_idx
  on public.site_visits (path, created_at desc);

alter table public.site_visits enable row level security;

drop policy if exists "Service role manages site visits" on public.site_visits;
create policy "Service role manages site visits"
  on public.site_visits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');