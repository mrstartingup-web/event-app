import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Alert, Button, Card, Container, Field, Input, SectionHeading } from "~/components/ui";
import { BACKEND_NOT_CONNECTED_MESSAGE, useAuth } from "~/lib/auth";
import { useSiteConfig } from "~/lib/site-config";

/**
 * Sign in.
 *
 * Sign-in is done entirely by supabase-js in the browser: it stores the session
 * in localStorage and refreshes it automatically, so a return visit is still
 * signed in (see `src/lib/auth.tsx`). Row Level Security, not this form, is what
 * decides what the signed-in customer may read.
 *
 * The `redirect` search parameter exists so `/admin` and `/account` can send a
 * signed-out visitor here and still land them in the right place afterwards. It
 * is whitelisted to the two internal destinations — an unvalidated redirect
 * target taken from a URL is an open-redirect bug.
 *
 * It is deliberately **optional**. An earlier version defaulted it to
 * `/account`, which made it a *required* search param: every `<Link to="/login">`
 * had to pass one, and the router canonicalised a plain `GET /login` into a
 * redirect to `/login?redirect=%2Faccount` — a self-redirect that cost the
 * visitor an extra hop. Absent simply means "My account", which is what the
 * header's sign-in link wants anyway.
 */
type LoginSearch = { redirect?: "/account" | "/admin" };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    if (search.redirect === "/admin") return { redirect: "/admin" };
    if (search.redirect === "/account") return { redirect: "/account" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Bloom & Aisle Events" },
      { name: "description", content: "Sign in to your Bloom & Aisle Events account." },
      // A signed-in-only page has nothing to offer a search engine.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

export function LoginPage() {
  const { configured } = useSiteConfig();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: { email?: string; password?: string } = {};
    if (email.trim() === "") errors.email = "Please enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "That doesn't look like an email address.";
    if (password === "") errors.password = "Please enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const result = await signIn({ email: email.trim(), password });
    setSubmitting(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    // No `redirect` in the URL means the visitor signed in from the header, so
    // their account page is the sensible destination.
    await navigate({ to: redirect ?? "/account" });
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <SectionHeading
          level={1}
          eyebrow="Your account"
          title="Sign in"
          description="Track your orders, quotes and messages in one place."
        />

        {!configured ? (
          <Alert tone="warning" title="Signing in is not available yet">
            {BACKEND_NOT_CONNECTED_MESSAGE} The form below is shown so you can see what it will
            look like. <Link to="/status" className="font-medium underline">Backend status</Link>
          </Alert>
        ) : null}

        {formError ? <Alert tone="danger" title="We couldn't sign you in">{formError}</Alert> : null}

        <Card>
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <Field label="Email" id="email" error={fieldErrors.email} required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Field label="Password" id="password" error={fieldErrors.password} required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Button type="submit" size="lg" disabled={!configured || submitting} className="mt-1 w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-ink-soft">
          New here?{" "}
          <Link to="/signup" className="font-medium text-primary-ink underline">
            Create an account
          </Link>
        </p>
      </div>
    </Container>
  );
}
