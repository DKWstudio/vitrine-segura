create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('mercadolivre', 'shopee')),
  external_id text not null,
  title text not null,
  description text,
  category text not null,
  price numeric(12, 2) not null check (price >= 0),
  old_price numeric(12, 2) check (old_price is null or old_price >= 0),
  currency text not null default 'BRL',
  image_url text,
  product_url text not null,
  affiliate_url text,
  rating numeric(3, 2) check (rating is null or (rating >= 0 and rating <= 5)),
  reviews_count integer check (reviews_count is null or reviews_count >= 0),
  sold_count integer check (sold_count is null or sold_count >= 0),
  seller_name text,
  seller_reputation text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  score numeric(8, 3) not null default 0,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists public.search_rules (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('mercadolivre', 'shopee')),
  category text not null,
  query text not null,
  min_price numeric(12, 2) check (min_price is null or min_price >= 0),
  max_price numeric(12, 2) check (max_price is null or max_price >= 0),
  min_rating numeric(3, 2) check (min_rating is null or (min_rating >= 0 and min_rating <= 5)),
  max_results integer not null default 20 check (max_results > 0 and max_results <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_price is null or min_price is null or max_price >= min_price)
);

create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  source text not null check (source in ('mercadolivre', 'shopee')),
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists products_active_featured_idx
  on public.products (is_active, is_featured, score desc, created_at desc);

create index if not exists products_category_idx
  on public.products (category, is_active, score desc);

create index if not exists products_source_idx
  on public.products (source, is_active, score desc);

create index if not exists products_price_idx
  on public.products (price)
  where is_active = true;

create index if not exists products_last_checked_idx
  on public.products (last_checked_at);

create index if not exists search_rules_active_idx
  on public.search_rules (is_active, source, category);

create index if not exists clicks_product_created_idx
  on public.clicks (product_id, created_at desc);

create index if not exists clicks_source_created_idx
  on public.clicks (source, created_at desc);

alter table public.products enable row level security;
alter table public.search_rules enable row level security;
alter table public.clicks enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products
  for select
  using (is_active = true);

drop policy if exists "Service role manages products" on public.products;
create policy "Service role manages products"
  on public.products
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages search rules" on public.search_rules;
create policy "Service role manages search rules"
  on public.search_rules
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages clicks" on public.clicks;
create policy "Service role manages clicks"
  on public.clicks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
