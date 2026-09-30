/**
 * Button — the one interactive primitive.
 *
 * `buttonClasses()` is exported alongside the component on purpose: an internal
 * link in this app is a TanStack Router `<Link>`, not a `<button>` and not an
 * `<a href>`, so those call sites use
 * `<Link className={buttonClasses("primary")}>`. One definition of a button's
 * look, three elements that can carry it.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-colors " +
  "select-none disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  /** The main action on a page. */
  primary: "bg-primary text-white shadow-soft hover:bg-primary-hover",
  /** A quieter alternative next to a primary button. */
  secondary: "border border-line-strong bg-surface text-ink hover:bg-primary-soft",
  /** An inline, text-like action. */
  ghost: "text-primary-ink hover:bg-primary-soft",
  /** WhatsApp only — reserved for "Chat on WhatsApp" so it stays recognisable. */
  whatsapp: "bg-wa text-white shadow-soft hover:bg-wa-hover",
};

const SIZES: Record<ButtonSize, string> = {
  // Touch targets stay at least ~44px tall on a phone, which is why the small
  // size is still 36px + comfortable padding rather than a desktop-tiny button.
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm sm:text-base",
  lg: "px-6 py-3 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
