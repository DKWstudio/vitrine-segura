update public.products
set category = U&'Casa e Decora\00E7\00E3o'
where category in (U&'Casa e Constru\00E7\00E3o', 'Casa e Construcao');

update public.search_rules
set category = U&'Casa e Decora\00E7\00E3o'
where category in (U&'Casa e Constru\00E7\00E3o', 'Casa e Construcao');