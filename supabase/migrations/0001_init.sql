-- ===========================================================================
-- Bloom & Aisle Events — 0001_init.sql
-- Full Stage-1 schema: tables, indexes, the one-admin rule, date availability,
-- Row Level Security on every table, and storage buckets + storage policies.
--
-- Target: Supabase (Postgres 15+). Run once, top to bottom, in the Supabase SQL
-- editor or with psql against SUPABASE_DB_URL. See BUILD.md.
--
-- Everything is wrapped in one transaction: if any statement fails, the whole
-- migration rolls back and the database is left untouched, so it is safe to fix
-- and re-run. This file intentionally does NOT create sample content — that is
-- supabase/seed.sql, and it is never applied automatically.
--
-- Two Supabase-only objects are assumed to exist already (they do in every
-- Supabase project, and the local test harness creates them — see
-- supabase/tests/local_stub_supabase.sql):
--   * schema `auth` with table `auth.users` and function `auth.uid()`
--   * schema `storage` with tables `storage.buckets` and `storage.objects`
--     (Row Level Security is already enabled on `storage.objects` there)
-- Roles `anon`, `authenticated` and `service_role` also already exist.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Conventions
-- ---------------------------------------------------------------------------
-- Money is always numeric(10,2) (never float), and always Malaysian Ringgit.
-- Timestamps are timestamptz, default now().
-- Every table has Row Level Security enabled and explicit policies; a table
-- with RLS on and no matching policy denies access.

-- Helper: keep updated_at honest without trusting the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ===========================================================================
-- 1. People and configuration
-- ===========================================================================

-- One row per auth user. Created automatically by the trigger in section 3.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Exactly one row (id = 1). Holds the Planner's email so the signup trigger can
-- decide who is admin. Postgres cannot read a process environment variable, so
-- ADMIN_EMAIL is pushed in here with the service-role key — the exact command
-- is in BUILD.md ("Set the admin email").
create table public.app_config (
  id smallint primary key default 1 check (id = 1),
  admin_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- The single config row always exists, so the signup trigger never has to guess.
-- An empty admin_email means "no admin configured yet": every new signup is a
-- customer until the owner sets it.
insert into public.app_config (id, admin_email) values (1, '')
on conflict (id) do nothing;


-- ===========================================================================
-- 2. Portfolio, catalog
-- ===========================================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  -- Free text on purpose: the owner adds event types ("wedding", "birthday",
  -- "corporate", ...) as the business grows; a check constraint here would need
  -- a migration every time. The UI groups by this value.
  event_type text not null,
  description text,
  event_date date,
  -- Storage path inside the public `portfolio` bucket, e.g.
  -- "portfolio/<project-id>/cover.jpg". Full URL is built in the UI.
  cover_image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index projects_event_type_idx on public.projects (event_type);
create index projects_sort_order_idx on public.projects (sort_order, created_at desc);

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index project_photos_project_id_idx on public.project_photos (project_id);
create index project_photos_order_idx on public.project_photos (project_id, sort_order);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price_myr numeric(10, 2) not null default 0 check (price_myr >= 0),
  description text,
  -- Product photo, public `catalog` bucket.
  image_path text,
  -- Transparent-background PNG the Stage-3 decoration editor drags onto the
  -- venue photo. Public `catalog` bucket; nullable until the owner uploads one.
  cutout_png_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index catalog_items_category_idx on public.catalog_items (category);
create index catalog_items_sort_order_idx on public.catalog_items (sort_order, created_at desc);
create index catalog_items_available_idx on public.catalog_items (is_available);


-- ===========================================================================
-- 3. Orders, their photos, designs
-- ===========================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  event_date date not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Quoted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')),
  notes text,
  contact_number text,
  -- Set by the Planner at the Quoted stage; may differ from the editor estimate.
  quoted_price_myr numeric(10, 2) check (quoted_price_myr is null or quoted_price_myr >= 0),
  -- The saved design this order was placed from (optional; nullable until the
  -- Stage-3 editor saves one). FK added after `designs` exists (circular ref).
  design_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_design_id_idx on public.orders (design_id);
create index orders_status_event_date_idx on public.orders (status, event_date);
create index orders_event_date_idx on public.orders (event_date);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  -- A design can be saved before an order exists (customer experiments in the
  -- editor), so this is nullable.
  order_id uuid references public.orders (id) on delete set null,
  -- Stage-3 editor state: background photo, item id, x, y, scale, rotation,
  -- z-index per layer, etc. Shape is the editor's business, not the DB's.
  canvas_json jsonb,
  preview_path text,
  created_at timestamptz not null default now()
);

