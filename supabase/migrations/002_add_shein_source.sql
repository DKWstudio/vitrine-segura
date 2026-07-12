alter table public.products
  drop constraint if exists products_source_check;

alter table public.products
  add constraint products_source_check
  check (source in ('mercadolivre', 'shopee', 'shein'));

alter table public.search_rules
  drop constraint if exists search_rules_source_check;

alter table public.search_rules
  add constraint search_rules_source_check
  check (source in ('mercadolivre', 'shopee', 'shein'));

alter table public.clicks
  drop constraint if exists clicks_source_check;

alter table public.clicks
  add constraint clicks_source_check
  check (source in ('mercadolivre', 'shopee', 'shein'));