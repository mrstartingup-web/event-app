/**
 * Auth state for the whole client tree: who is signed in, their profile row,
 * and whether they are the Planner.
 *
 * The role rule is the database's, not this file's:
 * `public.profiles.role` is set once at signup by `handle_new_user()` from
 * `app_config.admin_email`, and `enforce_profiles_role_immutable` rejects any
 * attempt to change it through the API — including with the service-role key.
 * So `isAdmin` here is a *display* decision; the real gate is Row Level Security,
 * which refuses an admin-only query no matter what the client believes.
 */
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { describeAuthError } from "./auth-errors";
import { getSupabaseBrowserClient } from "./supabase";
import { useSiteConfig } from "./site-config";

/** The columns of `public.profiles` this app reads. */
export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "customer";
};

export type AuthStatus =
  /** Asking Supabase who is signed in (also the state during SSR). */
  | "loading"
  /** There is no session. */
  | "signed-out"
  /** There is a session. */
  | "signed-in"
  /** No Supabase credentials, so auth cannot be used at all yet. */
  | "unavailable";

export type SignInInput = { email: string; password: string };
export type SignUpInput = SignInInput & { fullName: string; phone: string };

export type SignInResult = { error: string | null };
export type SignUpResult = {
  error: string | null;
  /** The account was created but Supabase wants the email confirmed first. */
  needsEmailConfirmation: boolean;
};

/** Shown instead of a Supabase error when there is no backend to talk to. */
export const BACKEND_NOT_CONNECTED_MESSAGE =
  "The site isn't connected to its backend yet, so accounts can't be used. Please check back soon, or message us on WhatsApp.";

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  /** `profiles.role === 'admin'` — the single Planner account. */
  isAdmin: boolean;
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const config = useSiteConfig();
  // Memoised inside getSupabaseBrowserClient, so this is the same instance for
  // the lifetime of the page.
  const client = useMemo(() => getSupabaseBrowserClient(config), [config]);

  // The *initial* status must be identical on the server and on the first client
  // render, or React reports a hydration mismatch. The server knows only whether
  // credentials exist, so "configured but unknown session" is "loading" in both
  // places and the effect below resolves it after hydration.
  const [status, setStatus] = useState<AuthStatus>(
    config.configured ? "loading" : "unavailable",
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!client) {
      setStatus("unavailable");
      setUser(null);
      setProfile(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async (userId: string) => {
      const { data, error } = await client
        .from("profiles")
        .select("id, full_name, phone, role")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setProfile(error ? null : (data as Profile | null));
    };

    const applySession = (session: Session | null) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? "signed-in" : "signed-out");
      if (session?.user) {
        // Deferred out of the auth callback on purpose: supabase-js holds an
        // internal lock while it notifies listeners, and awaiting another
        // request inside the callback is the documented way to deadlock it.
        setTimeout(() => void loadProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    };

    void client.auth.getSession().then(({ data }) => applySession(data.session ?? null));

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async ({ email, password }: SignInInput): Promise<SignInResult> => {
      if (!client) return { error: BACKEND_NOT_CONNECTED_MESSAGE };
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error ? describeAuthError(error) : null };
    },
    [client],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
      phone,
    }: SignUpInput): Promise<SignUpResult> => {
      if (!client) return { error: BACKEND_NOT_CONNECTED_MESSAGE, needsEmailConfirmation: false };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        // `handle_new_user()` copies these two into the new profile row; the
        // role is decided by the trigger, never by anything sent from here.
        options: { data: { full_name: fullName, phone } },
      });
      if (error) return { error: describeAuthError(error), needsEmailConfirmation: false };

      // With email confirmation on, Supabase deliberately does not reveal that
      // an address is taken — it returns a user with no identities instead of an
      // error. Being honest about that beats a silent "check your email" for an
      // account that will never be created.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          error: "An account with that email already exists. Try signing in instead.",
          needsEmailConfirmation: false,
        };
      }

      return { error: null, needsEmailConfirmation: data.session === null };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
  }, [client]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      profile,
      isAdmin: profile?.role === "admin",
      signIn,
      signUp,
      signOut,
    }),
    [status, user, profile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth() was used outside <AuthProvider> — the provider lives in src/routes/__root.tsx.");
  }
  return value;
}
