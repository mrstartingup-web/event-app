import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  SectionHeading,
} from "~/components/ui";

/**
 * `/status` — the canonical answer to "is the backend wired up yet?".
 *
 * It is the one page allowed to name environment variables. It reports variable
 * NAMES and booleans through `describeConfig()` and never a value, so it is safe
 * to leave public: seeing `SUPABASE_SERVICE_ROLE_KEY` in the "set" list tells a
 * visitor nothing they can use.
 *
 * The `.server` module is imported dynamically inside the handler on purpose: a
 * static import of a `.server` file from a route (which is also client code) is
 * exactly what TanStack Start's import protection rejects, and the dynamic
 * import keeps the service-role key, the DB URL and the admin email out of the
 * browser bundle for certain.
 */
const getBackendStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { describeConfig } = await import("~/lib/config.server");
  return describeConfig();
});

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Backend status — Bloom & Aisle Events" },
      {
        name: "description",
        content: "Whether this site is connected to its database and storage yet.",
      },
    ],
  }),
  loader: () => getBackendStatus(),
  component: StatusPage,
});

function StatusPage() {
  const status = Route.useLoaderData();

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <SectionHeading
          level={1}
          eyebrow="Setup"
          title="Backend status"
          description="What the site knows about its own configuration. This page names variables and never prints a value."
        />

        {status.configured ? (
          <Alert tone="success" title="Backend configured">
            The Supabase URL and anon key are present, so pages use live data instead of sample
            content, and accounts can be used.
          </Alert>
        ) : (
          <Alert tone="warning" title="Backend not connected yet">
            No Supabase credentials are present. Every page falls back to clearly-labelled sample
            content, and signing in is switched off. Nothing is broken — there is simply no database
            to talk to.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Environment variables</CardTitle>
            <CardDescription>
              Names only. A value is never displayed here, or anywhere else on this site.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <VariableList title="Set" names={status.present} tone="ok" />
            <VariableList title="Still needed" names={status.missing} tone="missing" />
          </CardContent>
        </Card>

        {status.configured ? (
          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-ink-soft">
              <p>
                Supabase host:{" "}
                <code className="font-mono text-ink">{status.supabaseHost ?? "unknown"}</code>
              </p>
              <p>
                The browser fetches its public config from{" "}
                <a href="/api/config" className="font-medium text-primary-ink underline">
                  /api/config
                </a>{" "}
                — that is the only configuration it is given, and it contains no secret.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>What to do next</CardTitle>
              <CardDescription>Written for whoever sets the site up.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
                <li>
                  Locally: copy <code className="font-mono text-ink">.env.example</code> to{" "}
                  <code className="font-mono text-ink">.env</code> and fill in{" "}
                  <code className="font-mono text-ink">SUPABASE_URL</code> and{" "}
                  <code className="font-mono text-ink">SUPABASE_ANON_KEY</code>.
                </li>
                <li>
                  Live: add the same values to the host&rsquo;s environment — they are read from{" "}
                  <code className="font-mono text-ink">process.env</code> at request time, not from a
                  file, so nothing has to be rebuilt.
                </li>
                <li>
                  Then follow <code className="font-mono text-ink">BUILD.md</code> to apply the
                  database migration and set the Planner&rsquo;s email.
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <Link to="/" className="underline">
            Back to home
          </Link>
          <span aria-hidden="true">·</span>
          <span>
            {status.hasWhatsAppNumber ? (
              <Badge tone="success">WhatsApp button active</Badge>
            ) : (
              <Badge tone="muted">WhatsApp button hidden (no number set)</Badge>
            )}
          </span>
        </div>
      </div>
    </Container>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      {names.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">none</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name}>
              <Badge tone={tone === "ok" ? "success" : "muted"} className="font-mono">
                {name}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
