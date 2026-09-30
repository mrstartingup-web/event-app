import { Link } from "@tanstack/react-router";

import { Container, SectionHeading, buttonClasses } from "~/components/ui";

/**
 * The "not found" view, used in two places on purpose:
 *
 * 1. `notFoundComponent` on the root route — a URL that matches no page.
 * 2. `/admin` for anyone who is signed in but is not the Planner.
 *
 * They render the same thing so /admin does not reveal that it exists to a
 * customer who guessed the URL. The real gate is still the database: every
 * admin-only row is protected by a Row Level Security policy that checks
 * `is_admin()`, so hiding the page is presentation, not security.
 */
export function NotFoundView() {
  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        eyebrow="404"
        level={1}
        title="We couldn't find that page"
        description="The link may be out of date, or the page may not exist yet. Everything that is built so far is on the home page."
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className={buttonClasses("primary")}>
          Back to the home page
        </Link>
        <Link to="/status" className={buttonClasses("secondary")}>
          Backend status
        </Link>
      </div>
    </Container>
  );
}

/** Shared "wait a moment" panel, used while a session or a role is being read. */
export function CheckingPanel({ message }: { message: string }) {
  return (
    <Container className="py-16 sm:py-24">
      <div aria-live="polite" className="mx-auto max-w-md">
        <SectionHeading level={1} title="One moment…" description={message} />
      </div>
    </Container>
  );
}
