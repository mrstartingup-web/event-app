import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

/**
 * Reads the configuration on the server. The `.server` module is imported
 * dynamically inside the handler on purpose: a static import of a `.server`
 * file from a route (which is also client code) is what TanStack Start's import
 * protection rejects, and the dynamic import keeps the service-role key, the DB
 * URL and the admin email out of the browser bundle for certain.
 */
const getBackendStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { describeConfig } = await import("~/lib/config.server");
  return describeConfig();
});

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [{ title: "Backend status — Bloom & Aisle Events" }],
  }),
  loader: () => getBackendStatus(),
  component: StatusPage,
});

function StatusPage() {
  const status = Route.useLoaderData();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Bloom &amp; Aisle Events
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Backend status</h1>
      </header>

      <StatusBanner configured={status.configured} hasSupabaseUrl={status.present.includes("SUPABASE_URL")} />

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Environment variables</h2>
        <p className="mt-1 text-sm text-slate-600">
          Names only — this page never displays a key or secret value.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <VariableList title="Set" names={status.present} tone="ok" />
          <VariableList title="Still needed" names={status.missing} tone="missing" />
        </div>
      </section>

      {status.configured ? (
        <section className="rounded-xl border border-slate-200 p-5 text-sm text-slate-700">
          <p>
            Supabase host: <code className="font-mono text-slate-900">{status.supabaseHost ?? "unknown"}</code>
          </p>
          <p className="mt-2">
            The browser can fetch its public config from{" "}
            <a href="/api/config" className="font-medium underline">
              /api/config
            </a>
            .
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h2 className="font-semibold">What to do next</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Locally: copy <code className="font-mono">.env.example</code> to{" "}
              <code className="font-mono">.env</code> and fill in{" "}
              <code className="font-mono">SUPABASE_URL</code> and{" "}
              <code className="font-mono">SUPABASE_ANON_KEY</code>.
            </li>
            <li>
              Live: add the same variables to the host&rsquo;s environment (they are read from{" "}
              <code className="font-mono">process.env</code>, not from a file) and restart the site.
            </li>
            <li>
              Then follow <code className="font-mono">BUILD.md</code> to apply the database migrations.
            </li>
          </ol>
          <p className="mt-3">
            Nothing is broken in the meantime: every page falls back to sample content while the backend
            is unconfigured.
          </p>
        </section>
      )}

      <footer className="mt-auto text-xs text-slate-500">
        <Link to="/" className="underline">
          Back to home
        </Link>
      </footer>
    </main>
  );
}

function StatusBanner({ configured, hasSupabaseUrl }: { configured: boolean; hasSupabaseUrl: boolean }) {
  const label = configured
    ? "Backend configured"
    : hasSupabaseUrl
      ? "Backend partly configured"
      : "Backend not configured yet";

  const detail = configured
    ? "Supabase URL and anon key are present. Live data will be used instead of sample content."
    : "No Supabase credentials are present, so the site is running on clearly-labelled sample content.";

  return (
    <div
      className={
        configured
          ? "rounded-xl border border-emerald-200 bg-emerald-50 p-5"
          : "rounded-xl border border-slate-300 bg-slate-50 p-5"
      }
    >
      <p
        className={
          configured
            ? "text-base font-semibold text-emerald-900"
            : "text-base font-semibold text-slate-900"
        }
      >
        {label}
      </p>
      <p className={configured ? "mt-1 text-sm text-emerald-800" : "mt-1 text-sm text-slate-600"}>
        {detail}
      </p>
    </div>
  );
}

function VariableList({
  title,
  names,
  tone,
}: {
  title: string;
  names: string[];
  tone: "ok" | "missing";
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {names.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">none</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-2">
          {names.map((name) => (
            <li
              key={name}
              className={
                tone === "ok"
                  ? "rounded-md bg-emerald-100 px-2 py-1 font-mono text-xs text-emerald-900"
                  : "rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700"
              }
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}