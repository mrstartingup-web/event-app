import { Link } from "@tanstack/react-router";

import { BrandMark } from "~/components/brand";
import { Container } from "~/components/ui";
import { WhatsAppButton } from "~/components/whatsapp-button";

/**
 * Site footer: where the "Chat on WhatsApp" call to action lives on every page,
 * plus the links that are not in the main nav (including /status, which stays
 * the canonical "is the backend wired?" page).
 *
 * Static on purpose — no auth state — so the footer HTML is byte-identical
 * during SSR and after hydration on every page.
 */

const FOOTER_LINK = "text-sm text-ink-soft transition-colors hover:text-primary-ink";

const FOOTER_WA_MESSAGE =
  "Hi Bloom & Aisle Events! I'd like to talk about planning and decorating my event.";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <Container className="py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <BrandMark />
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
              Wedding and event planning, styling and decor — designed in beautiful detail, set up
              on the day so you can enjoy it.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Explore
            </h2>
            <nav aria-label="Footer" className="flex flex-col items-start gap-2">
              <Link to="/" className={FOOTER_LINK}>
                Home
              </Link>
              <span className="text-sm text-ink-muted">
                Portfolio <span className="text-xs">(next stage)</span>
              </span>
              <span className="text-sm text-ink-muted">
                Catalog <span className="text-xs">(next stage)</span>
              </span>
              <Link to="/status" className={FOOTER_LINK}>
                Backend status
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Your account
            </h2>
            <nav aria-label="Account" className="flex flex-col items-start gap-2">
              <Link to="/login" className={FOOTER_LINK}>
                Sign in
              </Link>
              <Link to="/signup" className={FOOTER_LINK}>
                Create an account
              </Link>
              <Link to="/account" className={FOOTER_LINK}>
                My account
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-card border border-line bg-canvas-sunk/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg text-ink">Planning an event?</p>
            <p className="mt-1 text-sm text-ink-soft">
              Send the Planner a message with your date and what you have in mind.
            </p>
          </div>
          {/* Absent entirely when WHATSAPP_NUMBER is unset — never a dead link. */}
          <WhatsAppButton message={FOOTER_WA_MESSAGE} className="shrink-0" />
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Bloom &amp; Aisle Events</p>
          <p>
            All prices in Malaysian Ringgit, e.g.{" "}
            <span className="whitespace-nowrap font-medium text-ink-soft">RM 1,250.00</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
