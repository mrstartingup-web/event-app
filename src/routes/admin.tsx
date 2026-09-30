import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { CheckingPanel, NotFoundView } from "~/components/route-states";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Container,
  SectionHeading,
  buttonClasses,
} from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { useSiteConfig } from "~/lib/site-config";

/**
 * `/admin` — the Planner's gate.
 *
 * Three outcomes, and only one of them renders anything admin-shaped:
 *
 * | state                              | what happens                                  |
 * | ---------------------------------- | --------------------------------------------- |
 * | session still being read           | "One moment…" — never admin content           |
 * | signed out                         | sent to `/login?redirect=/admin`              |
 * | signed in, `profiles.role != admin`| the same 404 view as an unknown URL           |
 * | signed in, `profiles.role = admin`| the dashboard                                 |
 *
 * `unavailable` (no Supabase credentials) also renders the 404: with no backend
 * nobody is a proven admin, and showing a dashboard shell to an unauthenticated
 * visitor would be exactly the mistake this gate exists to prevent.
 *
 * **This is presentation only.** The authority is the database: every admin-only
 * table and storage bucket has an RLS policy that calls `public.is_admin()`, and
 * `profiles.role` cannot be changed through the API by anyone — the Planner's
 * role is assigned once, at signup, from `app_config.admin_email`.
 */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      // Never index, and do not show it as a search result for customers.
      { name: "robots", content: "noindex, nofollow" },
      // Deliberately NO `title`, and no admin wording in this meta block.
      // This route renders the same 404 view as a bad URL for anyone who is not
      // the Planner, and the <title> is part of that response: a static
      // "Planner dashboard — …" title told an anonymous visitor what /admin is
      // even while the body hid everything. The dashboard's heading lives in the
      // guarded branch below, so a denied response now contains nothing
      // admin-shaped at all, title included.
    ],
  }),
  component: AdminPage,
});

const ADMIN_SECTIONS: { title: string; body: string; stage: string }[] = [
  {
    title: "Portfolio & catalog",
    body: "Add, edit, reorder and delete projects and decor items, and toggle an item's availability.",
    stage: "Stage 2",
  },
  {
    title: "Orders & quotes",
    body: "Pending, active and completed orders, with the final quoted price in RM.",
    stage: "Stage 4",
  },
  {
    title: "Calendar & blocked dates",
    body: "Block a date with a private reason; customers only ever see the date as unavailable.",
    stage: "Stage 5",
  },
  {
    title: "Messages",
    body: "One inbox with every customer conversation, newest first.",
    stage: "Stage 6",
  },
  {
    title: "Reviews",
    body: "Hide or delete a review left after a completed order.",
    stage: "Stage 7",
  },
];

export function AdminPage() {
  const { status, profile, isAdmin, signOut } = useAuth();
  const { configured } = useSiteConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "signed-out") {
      void navigate({ to: "/login", search: { redirect: "/admin" } });
    }
  }, [status, navigate]);

  // Not the Planner as far as this client can tell — including every visitor
  // while the backend is unconfigured. Same page as a bad URL, on purpose.
  if (status === "unavailable" || (status === "signed-in" && !isAdmin)) {
    return <NotFoundView />;
  }

  if (status === "loading" || status === "signed-out") {
    return (
      <CheckingPanel
        message={
          status === "loading"
            ? "Checking your access…"
            : "You need to be signed in — taking you to the sign-in page."
        }
      />
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <SectionHeading
          level={1}
          eyebrow="Planner only"
          title="Planner dashboard"
          description="Management pages open here as each stage is built. The database, the permissions and the storage buckets behind them are already in place."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="accent">Signed in as the Planner</Badge>
          <span className="text-sm text-ink-muted">{profile?.full_name ?? ""}</span>
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>

        {!configured ? (
          <Alert tone="warning" title="Nothing to manage yet">
            The site is not connected to its backend, so there is no store of projects, items or
            orders to manage. <Link to="/status" className="font-medium underline">Backend status</Link>
          </Alert>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <Card key={section.title}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle>{section.title}</CardTitle>
                <Badge tone="muted">{section.stage}</Badge>
              </div>
              <CardContent>
                <CardDescription>{section.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </ul>

        <div className="rounded-card border border-line bg-canvas-sunk/60 p-5 text-sm text-ink-soft">
          <p className="font-medium text-ink">Why you can see this and customers cannot</p>
          <p className="mt-1 leading-relaxed">
            Your role is stored in the database at signup and cannot be changed from the site — not
            by a customer, and not with a stolen admin key. Every admin-only row is also protected by
            Row Level Security, so even a crafted request returns nothing.{" "}
            <Link to="/account" className={buttonClasses("ghost", "sm", "px-0")}>
              Back to my account
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
}
