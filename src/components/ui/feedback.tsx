import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * `Alert` — a block of feedback (a form error, an honest "not connected yet"
 * notice, a "check your email" confirmation) and `EmptyState` — the placeholder
 * for something that is deliberately not built yet.
 */

export type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_TONES: Record<AlertTone, { wrap: string; title: string }> = {
  info: { wrap: "border-info/25 bg-info-soft", title: "text-info-ink" },
  success: { wrap: "border-success/25 bg-success-soft", title: "text-success-ink" },
  warning: { wrap: "border-warning/30 bg-warning-soft", title: "text-warning-ink" },
  danger: { wrap: "border-danger/25 bg-danger-soft", title: "text-danger-ink" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const styles = ALERT_TONES[tone];
  return (
    <div
      // An error interrupts the customer, so it is announced immediately; a
      // neutral notice is polite (`status`) instead.
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-card border px-4 py-3.5 text-sm", styles.wrap, className)}
    >
      {title ? <p className={cn("font-semibold", styles.title)}>{title}</p> : null}
      {children ? (
        <div className={cn("leading-relaxed text-ink-soft", title ? "mt-1" : undefined)}>{children}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  badge,
  title,
  description,
  action,
  icon,
  className,
}: {
  /** e.g. `<Badge tone="primary">Coming soon</Badge>` */
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-canvas-sunk/60 px-5 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-primary/70">{icon}</div> : null}
      {badge}
      <h3 className="font-display text-lg text-ink sm:text-xl">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
