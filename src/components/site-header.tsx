import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BrandLink } from "~/components/brand";
import { Badge, Button, Container, buttonClasses } from "~/components/ui";
import { WhatsAppButton } from "~/components/whatsapp-button";
import { useAuth } from "~/lib/auth";
import { cn } from "~/lib/cn";

/**
 * Site header: the brand, the customer-facing nav, the account area and the
 * WhatsApp shortcut.
 *
 * Mobile-first: below `md` the nav collapses into a disclosure button with a
 * large-target panel (the audience arrives from WhatsApp or Instagram on a
 * phone), and the same links are a plain row from `md` up. Portfolio and Catalog
 * appear as non-clickable "soon" labels rather than links to pages that do not
 * exist yet — a link that 404s is worse than an honest label.
 *
 * A note on classes: responsive display switches live on *wrapper* elements
 * (e.g. `<div className="hidden md:block">`) instead of being appended to a
 * primitive's `className`. Two display utilities on one element (`hidden` and
 * `inline-flex`) resolve by stylesheet order, not by the order they are written,
 * so appending them is a coin flip — a wrapper has no such ambiguity.
 */

const NAV_LINK =
  "rounded-pill px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary-ink";

/** A nav entry for a page that ships in the next stage. */
function SoonItem({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-muted"
    >
      {label}
      <Badge tone="muted" className="px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide">
        soon
      </Badge>
    </span>
  );
}

function AccountLinks({
  layout = "row",
  onNavigate,
}: {
  layout?: "row" | "column";
  onNavigate?: () => void;
}) {
  const { status, isAdmin, signOut } = useAuth();

  // While the session is being restored nothing is rendered, so the header is
  // identical during SSR and on the first client render (no hydration
  // mismatch). An unconfigured backend resolves to "unavailable" in both places
  // and the sign-in links are shown — the login page explains why they cannot
  // work yet.
  if (status === "loading") return <div className="h-9" aria-hidden="true" />;

  const wrapper = cn("flex gap-2", layout === "row" ? "items-center" : "flex-col items-stretch");

  if (status === "signed-in") {
    return (
      <div className={wrapper}>
        {isAdmin ? (
          <Link to="/admin" className={buttonClasses("secondary", "sm", "border-accent/40 text-accent-ink")}>
            Admin
          </Link>
        ) : null}
        <Link to="/account" className={buttonClasses("ghost", "sm")} onClick={onNavigate}>
          My account
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Link to="/login" className={buttonClasses("ghost", "sm")} onClick={onNavigate}>
        Sign in
      </Link>
      <Link to="/signup" className={buttonClasses("primary", "sm")} onClick={onNavigate}>
        Create account
      </Link>
    </div>
  );
}

/** The message pre-filled when a customer taps WhatsApp from the header. */
const HEADER_WA_MESSAGE =
  "Hi Bloom & Aisle Events! I found you on your website and would like to ask about my event.";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Close the mobile panel if the viewport grows into the desktop layout, so a
  // stale open state cannot leave a hidden-but-mounted panel around.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <Container className="flex min-h-16 flex-wrap items-center justify-between gap-y-2 py-2">
        <BrandLink />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <Link to="/" className={NAV_LINK}>
            Home
          </Link>
          <SoonItem label="Portfolio" />
          <SoonItem label="Catalog" />
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <AccountLinks />
          </div>
          {/* WhatsApp shortcut. It renders nothing at all when WHATSAPP_NUMBER
              is unset, and it is inline in the header only from `sm` up: at
              360px the brand, this button and the menu button together are
              wider than the phone, and the header would wrap onto two rows.
              Below `sm` the shortcut lives in the menu panel instead, and every
              page also carries its own full-width WhatsApp call to action. */}
          <div className="hidden sm:block md:hidden lg:block">
            <WhatsAppButton label="WhatsApp" size="sm" message={HEADER_WA_MESSAGE} />
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-line-strong text-ink md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              {open ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {open ? (
          <div id="site-menu" className="w-full border-t border-line pt-3 pb-1 md:hidden">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              <Link to="/" className={cn(NAV_LINK, "block")} onClick={close}>
                Home
              </Link>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm text-ink-muted">
                <span>Portfolio</span>
                <Badge tone="muted">Next stage</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm text-ink-muted">
                <span>Catalog</span>
                <Badge tone="muted">Next stage</Badge>
              </div>
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              <AccountLinks layout="column" onNavigate={close} />
              <WhatsAppButton className="w-full" message={HEADER_WA_MESSAGE} />
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
