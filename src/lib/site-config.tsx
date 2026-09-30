/**
 * The public config, for the whole client tree.
 *
 * `__root.tsx` loads it on the server (from `process.env`, at request time) and
 * puts it in this context, so header, footer, WhatsApp button and every page
 * read the same values without a second request and without waiting for an
 * effect after paint. With no secrets configured the context holds the
 * canonical unconfigured payload, which is what makes the "backend not
 * connected yet" state render identically during SSR and after hydration.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DEFAULT_WHATSAPP_MESSAGE,
  UNCONFIGURED_PUBLIC_CONFIG,
  whatsappLink,
  type PublicConfig,
} from "./public-config";

const SiteConfigContext = createContext<PublicConfig>(UNCONFIGURED_PUBLIC_CONFIG);

export function SiteConfigProvider({
  config,
  children,
}: {
  config: PublicConfig;
  children: ReactNode;
}) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

/** The public config. Never contains a secret. */
export function useSiteConfig(): PublicConfig {
  return useContext(SiteConfigContext);
}

/**
 * `wa.me` link with a prefilled message, or `null` when WHATSAPP_NUMBER is
 * unset — callers must render nothing at all in that case rather than a dead
 * link.
 */
export function useWhatsAppLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string | null {
  const { whatsappNumber } = useSiteConfig();
  return useMemo(() => whatsappLink(whatsappNumber, message), [whatsappNumber, message]);
}