create index designs_customer_id_idx on public.designs (customer_id);
create index designs_order_id_idx on public.designs (order_id);

alter table public.orders
  add constraint orders_design_id_fkey
  foreign key (design_id) references public.designs (id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- History must survive the owner retiring an item, so deleting a catalog item
  -- nulls this out instead of deleting the order line.
  catalog_item_id uuid references public.catalog_items (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_myr numeric(10, 2) not null default 0 check (unit_price_myr >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_catalog_item_id_idx on public.order_items (catalog_item_id);

create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index venue_photos_order_id_idx on public.venue_photos (order_id);


-- ===========================================================================
-- 4. Reviews  (one per order, only after the order is Completed)
-- ===========================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  photo_path text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_customer_id_idx on public.reviews (customer_id);
create index reviews_visible_idx on public.reviews (is_hidden, created_at desc);
-- reviews.order_id is already indexed by its unique constraint.


-- ===========================================================================
-- 5. Chat and notifications
-- ===========================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- One conversation per customer, ever (customer_id is unique).
  customer_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- conversations.customer_id is already indexed by its unique constraint.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  attachment_path text,
  read_by_customer_at timestamptz,
  read_by_admin_at timestamptz,
  created_at timestamptz not null default now(),
  -- A message must carry something.
  constraint messages_body_or_attachment check (body is not null or attachment_path is not null)
);

create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_conversation_recent_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_idx on public.messages (sender_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'new_order' | 'quote_sent' | 'quote_accepted' | 'quote_declined' |
  -- 'status_change' | 'new_message' | 'new_review' | ... free text on purpose.
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_user_recent_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;


-- ===========================================================================
-- 6. The one-admin rule
-- ===========================================================================

-- A signup creates the profile row. Role is 'admin' only when the new email
-- matches app_config.admin_email (case-insensitive). SECURITY DEFINER so it can
-- write into public.profiles even though the signing-up user has no grants yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  configured_admin_email text;
begin
  select lower(btrim(admin_email)) into configured_admin_email
  from public.app_config where id = 1;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    case
      when configured_admin_email is not null
        and configured_admin_email <> ''
        and lower(btrim(new.email)) = configured_admin_email
      then 'admin'
      else 'customer'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can change a role through the API — not a customer promoting
-- themselves, and not a stolen service-role key either. A role change is only
-- possible from a direct database connection (the owner's SQL editor), which is
-- exactly the level of access needed to fix a mistake.
--
-- Not SECURITY DEFINER on purpose: we need `current_user` to be the *caller*
-- (anon / authenticated / service_role), which is what the check reads.
create or replace function public.enforce_profiles_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    if current_user in ('anon', 'authenticated', 'service_role')
       or nullif(current_setting('request.jwt.claim.role', true), '') is not null
    then
      raise exception
        'profiles.role cannot be changed through the API (% -> %). Roles are set once, at signup, from app_config.admin_email.',
        old.role, new.role
        using errcode = '42501';
    end if;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profiles.id cannot be changed.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_profiles_role_immutable();


-- ===========================================================================
-- 7. Date availability  (SPEC section 6)
-- ===========================================================================

-- Reasons are private to the Planner: only the admin ever reads this table
-- (see RLS section; there is deliberately no customer policy for it).
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

-- Customers must never see why a date is unavailable, or any other customer's
-- booking — only a bare list of date values. The view runs with its owner's
-- privileges (PostgreSQL 15+ default: security_invoker = false), so it can read
-- blocked_dates and orders while the caller cannot. Granted to anon and
-- authenticated below.
create or replace view public.unavailable_dates as
  select blocked.date
  from public.blocked_dates as blocked
  union
  select orders.event_date as date
  from public.orders
  where orders.status in ('Confirmed', 'In Progress');

comment on view public.unavailable_dates is
  'Public list of dates the Planner cannot take. Date values only - never a reason, never customer data. Includes blocked dates and dates with a Confirmed or In Progress order.';

-- Same rule, callable from the orders trigger below.
create or replace function public.date_is_available(candidate date)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.blocked_dates b where b.date = candidate
    union all
    select 1 from public.orders o
    where o.event_date = candidate and o.status in ('Confirmed', 'In Progress')
  );
$$;

-- Server-side enforcement: even a hand-crafted API call is rejected.
--  * INSERT: the chosen date must not be blocked and must not already carry a
--    Confirmed / In Progress order.
--  * UPDATE: checked when the date moves or when the order enters a
--    Confirmed / In Progress state (an unrelated edit to an old pending order
--    on a since-blocked date must not be rejected).
create or replace function public.enforce_order_date_available()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  must_check boolean;
begin
  if tg_op = 'INSERT' then
    must_check := true;
  else
    must_check := (new.event_date is distinct from old.event_date)
               or (new.status is distinct from old.status);
  end if;

  if must_check then
    if exists (select 1 from public.blocked_dates b where b.date = new.event_date) then
      raise exception 'That date is not available. Please choose another date.'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from public.orders o
      where o.event_date = new.event_date
        and o.status in ('Confirmed', 'In Progress')
        and o.id is distinct from new.id
    ) then
      raise exception 'That date is already booked. Please choose another date.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_date_available on public.orders;
create trigger orders_enforce_date_available
  before insert or update on public.orders
  for each row execute function public.enforce_order_date_available();

-- Backstop for the "one event per day" rule: even two simultaneous
-- confirmations cannot both land on the same date.
create unique index orders_one_active_per_date_idx
  on public.orders (event_date)
  where status in ('Confirmed', 'In Progress');


-- ===========================================================================
-- 8. Row Level Security
-- ===========================================================================
-- Enabled on EVERY table below, with explicit policies. The rule of thumb:
--   * anonymous visitors read portfolio, catalog (available only) and public
--     reviews;
--   * a customer reaches only rows that are theirs;
--   * the admin (public.is_admin()) reaches everything;
--   * blocked_dates has no customer policy at all.
-- Supabase's default privileges already grant table privileges to anon /
-- authenticated / service_role, and RLS is what filters the rows — so do NOT
-- revoke privileges from `authenticated`: the Planner signs in through the API
-- as `authenticated` and is allowed by the admin policies.

-- Security-definer helper. STABLE so it can be called per statement, and
-- SECURITY DEFINER so it can read public.profiles without recursing through
-- profiles' own RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant select on public.unavailable_dates to anon, authenticated;
grant execute on function public.date_is_available(date) to anon, authenticated;

alter table public.profiles            enable row level security;
alter table public.app_config          enable row level security;
alter table public.projects            enable row level security;
alter table public.project_photos      enable row level security;
alter table public.catalog_items       enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.venue_photos        enable row level security;
alter table public.designs             enable row level security;
alter table public.reviews             enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.notifications       enable row level security;
alter table public.blocked_dates       enable row level security;

-- ---------------------------------------------------------------- profiles --
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Customers need the Planner's name (chat, reviews), but never another
-- customer's profile.
drop policy if exists profiles_select_admin_row on public.profiles;
create policy profiles_select_admin_row on public.profiles
  for select to anon, authenticated
  using (role = 'admin');

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and role = 'customer');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
  -- Note: role changes are blocked by the profiles_role_immutable trigger.

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------- app_config --
-- Admin only: it holds the Planner's email. Not readable by customers.
drop policy if exists app_config_admin_all on public.app_config;
create policy app_config_admin_all on public.app_config
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- projects --
drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (true);

drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------- project_photos --
drop policy if exists project_photos_public_read on public.project_photos;
create policy project_photos_public_read on public.project_photos
  for select to anon, authenticated
  using (true);

drop policy if exists project_photos_admin_all on public.project_photos;
create policy project_photos_admin_all on public.project_photos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------- catalog_items --
-- Customers see available items only; the admin sees and manages everything.
drop policy if exists catalog_items_public_read on public.catalog_items;
create policy catalog_items_public_read on public.catalog_items
  for select to anon, authenticated
  using (is_available);

drop policy if exists catalog_items_admin_all on public.catalog_items;
create policy catalog_items_admin_all on public.catalog_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------ orders --
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()));

