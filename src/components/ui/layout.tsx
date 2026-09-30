import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * Layout primitives: `Container` keeps every page on the same measure, `Card`
 * is the raised surface used for every block of content.
 */

export function Container({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  // Mobile-first: 1rem of side padding at 360px, growing to 2rem on desktop.
  // `max-w-5xl` keeps body copy at a readable line length on a wide screen.
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8", className)} {...rest}>
      {children}
    </div>
  );
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-lg text-ink sm:text-xl", className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-ink-soft", className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4", className)} {...rest}>
      {children}
    </div>
  );
}
