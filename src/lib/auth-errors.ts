/**
 * Turn a Supabase auth failure into something a customer can act on.
 *
 * supabase-js surfaces the raw server message ("Invalid login credentials",
 * "User already registered") and a machine code in `error.code`. Showing the
 * raw string is both unfriendly and, for a couple of codes, misleading — so
 * every branch here maps to one plain sentence that says what happened and what
 * to do next. Unknown failures fall back to the server's own message (or a
 * generic sentence) so a new Supabase code is never a dead end.
 */

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

/** Supabase reports "the project is not configured / unreachable" as a fetch failure. */
function isNetworkFailure(error: AuthErrorLike): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.name === "AuthRetryableFetchError" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  );
}

export function describeAuthError(error: unknown): string {
  const failure = (error ?? {}) as AuthErrorLike;
  const code = (failure.code ?? "").toLowerCase();
  const message = (failure.message ?? "").trim();

  if (isNetworkFailure(failure)) {
    return "We couldn't reach the server. Check your internet connection and try again.";
  }

  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "That email and password don't match. Please check them and try again.";
    case "email_not_confirmed":
      return "Please confirm your email address first — open the link in the email we sent you, then sign in.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "weak_password":
      return "Please choose a password with at least 8 characters, using letters and numbers.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "New sign-ups are switched off for this site at the moment. Please message us on WhatsApp instead.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts just now. Please wait a minute and try again.";
    case "validation_failed":
      return "That doesn't look like a valid email address. Please check it and try again.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "Your session has expired. Please sign in again.";
    default:
      break;
  }

  // No code: match on the message text Supabase uses for the common cases.
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "That email and password don't match. Please check them and try again.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address first — open the link in the email we sent you, then sign in.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts just now. Please wait a minute and try again.";
  }
  if (message !== "") return message;
  return "Something went wrong. Please try again in a moment.";
}
