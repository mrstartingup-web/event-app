import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Alert, Button, Card, Container, Field, Input, SectionHeading } from "~/components/ui";
import { BACKEND_NOT_CONNECTED_MESSAGE, useAuth } from "~/lib/auth";
import { useSiteConfig } from "~/lib/site-config";

/**
 * Create an account (email + password).
 *
 * The role is decided by the database, not by this form: the `handle_new_user()`
 * trigger compares the new email with `app_config.admin_email` and writes
 * `role = 'admin'` for that one address, `'customer'` for everyone else — and
 * the role cannot be changed through the API afterwards. There is deliberately
 * no role field here, and nothing in the client could promote anyone.
 *
 * The name and phone are sent as user metadata because that is where the
 * trigger reads them from when it creates the profile row.
 */
export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create an account — Bloom & Aisle Events" },
      {
        name: "description",
        content: "Create a Bloom & Aisle Events account to plan your event with the Planner.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

type FieldName = "fullName" | "email" | "phone" | "password" | "confirmPassword";

export function SignupPage() {
  const { configured } = useSiteConfig();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<FieldName, string>>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  function validate(): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};

    if (values.fullName.trim().length < 2) {
      errors.fullName = "Please tell us your name so the Planner knows who is asking.";
    }
    if (values.email.trim() === "") errors.email = "Please enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      errors.email = "That doesn't look like an email address.";
    }
    // Malaysian numbers are written every which way (012-345 6789, +60 12 345
    // 6789). Count the digits instead of forcing one format.
    const phoneDigits = values.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      errors.phone = "Please enter a phone number the Planner can reach you on, e.g. 012-345 6789.";
    }
    if (values.password.length < 8) {
      errors.password = "Please choose at least 8 characters.";
    }
    if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "The two passwords don't match.";
    }

    return errors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const result = await signUp({
      email: values.email.trim(),
      password: values.password,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
    });
    setSubmitting(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }
    await navigate({ to: "/account" });
  }

  if (confirmationSent) {
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <SectionHeading level={1} eyebrow="Almost there" title="Check your email" />
          <Alert tone="success" title="Your account is created">
            We sent a confirmation link to{" "}
            <span className="font-medium text-ink">{values.email.trim()}</span>. Open it, then{" "}
            <Link to="/login" className="font-medium underline">
              sign in
            </Link>
            . If it doesn&rsquo;t arrive in a few minutes, check the spam folder.
          </Alert>
          <p className="text-sm text-ink-soft">
            Once you are signed in you&rsquo;ll be able to talk to the Planner about your event from
            your account page.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <SectionHeading
          level={1}
          eyebrow="Get started"
          title="Create your account"
          description="So the Planner can quote your event and keep everything in one place."
        />

        {!configured ? (
          <Alert tone="warning" title="Sign-ups are not available yet">
            {BACKEND_NOT_CONNECTED_MESSAGE} The form below is shown so you can see what it will look
            like. <Link to="/status" className="font-medium underline">Backend status</Link>
          </Alert>
        ) : null}

        {formError ? (
          <Alert tone="danger" title="We couldn't create your account">
            {formError}
          </Alert>
        ) : null}

        <Card>
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <Field label="Your name" id="fullName" error={fieldErrors.fullName} required>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Aisyah Rahman"
                value={values.fullName}
                invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                onChange={(event) => set("fullName")(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Field label="Email" id="email" error={fieldErrors.email} required>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(event) => set("email")(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Field
              label="Phone / WhatsApp"
              id="phone"
              error={fieldErrors.phone}
              hint="The Planner uses this to reach you about your event only."
              required
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="012-345 6789"
                value={values.phone}
                invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : "phone-hint"}
                onChange={(event) => set("phone")(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Field
              label="Password"
              id="password"
              error={fieldErrors.password}
              hint="At least 8 characters."
              required
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
                onChange={(event) => set("password")(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Field label="Confirm password" id="confirmPassword" error={fieldErrors.confirmPassword} required>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={values.confirmPassword}
                invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                onChange={(event) => set("confirmPassword")(event.target.value)}
                disabled={!configured || submitting}
              />
            </Field>

            <Button type="submit" size="lg" disabled={!configured || submitting} className="mt-1 w-full">
              {submitting ? "Creating your account…" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary-ink underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-ink-muted">
          The Planner&rsquo;s own account is set up by the site owner, and it is the only
          administrator — nobody can sign up as an admin.
        </p>
      </div>
    </Container>
  );
}
