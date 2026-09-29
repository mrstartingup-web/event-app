import { createFileRoute } from "@tanstack/react-router";

import { getPublicConfig } from "~/lib/config.server";

/**
 * GET /api/config — the ONLY configuration the browser is allowed to have:
 * SUPABASE_URL and SUPABASE_ANON_KEY, both of which are public by design (Row
 * Level Security, not the anon key, is what protects customer data).
 *
 * The service-role key, the Postgres connection string and the admin email live
 * in the same server-only module and are never included in this response. Check
 * with:
 *   curl -s http://localhost:3000/api/config
 * With no environment variables set it answers
 *   {"configured":false,"supabaseUrl":null,"supabaseAnonKey":null,
 *    "missing":["SUPABASE_URL","SUPABASE_ANON_KEY"]}
 * and the site keeps working — later stages render their "backend not
 * configured yet" state instead of crashing.
 */
export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async () => {
        const config = getPublicConfig();
        return Response.json(config, {
          headers: {
            // Config changes when the host restarts with new secrets, so never
            // let a proxy or browser serve a stale copy.
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