-- A customer opens an order as Pending, with no price: the status flow and the
-- quote belong to the Planner.
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'Pending'
    and quoted_price_myr is null
  );

-- Updates are additionally constrained by the order_customer_guard trigger
-- (status may only become 'Cancelled', or 'Confirmed' from 'Quoted').
drop policy if exists orders_update_own on public.orders;
create policy orders_update_own on public.orders
  for update to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A customer may not rewrite the Planner's decision on their own order.
-- Not SECURITY DEFINER: `current_user` must be the caller.
create or replace function public.enforce_order_customer_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.status is distinct from old.status then
      if not (
        (new.status = 'Cancelled' and old.status in ('Pending', 'Quoted', 'Confirmed', 'In Progress'))
        or (old.status = 'Quoted' and new.status = 'Confirmed')
      ) then
        raise exception
          'A customer may accept a quote (Quoted -> Confirmed) or cancel an order that is not completed. Other status changes are the Planner''s (% -> %).',
          old.status, new.status
          using errcode = '42501';
      end if;
    end if;

    if new.quoted_price_myr is distinct from old.quoted_price_myr then
      raise exception 'Only the Planner can set the quoted price.'
        using errcode = '42501';
    end if;

    if new.customer_id is distinct from old.customer_id then
      raise exception 'An order cannot be handed to another customer.'
        using errcode = '42501';
    end if;

    if new.event_date is distinct from old.event_date then
      raise exception 'The event date cannot be changed from here. Cancel this order and place a new one.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_customer_guard on public.orders;
