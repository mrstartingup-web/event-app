/**
 * Tiny class-name joiner.
 *
 * Deliberately not `clsx`/`tailwind-merge`: the primitives in
 * `src/components/ui` take a `className` prop that is appended last, and plain
 * concatenation is enough for that. Conditional entries are just `false`/`null`
 * when absent, so nothing has to be imported to build a variant string.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
