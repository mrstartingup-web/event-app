-- ===========================================================================
-- TEST-ONLY LOCAL STUB — DO NOT RUN ON A REAL SUPABASE PROJECT.
--
-- A real Supabase project already has the `auth` and `storage` schemas, the
-- `auth.users` table, the `auth.uid()` function and the `anon` /
-- `authenticated` / `service_role` roles. A plain local PostgreSQL (or one in a
-- throwaway container) has none of them, so `0001_init.sql` cannot be applied
-- there without this file.
--
-- Purpose: let anyone on the team (and CI) prove that the migration and the RLS
-- checks actually run, without touching the owner's project.
--
-- Usage (see BUILD.md → "Verify the SQL locally"):
--   createdb bna_test
--   psql -d bna_test -f supabase/tests/local_stub_supabase.sql
--   psql -d bna_test -f supabase/migrations/0001_init.sql
--   psql -d bna_test -f supabase/tests/rls_check.sql
--
-- This creates no business data and no policies: everything the app relies on
-- comes from supabase/migrations/0001_init.sql.
-- ===========================================================================

-- ------------------------------------------------------------------ roles ---
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login;
  end if;
end
$$;

grant anon, authenticated, service_role to authenticator;

-- ------------------------------------------------------------- auth schema ---
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,              -- real Supabase: varchar(255)
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase's auth.uid(): the JWT `sub` claim, which PostgREST sets via
-- `set_config('request.jwt.claim.sub', ...)`. `true` = missing GUC is not an
-- error, it just means "not signed in".
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
-- auth.users stays server-only, exactly like the real thing.
grant all on auth.users to service_role;

-- ---------------------------------------------------------- storage schema ---
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Supabase's own helper: the folder path parts of an object name, e.g.
-- 'venue-photos/<uid>/<order>/a.jpg' -> {venue-photos,<uid>,<order>}.
-- Copied here because the migration's storage policies use it.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : array_length(parts, 1) - 1];
end;
$$;

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- ------------------------------------------------- default privileges ---------
-- Supabase ships these defaults for the `public` schema, so a table created by a
-- migration is usable through the API and RLS is what filters rows. Reproduced
-- here so the local test exercises the same privilege setup.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
