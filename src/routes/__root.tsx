import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";

import { BackendBanner } from "~/components/backend-banner";
import { NotFoundView } from "~/components/route-states";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { Container, SectionHeading, buttonClasses } from "~/components/ui";
import { AuthProvider } from "~/lib/auth";
import { SiteConfigProvider } from "~/lib/site-config";
import appCss from "~/styles/app.css?url";

/**
 * The app shell: `<head>`, the header/footer chrome, and the two providers every
 * page needs.
 *
 * The public config is read **on the server at request time** and passed down as
 * loader data (a `createServerFn` handler, so the `.server` module never reaches
 * the client bundle). That is what makes the WhatsApp button, the "backend not
 * connected yet" banner and the whole shell correct in the first byte of HTML
 * instead of appearing after hydration — and it means saving a secret on the
 * host takes effect without a rebuild.
 */
const loadPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublicConfig } = await import("~/lib/config.server");
  return getPublicConfig();
});

const TITLE = "Bloom & Aisle Events — Wedding & Event Planning, Styling and Decor";
const DESCRIPTION =
  "Bloom & Aisle Events plans, styles and decorates weddings and celebrations: a real portfolio, " +
  "a decor catalog priced in Malaysian Ringgit, and a mockup of your own venue before you book.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#fdfaf6" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: () => loadPublicConfig(),
  notFoundComponent: NotFoundView,
  errorComponent: RootErrorPage,
  component: RootComponent,
});

function RootComponent() {
  const config = Route.useLoaderData();

  return (
    <RootDocument>
      <SiteConfigProvider config={config}>
        <AuthProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <BackendBanner />
            {/* The page content. `flex-1` keeps the footer at the bottom of a
                short page without any fixed heights. */}
            <div className="flex-1">
              <Outlet />
            </div>
            <SiteFooter />
          </div>
        </AuthProvider>
      </SiteConfigProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootErrorPage({ error }: { error: Error }) {
  return (
    <Container className="py-16 sm:py-24">
      <SectionHeading
        eyebrow="Something went wrong"
        level={1}
        title="This page hit an unexpected error"
        description="Nothing you did caused this. Try the home page, or send us a message on WhatsApp and we will sort it out."
      />
      {/* The message is shown because it is a rendering error, not a secret —
          it is what makes a bug report actionable. */}
      <p className="mt-4 rounded-card border border-line bg-canvas-sunk p-4 font-mono text-xs text-ink-soft">
        {error.message}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className={buttonClasses("primary")}>
          Back to the home page
        </Link>
      </div>
    </Container>
  );
}
