import { Link } from "@tanstack/react-router";

import { cn } from "~/lib/cn";

/**
 * The brand: a serif wordmark with the monogram beside it. Used by the header
 * (as a link home) and the footer (as a static block).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary-soft font-display text-base text-primary-ink"
      >
        B
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg text-ink">Bloom &amp; Aisle</span>
        <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-primary">
          Events
        </span>
      </span>
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="Bloom & Aisle Events — home" className={cn("rounded-card", className)}>
      <BrandMark />
    </Link>
  );
}
