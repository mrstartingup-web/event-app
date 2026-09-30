import { Link } from "@tanstack/react-router";

import { Alert, Container } from "~/components/ui";
import { useSiteConfig } from "~/lib/site-config";

/**
 * The honest "no backend yet" notice.
 *
 * The owner has not connected a Supabase project, so every page renders sample
 * or placeholder content. This banner says so, on every page, and cannot be
 * dismissed — a customer must never be able to close the only warning that the
 * content is not real. With credentials in place it renders nothing at all.
 *
 * It is driven by the config the root loader read on the server, so it is
 * present in the very first byte of HTML (no flash of sample content looking
 * real) and identical after hydration.
 */
export function BackendBanner() {
  const { configured, missing } = useSiteConfig();
  if (configured) return null;

  return (
    <Container>
      <Alert tone="warning" title="This site is not connected to its backend yet" className="mt-4">
        <p>
          No Supabase credentials are in place, so nothing here is stored or sent anywhere.
          Everything you see is labelled sample and placeholder content, and signing in is not
          possible yet.
        </p>
        {missing.length > 0 ? (
          <p className="mt-2 text-xs">
            Waiting on: <span className="font-mono text-[0.7rem]">{missing.join(", ")}</span>
          </p>
        ) : null}
        <p className="mt-2">
          <Link to="/status" className="font-medium underline">
            See the backend status
          </Link>
        </p>
      </Alert>
    </Container>
  );
}
