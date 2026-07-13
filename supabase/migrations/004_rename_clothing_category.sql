update public.products
set category = U&'Vestu\00E1rio e Acess\00F3rios'
where category in (
  U&'Cal\00E7ados, Roupas e Bolsas',
  'Calcados, Roupas e Bolsas',
  U&'Cal\00E7ados Roupas e Bolsas',
  'Calcados Roupas e Bolsas'
);

update public.search_rules
set category = U&'Vestu\00E1rio e Acess\00F3rios'
where category in (
  U&'Cal\00E7ados, Roupas e Bolsas',
  'Calcados, Roupas e Bolsas',
  U&'Cal\00E7ados Roupas e Bolsas',
  'Calcados Roupas e Bolsas'
);