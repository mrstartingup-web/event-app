import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * `SectionHeading` — the eyebrow / title / description block that opens every
 * page section, so headings line up across the site.
 * `Badge` — a small status pill: "Coming soon", a category, a tone.
 */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  level = 2,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /** `h2` by default; pass 1 for a page's main heading. */
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const Heading = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
  const titleSize =
    level === 1
      ? "text-3xl sm:text-4xl lg:text-5xl"
      : level === 2
        ? "text-2xl sm:text-3xl"
        : "text-xl sm:text-2xl";

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      ) : null}
      <Heading className={cn("font-display leading-tight", titleSize)}>{title}</Heading>
      {description ? (
        <p className={cn("text-base leading-relaxed text-ink-soft", align === "center" && "max-w-2xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "muted";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-line-strong bg-canvas-sunk text-ink-soft",
  primary: "border-primary/25 bg-primary-soft text-primary-ink",
  accent: "border-accent/30 bg-accent-soft text-accent-ink",
  success: "border-success/25 bg-success-soft text-success-ink",
  warning: "border-warning/30 bg-warning-soft text-warning-ink",
  muted: "border-line bg-surface text-ink-muted",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
