/**
 * The browser Supabase client.
 *
 * Rules this file exists to keep:
 *
 * 1. **Runtime, never build time.** The URL and anon key are read from
 *    `process.env` on the server and handed to the browser at request time —
 *    either by the root route loader (`__root.tsx`) or by `GET /api/config`.
 *    Nothing is inlined with `import.meta.env`, so the owner can add the secrets
 *    on the host and the next request picks them up without a rebuild.
 * 2. **No secrets here.** Only `supabaseUrl` + `supabaseAnonKey`, which are
 *    public by design; Row Level Security is what protects the data.
 * 3. **Never throw when unconfigured.** Every accessor returns `null` and each
 *    page shows its honest "backend not connected yet" state.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  normalizePublicConfig,
  type PublicConfig,
  UNCONFIGURED_PUBLIC_CONFIG,
} from "./public-config";

/** Where the auth session is kept in the browser. */
const AUTH_STORAGE_KEY = "bloom-and-aisle-auth";

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

/**
 * A client for the given public config, or `null` when the backend is not
 * configured (or when this runs on the server, where there is no `localStorage`
 * to persist a session in).
 *
 * Memoised on "<url>|<anon key>" so React re-renders and route changes reuse one
 * client — a second `createClient` with the same key would open a second
 * `onAuthStateChange` subscription and fight over the stored session.
 */
export function getSupabaseBrowserClient(
  config: PublicConfig | null | undefined,
): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const current = config ?? UNCONFIGURED_PUBLIC_CONFIG;
  if (!current.configured || !current.supabaseUrl || !current.supabaseAnonKey) return null;

  const nextKey = `${current.supabaseUrl}|${current.supabaseAnonKey}`;
  if (client && clientKey === nextKey) return client;

  client = createClient(current.supabaseUrl, current.supabaseAnonKey, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // The email-confirmation link comes back to the site; let supabase-js
      // consume it and raise a SIGNED_IN event.
      detectSessionInUrl: true,
      // Implicit (the default) rather than PKCE: customers often open the
      // confirmation email on a different device from the one they signed up
      // on, and a PKCE verifier stored in one browser cannot be completed in
      // another.
    },
  });
  clientKey = nextKey;
  return client;
}

/** Drop the memoised client (sign-out of a whole environment, tests, /status). */
export function resetSupabaseBrowserClient(): void {
  client = null;
  clientKey = null;
}

/**
 * Ask the server for the public config. Only needed when the root loader's copy
 * is unavailable (for example a full page reload straight into an error state);
 * the normal path is the loader in `__root.tsx`, which has the config before the
 * first byte of HTML.
 *
 * Any failure — offline, 500, HTML instead of JSON — resolves to the
 * unconfigured shape instead of rejecting, so callers never need a `catch`.
 */
export async function fetchPublicConfigFromApi(): Promise<PublicConfig> {
  if (typeof window === "undefined") return UNCONFIGURED_PUBLIC_CONFIG;
  try {
    const response = await fetch("/api/config", {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return UNCONFIGURED_PUBLIC_CONFIG;
    return normalizePublicConfig(await response.json());
  } catch {
    return UNCONFIGURED_PUBLIC_CONFIG;
  }
}
