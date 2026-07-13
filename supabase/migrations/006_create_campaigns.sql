create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('mercadolivre', 'shopee', 'shein')),
  title text not null,
  description text,
  coupon_code text,
  campaign_url text not null,
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  source text not null check (source in ('mercadolivre', 'shopee', 'shein')),
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_active_featured_idx
  on public.campaigns (is_active, is_featured, created_at desc);

create index if not exists campaign_clicks_campaign_created_idx
  on public.campaign_clicks (campaign_id, created_at desc);

alter table public.campaigns enable row level security;
alter table public.campaign_clicks enable row level security;

drop policy if exists "Public can read active campaigns" on public.campaigns;
create policy "Public can read active campaigns"
  on public.campaigns
  for select
  using (is_active = true);

drop policy if exists "Service role manages campaigns" on public.campaigns;
create policy "Service role manages campaigns"
  on public.campaigns
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages campaign clicks" on public.campaign_clicks;
create policy "Service role manages campaign clicks"
  on public.campaign_clicks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');