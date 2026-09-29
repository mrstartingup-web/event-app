-- ===========================================================================
-- SAMPLE CONTENT — NOT REAL, NOT APPLIED AUTOMATICALLY.
--
-- Everything below is fake content that exists so the owner (and the team) can
-- click through the real layout before any real work has been uploaded. It is
-- labelled in the UI as sample content and it is meant to be deleted.
--
-- How to run (Supabase SQL editor, or psql with SUPABASE_DB_URL):
--     psql "$SUPABASE_DB_URL" -f supabase/seed.sql
--
-- Deleting it again (order matters: photos first):
--     delete from public.project_photos where project_id in
--       ('5eed0000-0000-4000-8000-000000000001','5eed0000-0000-4000-8000-000000000002',
--        '5eed0000-0000-4000-8000-000000000003');
--     delete from public.projects where id::text like '5eed0000-%';
--     delete from public.catalog_items where id::text like '5eed0000-%';
--     delete from storage.objects where name like 'sample-%' or name like 'sample-%';
--
-- The `*_path` values are STORAGE PATHS, not URLs, and the sample images do not
-- exist yet — the UI must render a placeholder when a file is missing. Upload
-- real photos into the `portfolio` and `catalog` buckets to replace them.
--
-- Sample content is never inserted by the migration, so a production database
-- stays empty until the owner adds their own.
-- ===========================================================================

begin;

-- ----------------------------------------------------------------- Projects --
insert into public.projects (id, title, slug, event_type, description, event_date, cover_image_path, sort_order) values
  ('5eed0000-0000-4000-8000-000000000001',
   'SAMPLE — Garden Wedding at Lakeview',
   'sample-garden-wedding-lakeview',
   'wedding',
   'Sample project used to show the portfolio layout. A white floral arch, an aisle of candles and long tables with low centrepieces. Replace this with a real event.',
   '2025-04-12',
   'sample-garden-wedding-lakeview/cover.jpg',
   1),
  ('5eed0000-0000-4000-8000-000000000002',
   'SAMPLE — First Birthday Balloon Setup',
   'sample-first-birthday-balloons',
   'birthday',
   'Sample project used to show the portfolio layout. A pastel balloon garland over a dessert table with a numbered backdrop. Replace this with a real event.',
   '2025-06-08',
   'sample-first-birthday-balloons/cover.jpg',
   2),
  ('5eed0000-0000-4000-8000-000000000003',
   'SAMPLE — Corporate Gala Stage',
   'sample-corporate-gala-stage',
   'corporate',
   'Sample project used to show the portfolio layout. A lit stage backdrop with branded panels and tall centrepieces. Replace this with a real event.',
   '2025-08-21',
   'sample-corporate-gala-stage/cover.jpg',
   3)
on conflict (id) do nothing;

insert into public.project_photos (id, project_id, storage_path, caption, sort_order) values
  ('5eed0000-0000-4000-8000-000000000101', '5eed0000-0000-4000-8000-000000000001',
   'sample-garden-wedding-lakeview/01.jpg', 'SAMPLE — ceremony arch', 1),
  ('5eed0000-0000-4000-8000-000000000102', '5eed0000-0000-4000-8000-000000000001',
   'sample-garden-wedding-lakeview/02.jpg', 'SAMPLE — guest tables', 2),
  ('5eed0000-0000-4000-8000-000000000103', '5eed0000-0000-4000-8000-000000000002',
   'sample-first-birthday-balloons/01.jpg', 'SAMPLE — balloon garland', 1),
  ('5eed0000-0000-4000-8000-000000000104', '5eed0000-0000-4000-8000-000000000003',
   'sample-corporate-gala-stage/01.jpg', 'SAMPLE — stage backdrop', 1)
on conflict (id) do nothing;

-- -------------------------------------------------------------- Catalog items --
-- Prices are Malaysian Ringgit, numeric(10,2), and are SAMPLE prices.
insert into public.catalog_items (id, name, category, price_myr, description, image_path, cutout_png_path, is_available, sort_order) values
  ('5eed0000-0000-4000-8000-000000000201', 'SAMPLE — Round Balloon Arch',   'Arches',         450.00, 'Sample item. A 2.4 m round arch of balloons and greenery.',        'sample-round-balloon-arch/photo.jpg', 'sample-round-balloon-arch/cutout.png', true, 1),
  ('5eed0000-0000-4000-8000-000000000202', 'SAMPLE — Wedding Backdrop',     'Backdrops',      680.00, 'Sample item. A draped fabric backdrop with a floral header.',      'sample-wedding-backdrop/photo.jpg',   'sample-wedding-backdrop/cutout.png',   true, 2),
  ('5eed0000-0000-4000-8000-000000000203', 'SAMPLE — Table Centrepiece',    'Table settings',  120.00, 'Sample item. A low floral centrepiece with candle holders.',       'sample-table-centrepiece/photo.jpg',  'sample-table-centrepiece/cutout.png',  true, 3),
  ('5eed0000-0000-4000-8000-000000000204', 'SAMPLE — Warm Uplighting (pair)','Lighting',       260.00, 'Sample item. Two warm uplights for walls or pillars.',             'sample-uplighting/photo.jpg',         null,                                          true, 4),
  ('5eed0000-0000-4000-8000-000000000205', 'SAMPLE — Balloon Cluster',      'Balloons',        180.00, 'Sample item. A floor balloon cluster in the chosen colour palette.','sample-balloon-cluster/photo.jpg',    'sample-balloon-cluster/cutout.png',    true, 5),
  ('5eed0000-0000-4000-8000-000000000206', 'SAMPLE — Retired Prop (hidden)', 'Backdrops',       0.00, 'Sample item marked unavailable, to prove it disappears for customers and stays visible to the admin.', 'sample-retired-prop/photo.jpg', null, false, 6)
on conflict (id) do nothing;

commit;

-- ===========================================================================
-- Reminder for the owner: sample content is labelled "SAMPLE" on purpose, so
-- it is obvious in the admin what is real and what is not. Delete it once real
-- projects, photos and catalog items are in.
-- ===========================================================================