create trigger orders_customer_guard
  before update on public.orders
  for each row execute function public.enforce_order_customer_immutable_fields();

-- ------------------------------------------------------------- order_items --
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists order_items_write_own on public.order_items;
create policy order_items_write_own on public.order_items
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
      and o.status not in ('Completed', 'Cancelled')
  ));

drop policy if exists order_items_update_own on public.order_items;
create policy order_items_update_own on public.order_items
  for update to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
      and o.status not in ('Completed', 'Cancelled')
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
      and o.status not in ('Completed', 'Cancelled')
  ));

drop policy if exists order_items_delete_own on public.order_items;
create policy order_items_delete_own on public.order_items
  for delete to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
      and o.status not in ('Completed', 'Cancelled')
  ));

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------ venue_photos --
drop policy if exists venue_photos_select_own on public.venue_photos;
create policy venue_photos_select_own on public.venue_photos
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = venue_photos.order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists venue_photos_insert_own on public.venue_photos;
create policy venue_photos_insert_own on public.venue_photos
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = venue_photos.order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists venue_photos_delete_own on public.venue_photos;
create policy venue_photos_delete_own on public.venue_photos
  for delete to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = venue_photos.order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists venue_photos_admin_all on public.venue_photos;
create policy venue_photos_admin_all on public.venue_photos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------- designs --
drop policy if exists designs_select_own on public.designs;
create policy designs_select_own on public.designs
  for select to authenticated
  using (customer_id = (select auth.uid()));

-- The customer owns the design; if it is attached to an order, the order must
-- be theirs too.
drop policy if exists designs_insert_own on public.designs;
create policy designs_insert_own on public.designs
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = designs.order_id and o.customer_id = (select auth.uid())
      )
    )
  );

drop policy if exists designs_update_own on public.designs;
create policy designs_update_own on public.designs
  for update to authenticated
  using (customer_id = (select auth.uid()))
  with check (
    customer_id = (select auth.uid())
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = designs.order_id and o.customer_id = (select auth.uid())
      )
    )
  );

drop policy if exists designs_delete_own on public.designs;
create policy designs_delete_own on public.designs
  for delete to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists designs_admin_all on public.designs;
create policy designs_admin_all on public.designs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------- reviews --
-- Public: visible reviews only.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (is_hidden = false);

-- A customer sees their own review even if the Planner hid it.
drop policy if exists reviews_select_own on public.reviews;
create policy reviews_select_own on public.reviews
  for select to authenticated
  using (customer_id = (select auth.uid()));

-- One review per order, only for the customer's own Completed order.
drop policy if exists reviews_insert_own_completed on public.reviews;
create policy reviews_insert_own_completed on public.reviews
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'Completed'
    )
  );

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all on public.reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------- conversations --
drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own on public.conversations
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own on public.conversations
  for insert to authenticated
  with check (customer_id = (select auth.uid()));

drop policy if exists conversations_admin_all on public.conversations;
create policy conversations_admin_all on public.conversations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- messages --
drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.customer_id = (select auth.uid())
  ));

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.customer_id = (select auth.uid())
    )
  );

-- Needed to mark the other side's messages as read; the trigger below stops a
-- customer editing text they did not send.
drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.customer_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.customer_id = (select auth.uid())
  ));

drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all on public.messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A customer may only touch the read receipts on their conversation's messages.
create or replace function public.enforce_message_customer_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.body is distinct from old.body
       or new.attachment_path is distinct from old.attachment_path
       or new.sender_id is distinct from old.sender_id
       or new.conversation_id is distinct from old.conversation_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'A sent message cannot be edited. Only read receipts may change.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_customer_guard on public.messages;
