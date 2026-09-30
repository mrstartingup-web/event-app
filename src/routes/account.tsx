import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { CheckingPanel } from "~/components/route-states";
import { WhatsAppButton } from "~/components/whatsapp-button";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  SectionHeading,
  buttonClasses,
} from "~/components/ui";
import { BACKEND_NOT_CONNECTED_MESSAGE, useAuth } from "~/lib/auth";

/**
 * My account — a signed-in-customer-only page.
 *
 * The guard is a three-state read of the session: `loading` (nothing is
 * rendered but "one moment"), `signed-out` (sent to /login, which returns here
 * afterwards) and `signed-in`. There is deliberately no "probably signed in"
 * branch, so a signed-out visitor can never catch a glimpse of the page.
 *
 * What is on the page today is what exists: the profile the database created at
 * signup. Orders, designs, chat and reviews are later stages and are listed as
 * such rather than mocked up.
 */
export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Bloom & Aisle Events" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const LATER: { title: string; body: string; stage: string }[] = [
  {
    title: "Saved designs",
    body: "Mockups of your venue with the Planner's decor arranged on them.",
    stage: "Stage 3",
  },
  {
    title: "My orders & quotes",
    body: "Submit an order, see the Planner's final price in RM, accept or decline it.",
    stage: "Stage 4",
  },
  {
    title: "Messages",
    body: "A one-to-one chat with the Planner, attached to your order.",
    stage: "Stage 6",
  },
  {
    title: "Your review",
    body: "Leave a rating and a photo after your event is completed.",
    stage: "Stage 7",
  },
];

export function AccountPage() {
  const { status, user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "signed-out") {
      void navigate({ to: "/login", search: { redirect: "/account" } });
    }
  }, [status, navigate]);

  if (status === "unavailable") {
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <SectionHeading level={1} eyebrow="Your account" title="Accounts aren't connected yet" />
          <Alert tone="warning" title="There is no account system to sign in to">
            {BACKEND_NOT_CONNECTED_MESSAGE} Once the site is connected you will be able to sign in
            and keep your event details here.
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Link to="/status" className={buttonClasses("secondary")}>
              Backend status
            </Link>
            <WhatsAppButton
              label="Message the Planner instead"
              message="Hi Bloom & Aisle Events! I'd like to ask about planning an event."
            />
          </div>
        </div>
      </Container>
    );
  }

  if (status === "loading" || status === "signed-out") {
    // A signed-out visitor is being redirected by the effect above; the message
    // says so rather than flashing a sign-in form they did not ask for.
    return (
      <CheckingPanel
        message={
          status === "loading"
            ? "Checking your session…"
            : "You need to be signed in to see this page — taking you to the sign-in page."
        }
      />
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <SectionHeading
          level={1}
          eyebrow="Your account"
          title={profile?.full_name ? `Hello, ${profile.full_name}` : "Your account"}
          description="Everything about your event lives here as each part of the site is built."
        />

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <>
              <Badge tone="accent">Planner account</Badge>
              <Link to="/admin" className={buttonClasses("secondary", "sm")}>
                Open the admin dashboard
              </Link>
            </>
          ) : (
            <Badge tone="primary">Customer account</Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              These came from your sign-up. Editing them arrives with the rest of the account pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</dt>
                <dd className="mt-1 text-sm text-ink">{profile?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</dt>
                <dd className="mt-1 break-all text-sm text-ink">{user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Phone / WhatsApp
                </dt>
                <dd className="mt-1 text-sm text-ink">{profile?.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Role</dt>
                <dd className="mt-1 text-sm text-ink">
                  {profile?.role === "admin" ? "Planner (admin)" : "Customer"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Coming to this page"
            description="In the order they are being built — each one is a later stage of the site."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {LATER.map((item) => (
              <Card key={item.title}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle>{item.title}</CardTitle>
                  <Badge tone="muted">{item.stage}</Badge>
                </div>
                <CardContent>
                  <CardDescription>{item.body}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 rounded-card border border-line bg-canvas-sunk/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">
            Need something sooner? Message the Planner directly.
          </p>
          <WhatsAppButton
            message="Hi Bloom & Aisle Events! I have an account and would like to ask about my event."
            className="shrink-0"
          />
        </div>
      </div>
    </Container>
  );
}
