-- ===========================================================================
-- RLS CHECK — proof that Row Level Security does what the spec says.
--
-- Runs top to bottom in ONE transaction, creates two customers, the admin, and
-- a little data for each — then rolls the whole thing back. It leaves nothing
-- behind and touches no real data.
--
-- How to run:
--   * locally, against a throwaway database (see BUILD.md → "Verify the SQL
--     locally"): after local_stub_supabase.sql and 0001_init.sql,
--        psql "$SUPABASE_DB_URL" -f supabase/tests/rls_check.sql
--   * or open it in the Supabase SQL editor and run it (a real project already
--     has the auth/storage schemas the migration needs).
--
-- Every check prints PASS or raises an exception. Nothing is "checked by
-- looking" — a failing check aborts the script.
--
-- How it fakes a signed-in user without Supabase Auth:
--   set local role authenticated;                      -- the API role
--   select set_config('request.jwt.claim.sub', '<uuid>', true);  -- the JWT sub
--   ...which is exactly what auth.uid() reads. anon = no sub.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Fixtures, as the database owner (RLS does not apply to it).
-- ---------------------------------------------------------------------------
-- alice  = 11111111-1111-1111-1111-111111111111  (customer)
-- bob    = 22222222-2222-2222-2222-222222222222  (customer)
-- admin  = 33333333-3333-3333-3333-333333333333  (the Planner, role admin)

-- The admin email must be in place BEFORE the admin signs up: this is exactly
-- how the one-admin rule is meant to work.
update public.app_config set admin_email = 'planner@example.com' where id = 1;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com',  '{"full_name":"Alice Tan","phone":"60111111111"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',    '{"full_name":"Bob Lim","phone":"60222222222"}'),
  ('33333333-3333-3333-3333-333333333333', 'planner@example.com','{"full_name":"The Planner"}');

-- Orders. Dates are far future so the script never collides with real data.
insert into public.orders (id, customer_id, event_type, event_date, status, notes, contact_number, quoted_price_myr) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'wedding',  '2030-06-01', 'Pending',   'Alice pending order',  '60111111111', null),
  ('aaaaaaa1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'birthday', '2030-06-04', 'Completed', 'Alice completed order','60111111111', 2500.00),
  ('bbbbbbb2-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'corporate','2030-06-02', 'Pending',   'Bob pending order',    '60222222222', null),
  ('bbbbbbb2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'wedding',  '2030-06-03', 'Completed', 'Bob completed order',  '60222222222', 4800.00),
  ('bbbbbbb2-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'wedding',  '2030-07-01', 'Confirmed', 'Bob confirmed order',  '60222222222', 5200.00);

insert into public.designs (id, customer_id, order_id, canvas_json, preview_path) values
  ('ddddddd1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-0000-0000-0000-000000000001', '{"layers":[]}', '11111111-1111-1111-1111-111111111111/one.png'),
  ('ddddddd2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbbbbb2-0000-0000-0000-000000000001', '{"layers":[]}', '22222222-2222-2222-2222-222222222222/two.png');

insert into public.venue_photos (order_id, storage_path) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111/aaaaaaa1-0000-0000-0000-000000000001/hall.jpg'),
  ('bbbbbbb2-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222/bbbbbbb2-0000-0000-0000-000000000001/hall.jpg');

insert into public.conversations (id, customer_id) values
  ('ccccccc1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('ccccccc2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');

insert into public.messages (conversation_id, sender_id, body) values
  ('ccccccc1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Hi, is my date free? (Alice private)'),
  ('ccccccc1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Let me check.'),
  ('ccccccc2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Hello, Bob here.'),
  ('ccccccc2-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Hello Bob, how can I help?');

-- A visible review (Bob, completed order) and a hidden one (Alice's).
insert into public.reviews (order_id, customer_id, rating, body, is_hidden) values
  ('bbbbbbb2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 5, 'Bob public review', false),
  ('aaaaaaa1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2, 'Alice hidden review', true);

-- A private blocked date, with a reason customers must never learn.
insert into public.blocked_dates (date, reason) values ('2030-08-01', 'Personal leave - PRIVATE');

-- Storage objects, to prove the storage policies too.
insert into storage.objects (bucket_id, name) values
  ('portfolio', 'sample-project/cover.jpg'),
  ('venue-photos', '11111111-1111-1111-1111-111111111111/aaaaaaa1-0000-0000-0000-000000000001/hall.jpg'),
  ('venue-photos', '22222222-2222-2222-2222-222222222222/bbbbbbb2-0000-0000-0000-000000000001/hall.jpg');

-- Sanity: the trigger really did make one admin and two customers.
do $$
declare
  admin_role text;
  customer_count integer;
begin
  select role into admin_role from public.profiles where id = '33333333-3333-3333-3333-333333333333';
  select count(*) into customer_count from public.profiles where role = 'customer';

  if admin_role <> 'admin' then
    raise exception 'FAIL: ADMIN_EMAIL in app_config did not produce an admin (role = %)', admin_role;
  end if;
  if customer_count <> 2 then
    raise exception 'FAIL: expected 2 customers, found %', customer_count;
  end if;

  raise notice 'PASS  one-admin rule: exactly 1 admin (the ADMIN_EMAIL account) + % customers', customer_count;
end
$$;


-- ===========================================================================
-- 1. ANONYMOUS VISITOR (not signed in)
-- ===========================================================================
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  n integer;
  date_count integer;
  view_columns integer;
begin
  -- May NOT read any customer data.
  select count(*) into n from public.orders;
  if n <> 0 then raise exception 'LEAK: anon read % rows of orders', n; end if;
  raise notice 'PASS  anon: 0 rows from orders';

  select count(*) into n from public.designs;
  if n <> 0 then raise exception 'LEAK: anon read % rows of designs', n; end if;
  raise notice 'PASS  anon: 0 rows from designs';

  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'LEAK: anon read % rows of messages', n; end if;
  raise notice 'PASS  anon: 0 rows from messages';

  select count(*) into n from public.venue_photos;
  if n <> 0 then raise exception 'LEAK: anon read % rows of venue_photos', n; end if;
  raise notice 'PASS  anon: 0 rows from venue_photos';

  select count(*) into n from public.conversations;
  if n <> 0 then raise exception 'LEAK: anon read % rows of conversations', n; end if;
  raise notice 'PASS  anon: 0 rows from conversations';

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'LEAK: anon saw % profiles (expected only the admin profile)', n; end if;
  raise notice 'PASS  anon: sees only the admin profile (the Planner''s name), no customers';

  -- May NOT read blocked dates, even indirectly.
  select count(*) into n from public.blocked_dates;
  if n <> 0 then raise exception 'LEAK: anon read % rows of blocked_dates', n; end if;
  raise notice 'PASS  anon: 0 rows from blocked_dates (reasons stay private)';

  -- MAY read the date list — and nothing else about it.
  select count(*) into date_count from public.unavailable_dates;
  if date_count <> 2 then
    raise exception 'FAIL: anon expected 2 unavailable dates, got %', date_count;
  end if;

  select count(*) into view_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'unavailable_dates';
  if view_columns <> 1 then
    raise exception 'FAIL: unavailable_dates exposes % columns; it must expose only the date', view_columns;
  end if;
  raise notice 'PASS  anon: unavailable_dates returns % dates, one column, no reasons', date_count;

  -- Hidden reviews stay hidden.
  select count(*) into n from public.reviews;
  if n <> 1 then raise exception 'FAIL: anon saw % reviews (expected only the 1 visible one)', n; end if;
  raise notice 'PASS  anon: sees visible reviews only (% of 2)', n;
end
$$;


-- ===========================================================================
-- 2. BOB — a signed-in customer
-- ===========================================================================
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  n integer;
begin
  -- Own rows only.
  select count(*) into n from public.orders;
  if n <> 3 then raise exception 'FAIL: Bob should see his own 3 orders, saw %', n; end if;
  raise notice 'PASS  bob: sees his own 3 orders';

  select count(*) into n from public.orders where customer_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'LEAK: Bob read % of Alice''s orders', n; end if;
  raise notice 'PASS  bob: 0 of Alice''s orders';

  select count(*) into n from public.orders where id = 'aaaaaaa1-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'LEAK: Bob read Alice''s order by primary key'; end if;
  raise notice 'PASS  bob: Alice''s order is invisible even when queried by id';

  select count(*) into n from public.designs where customer_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'LEAK: Bob read % of Alice''s designs', n; end if;
  select count(*) into n from public.designs;
  if n <> 1 then raise exception 'FAIL: Bob should see his own 1 design, saw %', n; end if;
  raise notice 'PASS  bob: sees his own design, none of Alice''s';

  select count(*) into n from public.venue_photos where order_id = 'aaaaaaa1-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'LEAK: Bob read Alice''s venue photos'; end if;
  select count(*) into n from public.venue_photos;
  if n <> 1 then raise exception 'FAIL: Bob should see his own 1 venue photo, saw %', n; end if;
  raise notice 'PASS  bob: sees his own venue photos, none of Alice''s';

  select count(*) into n from public.messages where conversation_id = 'ccccccc1-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'LEAK: Bob read % of Alice''s messages', n; end if;
  select count(*) into n from public.messages;
  if n <> 2 then raise exception 'FAIL: Bob should see his own 2 messages, saw %', n; end if;
  raise notice 'PASS  bob: sees his own conversation (2 messages), none of Alice''s';

  select count(*) into n from public.conversations;
  if n <> 1 then raise exception 'FAIL: Bob should see his own 1 conversation, saw %', n; end if;
  raise notice 'PASS  bob: sees only his own conversation';

  select count(*) into n from public.blocked_dates;
  if n <> 0 then raise exception 'LEAK: Bob read % rows of blocked_dates', n; end if;
  raise notice 'PASS  bob: 0 rows from blocked_dates';

  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'LEAK: Bob saw % profiles (his own + the admin only)', n; end if;
  raise notice 'PASS  bob: sees his own profile and the Planner''s, no other customer';

  select count(*) into n from public.reviews;
  if n <> 1 then raise exception 'FAIL: Bob saw % reviews (expected only the visible one)', n; end if;
  raise notice 'PASS  bob: sees public reviews only (Alice''s hidden review stays hidden)';

  -- Cannot write into another customer''s order.
  begin
    update public.orders set notes = 'hacked by bob'
    where customer_id = '11111111-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'LEAK: Bob updated % of Alice''s orders', n; end if;
    raise notice 'PASS  bob: updating Alice''s order changed 0 rows';

    delete from public.orders where customer_id = '11111111-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'LEAK: Bob deleted % of Alice''s orders', n; end if;
    raise notice 'PASS  bob: deleting Alice''s order removed 0 rows';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: writing to Alice''s order is refused outright (%)', sqlerrm;
  end;

  -- Cannot open an order in someone else''s name, nor with a status/price.
  begin
    insert into public.orders (customer_id, event_type, event_date, status)
    values ('11111111-1111-1111-1111-111111111111', 'wedding', '2030-09-09', 'Pending');
    raise exception 'LEAK: Bob created an order for Alice';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot create an order for another customer';
  end;

  begin
    insert into public.orders (customer_id, event_type, event_date, status)
    values ('22222222-2222-2222-2222-222222222222', 'wedding', '2030-09-09', 'Confirmed');
    raise exception 'LEAK: Bob created an order that is already Confirmed';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot create an order with status other than Pending';
  end;

  begin
    insert into public.orders (customer_id, event_type, event_date, quoted_price_myr)
    values ('22222222-2222-2222-2222-222222222222', 'wedding', '2030-09-09', 100.00);
    raise exception 'LEAK: Bob set his own quoted price';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot set the quoted price on a new order';
  end;

  -- Cannot change his own order''s status or price.
  begin
    update public.orders set status = 'Confirmed'
    where id = 'bbbbbbb2-0000-0000-0000-000000000001';
    raise exception 'LEAK: Bob confirmed his own Pending order';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot move his Pending order to Confirmed';
  end;

  begin
    update public.orders set quoted_price_myr = 1.00
    where id = 'bbbbbbb2-0000-0000-0000-000000000001';
    raise exception 'LEAK: Bob set the quoted price on his own order';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot set the quoted price on his own order';
  end;

  begin
    update public.orders set event_date = '2030-09-10'
    where id = 'bbbbbbb2-0000-0000-0000-000000000001';
    raise exception 'LEAK: Bob moved his own event date';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot move his own event date';
  end;

  -- A customer CAN cancel his own not-completed order (SPEC feature 5).
  begin
    update public.orders set status = 'Cancelled'
    where id = 'bbbbbbb2-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL: Bob could not cancel his own Pending order'; end if;
    raise notice 'PASS  bob: can cancel his own Pending order';
    raise exception 'rollback this cancel' using errcode = 'P0002';
  exception
    when sqlstate 'P0002' then
      raise notice 'PASS  bob: (cancel rolled back to keep the fixture intact)';
  end;

  -- Cannot promote himself, and cannot rename his way into another profile.
  begin
    update public.profiles set role = 'admin'
    where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'LEAK: Bob promoted himself to admin';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot change his own role (%)', sqlerrm;
  end;

  begin
    update public.profiles set full_name = 'renamed'
    where id = '11111111-1111-1111-1111-111111111111';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'LEAK: Bob edited Alice''s profile'; end if;
    raise notice 'PASS  bob: editing another profile changed 0 rows';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: editing another profile is refused';
  end;

  -- Cannot review an order that is not Completed.
  begin
    insert into public.reviews (order_id, customer_id, rating, body)
    values ('bbbbbbb2-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 5, 'too early');
    raise exception 'LEAK: Bob reviewed a non-Completed order';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot review an order that is not Completed';
  end;

  -- Cannot edit a message he did not send (only read receipts).
  begin
    update public.messages set body = 'rewritten' where sender_id = '33333333-3333-3333-3333-333333333333';
    raise exception 'LEAK: Bob edited the Planner''s message';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot edit the Planner''s message';
  end;
end
$$;

-- Storage: Bob reads/writes only under his own user-id folder.
do $$
declare
  n integer;
begin
  select count(*) into n from storage.objects
  where bucket_id = 'venue-photos' and name like '11111111%';
  if n <> 0 then raise exception 'LEAK: Bob read Alice''s storage object'; end if;
  raise notice 'PASS  bob: 0 of Alice''s private storage objects';

  select count(*) into n from storage.objects where bucket_id = 'venue-photos';
  if n <> 1 then raise exception 'FAIL: Bob should see his own 1 private object, saw %', n; end if;
  raise notice 'PASS  bob: reads his own private object';

  select count(*) into n from storage.objects where bucket_id = 'portfolio';
  if n <> 1 then raise exception 'FAIL: Bob should read the public portfolio bucket'; end if;
  raise notice 'PASS  bob: reads the public portfolio bucket';

  begin
    insert into storage.objects (bucket_id, name)
    values ('venue-photos', '11111111-1111-1111-1111-111111111111/upload-by-bob.jpg');
    raise exception 'LEAK: Bob uploaded into Alice''s folder';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot upload into another customer''s folder';
  end;

  begin
    insert into storage.objects (bucket_id, name)
    values ('portfolio', 'upload-by-bob.jpg');
    raise exception 'LEAK: Bob wrote into the public portfolio bucket';
  exception
    when insufficient_privilege then
      raise notice 'PASS  bob: cannot write into a public bucket (admin only)';
  end;
end
$$;


-- ===========================================================================
-- 3. ALICE — the other customer, same checks the other way round
-- ===========================================================================
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

do $$
declare
  n integer;
begin
  select count(*) into n from public.orders;
  if n <> 2 then raise exception 'FAIL: Alice should see her own 2 orders, saw %', n; end if;
  raise notice 'PASS  alice: sees her own 2 orders';

  select count(*) into n from public.orders where customer_id = '22222222-2222-2222-2222-222222222222';
  if n <> 0 then raise exception 'LEAK: Alice read % of Bob''s orders', n; end if;
  raise notice 'PASS  alice: 0 of Bob''s orders';

  select count(*) into n from public.messages;
  if n <> 2 then raise exception 'FAIL: Alice should see her own 2 messages, saw %', n; end if;
  raise notice 'PASS  alice: sees her own conversation only';

  select count(*) into n from public.venue_photos;
  if n <> 1 then raise exception 'FAIL: Alice should see her own 1 venue photo, saw %', n; end if;
  raise notice 'PASS  alice: sees her own venue photo only';

  select count(*) into n from public.designs;
  if n <> 1 then raise exception 'FAIL: Alice should see her own 1 design, saw %', n; end if;
  raise notice 'PASS  alice: sees her own design only';

  -- Her own review is visible to her even though the Planner hid it.
  select count(*) into n from public.reviews;
  if n <> 2 then raise exception 'FAIL: Alice should see both reviews (hers + the public one), saw %', n; end if;
  raise notice 'PASS  alice: sees her own hidden review (and the public one)';
end
$$;


-- ===========================================================================
-- 4. THE ADMIN (the Planner)
-- ===========================================================================
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

do $$
declare
  n integer;
begin
  select count(*) into n from public.orders;
  if n <> 5 then raise exception 'FAIL: the admin should see all 5 orders, saw %', n; end if;
  raise notice 'PASS  admin: sees every order (% of 5)', n;

  select count(*) into n from public.profiles;
  if n <> 3 then raise exception 'FAIL: the admin should see all 3 profiles, saw %', n; end if;
  raise notice 'PASS  admin: sees every profile';

  select count(*) into n from public.blocked_dates where reason = 'Personal leave - PRIVATE';
  if n <> 1 then raise exception 'FAIL: the admin cannot see the blocked-date reason'; end if;
  raise notice 'PASS  admin: sees blocked dates *with* their private reasons';

  select count(*) into n from public.venue_photos;
  if n <> 2 then raise exception 'FAIL: the admin should see both customers'' venue photos, saw %', n; end if;
  select count(*) into n from public.messages;
  if n <> 4 then raise exception 'FAIL: the admin should see all 4 messages, saw %', n; end if;
  raise notice 'PASS  admin: sees both customers'' photos (2) and messages (4)';

  select count(*) into n from public.reviews;
  if n <> 2 then raise exception 'FAIL: the admin should see every review including hidden ones, saw %', n; end if;
  raise notice 'PASS  admin: sees every review, including the hidden one';
end
$$;

-- The admin can do the things customers cannot: quote a price, and move status.
do $$
declare
  n integer;
begin
  update public.orders
     set status = 'Quoted', quoted_price_myr = 3300.00
   where id = 'bbbbbbb2-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the admin could not quote an order'; end if;
  raise notice 'PASS  admin: set status Quoted and a quoted price';

  insert into public.blocked_dates (date, reason) values ('2030-08-02', 'Fully booked - PRIVATE');
  raise notice 'PASS  admin: blocked a date';

  insert into storage.objects (bucket_id, name)
  values ('portfolio', 'managed-by-admin/cover.jpg');
  raise notice 'PASS  admin: uploaded to the public portfolio bucket';
end
$$;


-- ===========================================================================
-- 5. THE DATE RULE (SPEC section 6) — enforced in the database
-- ===========================================================================
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

do $$
begin
  -- Blocked date.
  begin
    insert into public.orders (customer_id, event_type, event_date)
    values ('22222222-2222-2222-2222-222222222222', 'wedding', '2030-08-01');
    raise exception 'FAIL: an order was accepted on a blocked date';
  exception
    when check_violation then
      raise notice 'PASS  date rule: order on a blocked date was rejected (%)', sqlerrm;
  end;

  -- Date already taken by a Confirmed order.
  begin
    insert into public.orders (customer_id, event_type, event_date)
    values ('22222222-2222-2222-2222-222222222222', 'wedding', '2030-07-01');
    raise exception 'FAIL: an order was accepted on an already-booked date';
  exception
    when check_violation then
      raise notice 'PASS  date rule: order on an already-booked date was rejected (%)', sqlerrm;
  end;

  -- A free date is fine.
  insert into public.orders (id, customer_id, event_type, event_date)
  values ('bbbbbbb2-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222', 'wedding', '2030-10-10');
  raise notice 'PASS  date rule: a free date is accepted';

  -- And a customer still cannot confirm it onto a blocked date.
  begin
    update public.orders set status = 'Confirmed'
    where id = 'bbbbbbb2-0000-0000-0000-000000000009';
    raise exception 'FAIL: a customer confirmed an order';
  exception
    when insufficient_privilege then
      raise notice 'PASS  date rule: the customer could not force Confirmed anyway';
  end;
end
$$;

-- The admin cannot double-book either: the partial unique index backs the trigger.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

do $$
begin
  begin
    update public.orders set status = 'Confirmed'
    where id = 'aaaaaaa1-0000-0000-0000-000000000001';
    raise notice 'PASS  admin: confirmed a Pending order on a free date';
  exception
    when others then
      raise exception 'FAIL: the admin could not confirm an order on a free date (%).', sqlerrm;
  end;

  begin
    insert into public.orders (customer_id, event_type, event_date, status)
    values ('11111111-1111-1111-1111-111111111111', 'wedding', '2030-07-01', 'Confirmed');
    raise exception 'FAIL: two orders were confirmed on the same date';
  exception
    when check_violation then
      raise notice 'PASS  date rule: second Confirmed order on a taken date was rejected (%)', sqlerrm;
    when unique_violation then
      raise notice 'PASS  date rule: second Confirmed order on a taken date hit the unique index (%)', sqlerrm;
  end;
end
$$;


-- ===========================================================================
-- Done. Roll the whole fixture back so nothing is left behind.
-- ===========================================================================
reset role;
rollback;

-- If you got here with no exception, every check above passed.
