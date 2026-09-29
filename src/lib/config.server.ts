/**
 * Server-only configuration.
 *
 * This file is named `*.server.ts` on purpose: TanStack Start refuses to bundle
 * a `.server` module into client code, so `SUPABASE_SERVICE_ROLE_KEY` and
 * `SUPABASE_DB_URL` cannot leak into the browser even by accident. Only
 * `SUPABASE_URL` and `SUPABASE_ANON_KEY` are ever sent to the client, and only
 * through the one route that is meant to do that: `/api/config`.
 *
 * Nothing here hardcodes a value: every value comes from `process.env` at call
 * time (not at module load), so a secret added to the host's environment is
 * picked up without a rebuild, and the app still starts when none exist yet.
 *
 * Never log or return a secret value. `describeConfig()` returns variable
 * NAMES and booleans only — that is the safe thing to show a human.
 */

/** Environment variable names this app reads. One place, so docs cannot drift. */
export const ENV = {
  supabaseUrl: "SUPABASE_URL",
  supabaseAnonKey: "SUPABASE_ANON_KEY",
  supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  supabaseDbUrl: "SUPABASE_DB_URL",
  adminEmail: "ADMIN_EMAIL",
  whatsappNumber: "WHATSAPP_NUMBER",
} as const;

/** Every variable the app knows about, in the order `.env.example` lists them. */
export const ALL_ENV_VARS: readonly string[] = [
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  ENV.supabaseServiceRoleKey,
  ENV.supabaseDbUrl,
  ENV.adminEmail,
  ENV.whatsappNumber,
];

function read(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value === "" ? null : value;
}

/** Public. Safe for the browser; still needed before anything can talk to Supabase. */
export function getSupabaseUrl(): string | null {
  return read(ENV.supabaseUrl);
}

/** Public (Row Level Security, not this key, is what protects the data). */
export function getSupabaseAnonKey(): string | null {
  return read(ENV.supabaseAnonKey);
}

/** SERVER ONLY. Bypasses Row Level Security — never send this to a browser. */
export function getSupabaseServiceRoleKey(): string | null {
  return read(ENV.supabaseServiceRoleKey);
}

/** SERVER ONLY. Postgres connection string, used by `psql` to apply migrations. */
export function getSupabaseDbUrl(): string | null {
  return read(ENV.supabaseDbUrl);
}

/** The Planner's email: the only account that becomes admin at signup. */
export function getAdminEmail(): string | null {
  return read(ENV.adminEmail);
}

/** Digits only, international format, e.g. 60123456789. Not a secret. */
export function getWhatsAppNumber(): string | null {
  return read(ENV.whatsappNumber);
}

/** WhatsApp deep link with a prefilled message, or null when unset. */
export function getWhatsAppLink(message?: string): string | null {
  const number = getWhatsAppNumber();
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/**
 * Can the app talk to its backend at all? Only the two browser-safe values are
 * required; the rest are needed later (migrations, the one-admin rule, the
 * WhatsApp button) and their absence is reported, not fatal.
 */
export function isBackendConfigured(): boolean {
  return getSupabaseUrl() !== null && getSupabaseAnonKey() !== null;
}

export type BackendStatus = {
  /** True once SUPABASE_URL and SUPABASE_ANON_KEY are both set. */
  configured: boolean;
  /** Names of the variables that are set. Never their values. */
  present: string[];
  /** Names of the variables that are missing. */
  missing: string[];
  /** Public Supabase host (no keys), for a human to sanity-check; null if unset or unparseable. */
  supabaseHost: string | null;
  /** Whether the private, server-only extras are in place. */
  hasServiceRoleKey: boolean;
  hasDbUrl: boolean;
  hasAdminEmail: boolean;
  hasWhatsAppNumber: boolean;
};

/**
 * A description of the configuration that is safe to render, log or return over
 * HTTP: names and booleans, so a value can never be printed by accident.
 */
export function describeConfig(): BackendStatus {
  const present = ALL_ENV_VARS.filter((name) => read(name) !== null);
  const missing = ALL_ENV_VARS.filter((name) => read(name) === null);

  let supabaseHost: string | null = null;
  const url = getSupabaseUrl();
  if (url) {
    try {
      supabaseHost = new URL(url).host;
    } catch {
      supabaseHost = null;
    }
  }

  return {
    configured: isBackendConfigured(),
    present,
    missing,
    supabaseHost,
    hasServiceRoleKey: getSupabaseServiceRoleKey() !== null,
    hasDbUrl: getSupabaseDbUrl() !== null,
    hasAdminEmail: getAdminEmail() !== null,
    hasWhatsAppNumber: getWhatsAppNumber() !== null,
  };
}

/**
 * What the browser is allowed to know. Only SUPABASE_URL and SUPABASE_ANON_KEY
 * leave the server — and never the service-role key, the DB URL, or the admin
 * email.
 */
export type PublicConfig = {
  configured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  missing: string[];
};

export function getPublicConfig(): PublicConfig {
  return {
    configured: isBackendConfigured(),
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    missing: [ENV.supabaseUrl, ENV.supabaseAnonKey].filter((name) => read(name) === null),
  };
}
