import { getSupabaseBrowser } from "./client";

// Matches GameState["user"] in GAME_PLAN.md 3.3, so it can go straight to store.setUser.
export type AuthUser = { id: string; email: string };

export const MIN_PASSWORD_LENGTH = 8;

type Result = { user: AuthUser | null; error: string | null; needsConfirmation?: boolean };

const toAuthUser = (u: { id: string; email?: string } | null | undefined): AuthUser | null =>
  u ? { id: u.id, email: u.email ?? "" } : null;

// Plain messages for the failures a player can cause; everything else is generic.
function friendlyError(err: { code?: string; message?: string; status?: number }): string {
  switch (err.code) {
    case "invalid_credentials":
      return "Wrong email or password.";
    case "user_already_exists":
    case "email_exists":
      return "That email is already registered. Try signing in instead.";
    case "weak_password":
      return `Password is too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "email_address_invalid":
    case "validation_failed":
      return "That email address doesn't look right.";
    case "email_not_confirmed":
      return "Please confirm your email first: check your inbox for the link.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    case "signup_disabled":
      return "New accounts are switched off at the moment.";
    default:
      return "Something went wrong. Check your connection and try again.";
  }
}

export async function signUp(email: string, password: string): Promise<Result> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { user: null, error: friendlyError({ code: "weak_password" }) };
  }
  const { data, error } = await getSupabaseBrowser().auth.signUp({ email, password });
  if (error) return { user: null, error: friendlyError(error) };
  // With email confirmation on, Supabase hides "already registered" by returning
  // a user with no identities and no session.
  if (data.user && data.user.identities?.length === 0) {
    return { user: null, error: friendlyError({ code: "user_already_exists" }) };
  }
  // Confirmation is off for v1, so a session comes back. If it is ever switched
  // on there is no session yet and the player must follow the emailed link.
  if (!data.session) return { user: null, error: null, needsConfirmation: true };
  return { user: toAuthUser(data.user), error: null };
}

export async function signIn(email: string, password: string): Promise<Result> {
  const { data, error } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: friendlyError(error) };
  return { user: toAuthUser(data.user), error: null };
}

export async function signOut(): Promise<void> {
  await getSupabaseBrowser().auth.signOut();
}

// Calls back with the current user straight away (so a reload restores the
// session) and again on every sign-in and sign-out. Returns an unsubscribe
// function. Wire it to the game store: watchAuthUser(useGameStore.getState().setUser).
export function watchAuthUser(onChange: (user: AuthUser | null) => void): () => void {
  const { data } = getSupabaseBrowser().auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
      onChange(toAuthUser(session?.user));
    }
  });
  return () => data.subscription.unsubscribe();
}