create trigger messages_customer_guard
  before update on public.messages
  for each row execute function public.enforce_message_customer_immutable_fields();

-- ----------------------------------------------------------- notifications --
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the admin (or server-side code with the service-role key) creates them.
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.enforce_notification_customer_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.kind is distinct from old.kind
       or new.payload is distinct from old.payload
       or new.user_id is distinct from old.user_id
    then
      raise exception 'Only the read state of a notification may change.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_customer_guard on public.notifications;
create trigger notifications_customer_guard
  before update on public.notifications
  for each row execute function public.enforce_notification_customer_immutable_fields();

-- ------------------------------------------------------------ blocked_dates --
-- Admin only. There is deliberately NO customer policy on this table: the only
-- thing a customer may learn is the date list from public.unavailable_dates.
drop policy if exists blocked_dates_admin_all on public.blocked_dates;
create policy blocked_dates_admin_all on public.blocked_dates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------- storage (buckets) --
-- Buckets are created here so a fresh project needs no dashboard clicking.
-- Row Level Security is already enabled on storage.objects by Supabase, so we
-- only add policies.
--
-- PATH CONVENTION — storage.objects.name is relative to the bucket (the bucket
-- is `bucket_id`, never part of `name`), and every *_path column in this schema
-- stores that same bucket-relative name, so a value can be handed straight to
-- supabase.storage.from('<bucket>').getPublicUrl(path):
--   portfolio/       <project-id>/<file>                 public read
--   catalog/         <item-id>/<file>                    public read
--   venue-photos/    <customer-id>/<order-id>/<file>     private, owner + admin
--   design-previews/ <customer-id>/<file>                private, owner + admin
--   chat-attachments/<customer-id>/<file>                private, owner + admin
-- The first folder of a private object must be the owning customer's user id:
-- that is what the policies below check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio', 'portfolio', true, 10485760,
   '{image/jpeg,image/png,image/webp,image/avif}'),
  ('catalog', 'catalog', true, 10485760,
   '{image/jpeg,image/png,image/webp,image/avif}'),
  ('venue-photos', 'venue-photos', false, 15728640,
   '{image/jpeg,image/png,image/webp,image/avif}'),
  ('design-previews', 'design-previews', false, 10485760,
   '{image/jpeg,image/png,image/webp}'),
  ('chat-attachments', 'chat-attachments', false, 10485760,
   '{image/jpeg,image/png,image/webp,application/pdf}')
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets: anybody may read; only the admin may write.
drop policy if exists storage_public_buckets_read on storage.objects;
create policy storage_public_buckets_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('portfolio', 'catalog'));

drop policy if exists storage_public_buckets_admin_insert on storage.objects;
create policy storage_public_buckets_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('portfolio', 'catalog') and public.is_admin());

drop policy if exists storage_public_buckets_admin_update on storage.objects;
create policy storage_public_buckets_admin_update on storage.objects
  for update to authenticated
  using (bucket_id in ('portfolio', 'catalog') and public.is_admin())
  with check (bucket_id in ('portfolio', 'catalog') and public.is_admin());

drop policy if exists storage_public_buckets_admin_delete on storage.objects;
create policy storage_public_buckets_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('portfolio', 'catalog') and public.is_admin());

-- Private buckets: the owning customer (first path segment = their user id)
-- and the admin.
drop policy if exists storage_private_buckets_owner_read on storage.objects;
create policy storage_private_buckets_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('venue-photos', 'design-previews', 'chat-attachments')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists storage_private_buckets_owner_insert on storage.objects;
create policy storage_private_buckets_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('venue-photos', 'design-previews', 'chat-attachments')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists storage_private_buckets_owner_update on storage.objects;
create policy storage_private_buckets_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('venue-photos', 'design-previews', 'chat-attachments')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('venue-photos', 'design-previews', 'chat-attachments')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists storage_private_buckets_owner_delete on storage.objects;
create policy storage_private_buckets_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('venue-photos', 'design-previews', 'chat-attachments')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- The Planner reads and cleans up every private object.
drop policy if exists storage_admin_all on storage.objects;
create policy storage_admin_all on storage.objects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;

-- ===========================================================================
-- After this migration, set the admin email (replace with the real address):
--
--   update public.app_config set admin_email = 'planner@example.com' where id = 1;
--
-- The Planner can then sign up normally at /signup and the trigger gives that
-- one account the admin role. See BUILD.md for the service-role route.
-- ===========================================================================
