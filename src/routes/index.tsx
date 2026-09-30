import { Link, createFileRoute } from "@tanstack/react-router";

import { WhatsAppButton } from "~/components/whatsapp-button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Container,
  EmptyState,
  SectionHeading,
  buttonClasses,
} from "~/components/ui";
import { formatRM } from "~/lib/money";
import { useSiteConfig } from "~/lib/site-config";

/**
 * Home page (Stage 1b).
 *
 * It introduces the Planner's service and gives a customer something to do
 * today — message on WhatsApp or create an account. The portfolio and catalog
 * blocks are explicitly placeholders: those pages are Stage 2 of the build, and
 * pretending otherwise (fake projects, made-up "featured" items) would be
 * dishonest and would have to be undone.
 *
 * The price strip is the one place a price appears in this stage, and it is
 * labelled SAMPLE: it exists to show the Ringgit formatting the whole product
 * uses (`RM 1,250.00`) and it is rendered through the shared `formatRM()`
 * helper, not with a hand-written string.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom & Aisle Events — Wedding & Event Planning, Styling and Decor" },
      {
        name: "description",
        content:
          "Wedding and event planning, styling and decor. See the Planner's real portfolio, " +
          "explore the decor catalog in Ringgit, and preview your venue before you book.",
      },
    ],
  }),
  component: HomePage,
});

/** Placeholder prices, clearly labelled. Replaced by real catalog items in Stage 2. */
const SAMPLE_PRICES: { name: string; price: number }[] = [
  { name: "Balloon garland arch", price: 450 },
  { name: "Fresh floral centrepiece", price: 120 },
  { name: "Fairy-light backdrop", price: 780 },
  { name: "Full wedding styling package", price: 12500 },
];

const SERVICES = [
  {
    title: "Planning & coordination",
    body:
      "From the first idea to the running order on the day: venue visits, supplier coordination " +
      "and a timeline everyone can follow.",
  },
  {
    title: "Decor, florals & styling",
    body:
      "Arches, backdrops, balloon work, table settings and lighting, chosen from a catalog priced " +
      "in Ringgit so there are no surprises.",
  },
];

export function HomePage() {
  const { configured } = useSiteConfig();

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-line bg-linear-to-b from-primary-soft/70 via-canvas to-canvas">
        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl">
            <Badge tone="primary">Weddings · Birthdays · Corporate</Badge>
            <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
              Celebrations, styled beautifully — from the first idea to the last candle.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
              Bloom &amp; Aisle Events is a planning and decorating studio for weddings and
              celebrations. One planner works with you end to end: the concept, the decor, the
              setup on the day.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {/* Renders nothing at all when WHATSAPP_NUMBER is unset. */}
              <WhatsAppButton
                size="lg"
                message="Hi Bloom & Aisle Events! I'd like to plan an event. Here is what I have in mind:"
              />
              <Link to="/signup" className={buttonClasses("secondary", "lg")}>
                Create an account
              </Link>
              <Link to="/login" className={buttonClasses("ghost", "lg")}>
                Sign in
              </Link>
            </div>

            <p className="mt-3 text-xs text-ink-muted">
              Accounts let you save your designs, track quotes and message the Planner. Prices are
              always in Malaysian Ringgit.
            </p>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------- what we do */}
      <Container className="py-14 sm:py-16">
        <SectionHeading
          eyebrow="What we do"
          title="Planning, styling and decor — handled by one planner"
          description="You brief one person and deal with one person, from the concept board to the
            final pack-down."
        />

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <Card key={service.title}>
              <CardTitle>{service.title}</CardTitle>
              <CardContent>
                <CardDescription>{service.body}</CardDescription>
              </CardContent>
            </Card>
          ))}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Your venue, previewed</CardTitle>
              <Badge tone="accent">Next stage</Badge>
            </div>
            <CardContent>
              <CardDescription>
                Upload photos of your venue, arrange the Planner&rsquo;s decor items on top of them
                and see an estimate before you commit. This is a 2D mockup, not a 3D or AI render,
                and it is built in the next stage of the site.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 rounded-card border border-line bg-canvas-sunk/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">Sample price list</h3>
            <Badge tone="muted">Sample — not real prices</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Placeholder rows that show how every price on this site is formatted. The real catalog,
            managed by the Planner, arrives in the next stage.
          </p>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {SAMPLE_PRICES.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink-soft">{item.name}</span>
                <span className="font-medium tabular-nums text-ink">{formatRM(item.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* -------------------------------------------------- featured portfolio */}
      <section className="border-y border-line bg-canvas-sunk/50">
        <Container className="py-14 sm:py-16">
          <SectionHeading
            eyebrow="Portfolio"
            title="Featured work"
            description="Real weddings and celebrations, photographed by the Planner."
          />
          <div className="mt-8">
            <EmptyState
              badge={<Badge tone="primary">Arriving in the next stage</Badge>}
              title="The portfolio gallery is not published yet"
              description="A filterable gallery with a lightbox and project detail pages — weddings,
                birthdays, corporate events — is the next thing being built. There are no sample
                projects shown here on purpose: this space will hold the Planner's real photographs."
              action={
                <WhatsAppButton
                  variant="secondary"
                  label="Ask to see recent work"
                  message="Hi Bloom & Aisle Events! Could you share some recent work and pricing?"
                />
              }
            />
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------- featured catalog */}
      <Container className="py-14 sm:py-16">
        <SectionHeading
          eyebrow="Catalog"
          title="Featured decor items"
          description="Balloons, backdrops, florals, table settings, lighting and arches — priced in RM."
        />
        <div className="mt-8">
          <EmptyState
            badge={<Badge tone="primary">Arriving in the next stage</Badge>}
            title="The item catalog is not published yet"
            description="The browsable catalog, grouped by category with a price in Ringgit on every
              item, is built in the next stage. What you see above is a clearly-labelled sample of
              the price format, not a real price list."
            action={
              <WhatsAppButton
                label="Ask about decor items"
                message="Hi Bloom & Aisle Events! I'd like to ask about your decor items and prices."
              />
            }
          />
        </div>
      </Container>

      {/* ------------------------------------------------------------- closing */}
      <section className="border-t border-line bg-surface">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-col items-start gap-6 rounded-card border border-line bg-canvas-sunk/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl">Tell us about your event</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
                Send your date, venue and what you have in mind. If you would rather keep everything
                in one place, create an account and the Planner can quote you here on the site.
              </p>
              {!configured ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Accounts open as soon as the site&rsquo;s backend is connected — the banner at the
                  top of this page explains what is still missing.
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <WhatsAppButton
                size="lg"
                message="Hi Bloom & Aisle Events! I'd like to plan an event. Here is what I have in mind:"
              />
              <Link to="/account" className={buttonClasses("secondary", "lg")}>
                My account
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
