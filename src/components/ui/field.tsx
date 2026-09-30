import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "~/lib/cn";

/**
 * Form primitives.
 *
 * `Field` owns the label / hint / error wiring: it generates the ids and the
 * `aria-describedby` so a screen reader reads the error message with the input,
 * and `aria-invalid` is set from the same `error` prop. Pages that need the
 * styling without the wrapper (a filter bar, say) can use `inputClasses`.
 */

export function inputClasses(invalid = false, className?: string) {
  return cn(
    // 16px text on mobile: anything smaller makes iOS Safari zoom on focus.
    "block w-full rounded-field border bg-surface px-3.5 py-2.5 text-base text-ink",
    "placeholder:text-ink-muted/70 transition-colors",
    "disabled:cursor-not-allowed disabled:bg-canvas-sunk disabled:text-ink-muted",
    invalid ? "border-danger" : "border-line-strong hover:border-ink-muted/60",
    className,
  );
}

export function Input({
  invalid = false,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={inputClasses(invalid, className)} {...rest} />;
}

export function Textarea({
  invalid = false,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={inputClasses(invalid, cn("min-h-28 resize-y", className))}
      {...rest}
    />
  );
}

export function Field({
  label,
  id,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  /** Must match the `id` of the input inside `children`. */
  id: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
      </label>
      {/* The ids below are what `aria-describedby` on the input should point at. */}
      {children}
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The ids `Field` generates, so the input can point at its hint/error. */
export function describedBy(id: string, opts: { hint?: boolean; error?: boolean }): string | undefined {
  const ids = [opts.hint ? `${id}-hint` : null, opts.error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
