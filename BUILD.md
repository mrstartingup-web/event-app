# BUILD.md — Bloom & Aisle Events

How to run, configure, migrate, seed and deploy this app. Written for whoever
picks this up next (including the next stage of work), so it repeats the "why",
not just the commands.

**Stage status.** Stage 1a (this hand-off) delivered the database foundation:
`supabase/migrations/0001_init.sql` (full schema, Row Level Security on every
table, the one-admin rule, the date-availability rule, storage buckets and
policies), `supabase/seed.sql`, the RLS test script, the environment plumbing
(`.env.example`, `src/lib/config.server.ts`, `/api/config`) and the page at
`/status` that reports whether the backend is configured. **Stage 1b** still has
to build the app shell, navigation, the "Chat on WhatsApp" button and the
email/password auth UI. Stage 2 adds the portfolio and catalog.

---

## 1. Requirements

- [Bun](https://bun.sh) (the repo's scripts use it; npm works too)
- No local database is needed to run the site: with no environment variables it
  shows a clear "backend not configured yet" state and sample content.
- A Supabase project is needed for anything real (auth, data, storage).
- Optional, for verifying the SQL locally: PostgreSQL 15+ with `psql`.

## 2. Run it locally

```bash
bun install
bun run dev            # dev server on http://localhost:3000
```

Production-style, in this workspace (builds, then serves port 3000):

```bash
bun run publish        # build + restart the server on port 3000
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # → 200
curl -s http://localhost:3000/api/config
```

Pages that exist today:

| Path         | What it is                                                              |
| ------------ | ----------------------------------------------------------------------- |
| `/`          | Placeholder landing page (replaced in Stage 1b)                         |
| `/status`    | Reports whether the backend is configured — names only, never a value   |
| `/api/config`| JSON: `SUPABASE_URL` + `SUPABASE_ANON_KEY` and nothing else              |

## 3. Environment variables

Copy `.env.example` to `.env` for local work. On the live site the same values
must be in the **host's environment** — this app reads `process.env` at runtime
and deliberately does not load a `.env` file, because a `.env` file is not
published and a secret that only lives there is simply missing in production.
`.gitignore` ignores `.env` and `.env.*` (and keeps `.env.example`).

| Variable                    | Needed for                          | Secret? | Notes                                                     |
| --------------------------- | ----------------------------------- | ------- | --------------------------------------------------------- |
| `SUPABASE_URL`              | everything                          | no      | `https://<ref>.supabase.co`, sent to the browser           |
| `SUPABASE_ANON_KEY`         | everything                          | no      | public by design; RLS protects the data, not this key      |
| `SUPABASE_SERVICE_ROLE_KEY` | applying migrations, admin tasks    | **yes** | server only; bypasses RLS; never send to a browser         |
| `SUPABASE_DB_URL`           | `psql` migrations                   | **yes** | e.g. `postgresql://postgres.<ref>:<pw>@<host>:5432/postgres` |
| `ADMIN_EMAIL`               | the one-admin rule                  | no      | the Planner's login email; push it into `app_config`       |
| `WHATSAPP_NUMBER`           | "Chat on WhatsApp" button (Stage 1b)| no      | digits only, international, e.g. `60123456789`             |

Nothing is hardcoded. Everything is read in one place, `src/lib/config.server.ts`
(a `.server` module, so TanStack Start refuses to bundle it into client code).
`/api/config` is the only route that exposes anything, and it exposes exactly
`SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Check the current state without printing a value:

```bash
curl -s http://localhost:3000/api/config
# {"configured":false,"supabaseUrl":null,"supabaseAnonKey":null,
#  "missing":["SUPABASE_URL","SUPABASE_ANON_KEY"]}
```

## 4. Create the database

1. Create a project at [supabase.com](https://supabase.com) (any region close to
   Malaysia, e.g. Singapore).
2. From **Project Settings → API**, copy the project URL and the `anon` key into
   `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Copy the `service_role` key into
   `SUPABASE_SERVICE_ROLE_KEY` (server only, never in a browser).
3. From **Project Settings → Database**, copy the connection string (the pooler
   URI is fine) into `SUPABASE_DB_URL`.
4. Apply the migration — route A or route B below.

### Route A — Supabase SQL editor (no terminal needed)

Open **SQL Editor**, paste the whole of `supabase/migrations/0001_init.sql`, and
run it. It is wrapped in one transaction: if anything fails, nothing is applied,
so it is safe to fix and paste again. Then set the admin email (section 5).

### Route B — connection string

Runs the same file over the wire. Requires the `postgres` password (database
password, not the API keys).

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
```

Either route finishes with the message that the admin email still has to be set.

**What the migration creates:** `profiles`, `app_config`, `projects`,
`project_photos`, `catalog_items`, `orders`, `order_items`, `venue_photos`,
`designs`, `reviews`, `conversations`, `messages`, `notifications`,
`blocked_dates`; every foreign key indexed plus `orders (status, event_date)`;
Row Level Security **enabled on all fourteen tables** with explicit policies; a
security-definer `public.is_admin()`; the `public.unavailable_dates` view (dates
only, granted to `anon` and `authenticated`); a trigger that rejects an order on
a blocked or already-booked date *and* a unique index that makes double-booking
impossible; the five storage buckets and their storage policies.

Money is always `numeric(10,2)`, never a float, and always Malaysian Ringgit
formatted `RM 1,250.00`.

## 5. Set the admin email (the one-admin rule)

Postgres cannot read a process environment variable, so `ADMIN_EMAIL` has no
effect on its own: it is **pushed into the `app_config` table**, which is what
the signup trigger reads. One row, one address.

SQL editor / psql (one line):

```sql
update public.app_config set admin_email = 'planner@example.com' where id = 1;
```

Or over the API with the service-role key, no terminal SQL needed:

```bash
curl -sS -X PATCH "$SUPABASE_URL/rest/v1/app_config?id=eq.1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"admin_email":"planner@example.com"}'
```

Then the Planner signs up **with that exact address** (Stage 1b builds the
sign-up screen; until then they can be created in **Authentication → Users**),
and a trigger on `auth.users` creates their profile with `role = 'admin'`.
Every other signup is a customer. Roles are assigned once, at signup:

- `profiles.role` cannot be changed through the API at all — not by a customer
  promoting themselves, and not with the service-role key either (the trigger
  `enforce_profiles_role_immutable` raises for `anon`, `authenticated` and
  `service_role`). Changing a role requires a direct database connection, which
  only the owner has.
- If the admin address was already taken when you set `admin_email`, fix that one
  row directly: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'planner@example.com');`

## 6. Sample content (seed)

`supabase/seed.sql` inserts three **clearly labelled SAMPLE** projects, four
project photos and six catalog items (one deliberately unavailable, to show that
it disappears for customers but stays visible to the admin). It is **never
applied automatically**:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

The delete statements are at the top of the file. The sample rows use fixed
UUIDs (`5eed0000-…`) and `on conflict do nothing`, so running it twice is safe.

Storage paths in the seed (`<project-id>/cover.jpg` inside the `portfolio`
bucket, …) point at images that do not exist yet, so the UI must render a
placeholder when a file is missing.

## 7. Verify the SQL locally (no Supabase project needed)

This is how the SQL in this repo was verified: real PostgreSQL, throwaway
database, no credentials.

```bash
# once: a local PostgreSQL 15+ (Ubuntu: sudo apt-get install -y postgresql)
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres ./supabase/tests/run_local.sh
```

The script creates a scratch database and applies, in order:

1. `supabase/tests/local_stub_supabase.sql` — **test-only** stubs for the
   `auth` and `storage` schemas, `auth.uid()`, `storage.foldername()` and the
   `anon` / `authenticated` / `service_role` roles that a real project already
   has. Never run this against a real project.
2. `supabase/migrations/0001_init.sql`
3. `supabase/seed.sql`
4. `supabase/tests/rls_check.sql` — the proof: two customers, the admin and some
   data, then every check as `anon`, then as each customer, then as the admin.
   It prints `PASS` lines and raises on the first failure, and rolls everything
   back at the end, so it leaves no data behind. It can also be pasted into the
   Supabase SQL editor.

If `psql` is not available and Docker is, the same three files can be applied to
`docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` before
running the script (Docker Desktop / a container runtime is required — a Docker
CLI with no daemon cannot start Postgres).

## 8. Storage buckets and path conventions

Created by the migration, so no dashboard clicking is needed:

| Bucket             | Public | Who can read        | Who can write          |
| ------------------ | ------ | ------------------- | ---------------------- |
| `portfolio`        | yes    | everyone            | admin only             |
| `catalog`          | yes    | everyone            | admin only             |
| `venue-photos`     | no     | owner + admin       | owner + admin          |
| `design-previews`  | no     | owner + admin       | owner + admin          |
| `chat-attachments` | no     | owner + admin       | owner + admin          |

`storage.objects.name` is relative to the bucket, and every `*_path` column in
the schema stores that same bucket-relative name, so a value can be handed
straight to `supabase.storage.from('<bucket>').getPublicUrl(path)`:

```
portfolio/        <project-id>/<file>
catalog/          <item-id>/<file>
venue-photos/     <customer-id>/<order-id>/<file>
design-previews/  <customer-id>/<file>
chat-attachments/ <customer-id>/<file>
```

For the four private buckets the **first folder must be the owning customer's
user id** — that is exactly what the storage policies check
(`(storage.foldername(name))[1] = auth.uid()::text`). An upload to any other
folder path is rejected by the database, not by the UI.

## 9. Date availability (SPEC section 6)

- `blocked_dates` is admin-only and has **no customer policy at all**, so the
  reasons (and the table) are unreachable for a customer.
- Customers get `public.unavailable_dates`: one column, `date`, granted to `anon`
  and `authenticated`. It is the union of the blocked dates and the dates of
  orders that are `Confirmed` or `In Progress` — no reason, no customer, nothing
  else. A customer date picker disables exactly these dates, unexplained.
- The rule is enforced in the database, not only in the UI: a `BEFORE INSERT OR
  UPDATE` trigger on `orders` rejects a blocked or already-booked date even if
  the front end is bypassed, and a partial unique index
  (`orders_one_active_per_date_idx`) makes two `Confirmed` orders on one date
  impossible even under concurrent writes.
- The admin sees everything: blocked dates with reasons, and the orders behind
  the booked ones.

## 10. Deploying

### This workspace (the live preview)

```bash
bun run publish     # builds and restarts the server on port 3000
```

`.run/server.log` holds the server log. Whatever serves port 3000 is the live
site.

### Vercel

```bash
./build-vercel.sh                 # produces .vercel/output (Build Output API v3)
bunx vercel deploy --prebuilt     # deploy that bundle
```

`build-vercel.sh` bundles the SSR handler into one self-contained function, so
nothing has to be traced or detected. Add all six environment variables in the
Vercel project settings (Production **and** Preview) — the site reads them from
the host environment at runtime, so no rebuild is needed to change them.

### Netlify

Netlify needs the TanStack Start adapters (`@netlify/vite-plugin-tanstack-start`
or a Netlify function wrapping `dist/server/server.js`); the Vercel path above is
the one this repository is set up for. The environment variables are the same
six, set in Netlify's UI.

## 11. Known limitations and notes for the next stage

- **Not built yet, by design:** the app shell, navigation, auth UI and the
  "Chat on WhatsApp" button (Stage 1b); the portfolio, catalog and their admin
  pages (Stage 2); the editor (3); orders and quotes (4); the admin calendar (5);
  chat (6); reviews and notifications (7). The database already supports all of
  them — that was the point of writing the whole schema now.
- `/` is still the platform placeholder and `__root.tsx` still has the title
  "My site": Stage 1b owns both.
- `@supabase/supabase-js` is **not installed yet** — Stage 1b needs it (auth UI,
  the browser client built from `/api/config`, the server client using the
  service-role key). The config plumbing it needs already exists.
- `projects.event_type` and `catalog_items.category` are free text on purpose
  (the owner's list says "wedding, birthday, corporate, etc."), so a new event
  type never needs a migration. The UI groups by these values.
- A customer may cancel their own order (any status before `Completed`) and may
  accept a quote (`Quoted → Confirmed`); every other status change, the quoted
  price, the event date and the item list belong to the Planner, enforced by a
  trigger rather than by hiding buttons.
- A customer may edit their own profile (name, phone), but never `role` or `id`.
- Reviews can only be inserted for the customer's own `Completed` order, one per
  order (unique `order_id`). There is no customer update/delete policy for a
  review: the Planner hides (`is_hidden`) or deletes, and the customer's own
  review stays visible to them when hidden.
- `order_items.catalog_item_id` is `ON DELETE SET NULL`, so retiring a catalog
  item never breaks the history of past orders. The line keeps its `quantity`
  and `unit_price_myr`, but not the item's name: if a later stage wants the name
  to survive the item being deleted, add a `name_snapshot text` column then.
- The one-admin trigger and the availability trigger are `SECURITY DEFINER` and
  set `search_path` explicitly; keep that if you edit them.
- `supabase/tests/local_stub_supabase.sql` is test-only scaffolding. Never run
  it against a real project.
- Migrations are one file for now (`0001_init.sql`). Later stages add
  `0002_*.sql` next to it — never edit an applied migration.
