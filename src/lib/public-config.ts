/**
 * The shape of `/api/config` and the one place the WhatsApp link is built.
 *
 * This module is deliberately free of `process.env`: it is imported by the
 * browser (the supabase client, the WhatsApp button) as well as by the
 * server-only config module, so it must never contain a secret or a dynamic
 * import of one. Only genuinely public values travel through it:
 *
 *   supabaseUrl / supabaseAnonKey — public by design (Row Level Security, not
 *     this key, is what protects customer data)
 *   whatsappNumber                — the Planner's business number, printed on
 *     the site anyway
 *
 * Everything else the app knows (the service-role key, the database URL, the
 * admin email) stays in `src/lib/config.server.ts` and never reaches the
 * browser.
 */

/** Exactly what `GET /api/config` returns. */
export type PublicConfig = {
  /** True once SUPABASE_URL and SUPABASE_ANON_KEY are both set. */
  configured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** Digits only, international format (e.g. "60123456789"), or null. */
  whatsappNumber: string | null;
  /** Names of the *required* variables that are still missing. Never values. */
  missing: string[];
};

/** The honest "we could not even ask the server" state. */
export const UNCONFIGURED_PUBLIC_CONFIG: PublicConfig = {
  configured: false,
  supabaseUrl: null,
  supabaseAnonKey: null,
  whatsappNumber: null,
  missing: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
};

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Accept whatever the network handed us and produce a usable config. A missing
 * field, a wrong type or a non-JSON body all collapse to the unconfigured state
 * rather than throwing: every caller can then render its "backend not connected
 * yet" state instead of an error page.
 */
export function normalizePublicConfig(raw: unknown): PublicConfig {
  if (raw === null || typeof raw !== "object") return UNCONFIGURED_PUBLIC_CONFIG;
  const source = raw as Record<string, unknown>;
  const supabaseUrl = readString(source, "supabaseUrl");
  const supabaseAnonKey = readString(source, "supabaseAnonKey");
  const missing = Array.isArray(source.missing)
    ? source.missing.filter((name): name is string => typeof name === "string")
    : [];

  return {
    configured: source.configured === true && supabaseUrl !== null && supabaseAnonKey !== null,
    supabaseUrl,
    supabaseAnonKey,
    whatsappNumber: readString(source, "whatsappNumber"),
    missing,
  };
}

/** The message pre-filled into the WhatsApp chat, so the Planner knows the source. */
export const DEFAULT_WHATSAPP_MESSAGE =
  "Hi Bloom & Aisle Events! I'd like to ask about decorating an event.";

/**
 * Build a `wa.me` deep link, or `null` when no usable number is configured.
 *
 * Returning `null` is the whole point: the button renders nothing at all rather
 * than a link to an empty chat (a dead link looks like a broken site to a
 * customer). Non-digits are stripped, so "60123 456 789" and "+60 12-345 6789"
 * both work.
 */
export function whatsappLink(
  number: string | null | undefined,
  message: string = DEFAULT_WHATSAPP_MESSAGE,
): string | null {
  if (typeof number !== "string") return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text = message.trim() === "" ? "" : `?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${digits}${text}`;
}
