/**
 * Money formatting — Malaysian Ringgit only.
 *
 * The brief is explicit: "Currency is Malaysian Ringgit (RM) ONLY. Format all
 * prices as `RM 1,250.00`. No currency switching, no other currencies anywhere."
 * That is why this module exports exactly one price formatter and no locale or
 * currency parameter: there is nothing to configure, so nothing can go wrong.
 *
 * The grouping is done by hand instead of with `Intl.NumberFormat` on purpose:
 * `Intl` output depends on the ICU data the JavaScript runtime was built with,
 * so the same price could format as `1.250,00` on a runtime with different
 * locale data. Hand-formatting is deterministic on the server, in the browser
 * and under `bun` — which matters because the string is rendered during SSR and
 * again during hydration.
 */

/** What every price in this app looks like when there is no price yet. */
export const RM_UNKNOWN = "—";

/** Money may arrive as a Postgres `numeric` (string) or as a JS number. */
export type MoneyValue = number | string;

function toFiniteNumber(amount: MoneyValue): number | null {
  const value = typeof amount === "string" ? Number.parseFloat(amount.trim()) : amount;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Format a Ringgit amount exactly as `RM 1,250.00`: `RM`, one space, comma
 * thousands separators, always two decimals.
 *
 * `formatRM(1250)` → `"RM 1,250.00"`, `formatRM("1234567.5")` → `"RM 1,234,567.50"`.
 *
 * Pass a nullable price (an order that has not been quoted yet, for example) to
 * {@link formatRMMaybe} instead; a non-finite value here means a programming
 * error and is rendered as the zero price rather than `NaN`.
 */
export function formatRM(amount: MoneyValue): string {
  const value = toFiniteNumber(amount) ?? 0;
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `RM ${negative ? "-" : ""}${grouped}.${fraction}`;
}

/**
 * Format a price that may not exist yet: `"RM 1,250.00"`, or `RM_UNKNOWN`
 * (`"—"`) for `null` / `undefined` / a non-numeric value. Use this instead of
 * printing `RM 0.00` for a price nobody has set.
 */
export function formatRMMaybe(amount: MoneyValue | null | undefined): string {
  if (amount === null || amount === undefined) return RM_UNKNOWN;
  const value = toFiniteNumber(amount);
  return value === null ? RM_UNKNOWN : formatRM(value);
}

/**
 * Turn user input ("1,250.00", "RM 1250") into a Ringgit amount for the
 * database, or `null` when it is not a usable number. Kept next to the
 * formatter so money parsing and money printing always agree.
 */
export function parseRM(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}
