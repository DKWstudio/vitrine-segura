# Supabase

Este diretorio guarda a estrutura do banco do portal de achadinhos afiliados.

## Aplicar a migration

Pelo painel do Supabase, abra o SQL Editor e execute o arquivo:

```text
supabase/migrations/001_create_affiliate_portal_tables.sql
```

Se estiver usando Supabase CLI em um projeto ja vinculado:

```bash
supabase db push
```

## Seguranca

- `products`: leitura publica apenas para produtos com `is_active = true`.
- `search_rules`: acesso apenas pelo servidor usando `SUPABASE_SERVICE_ROLE_KEY`.
- `clicks`: acesso apenas pelo servidor usando `SUPABASE_SERVICE_ROLE_KEY`.

A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no navegador.
