import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Lang, VenueId } from "@/content/types";
import { getServerUser } from "./server";

// Protection for the routes that spend the Mistral key (GAME_PLAN.md phase 3):
// a signed-in user is required, voice sessions are capped per user per hour
// using the `voice_sessions` table, and the per-turn judge is rate-limited.
// All queries run as the signed-in user, so row-level security applies.

/** Voice sessions one user may open in any rolling hour. */
export const SESSIONS_PER_HOUR = 20;
/** Judge calls one user may make per minute; a conversation makes one per player turn. */
export const JUDGE_CALLS_PER_MINUTE = 60;

const HOUR_MS = 60 * 60 * 1000;

export type Guard =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; response: Response };

const deny = (status: number, error: string): Guard => ({
  ok: false,
  response: Response.json({ error }, { status }),
});

/** The signed-in user, or a 401 response to return as-is. */
export async function requireUser(): Promise<Guard> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return deny(500, "Sign-in is not configured on the server.");
  }
  const { supabase, user } = await getServerUser();
  if (!user) return deny(401, "Sign in to talk to the shopkeepers.");
  return { ok: true, supabase, user };
}

/** requireUser, plus a 429 when the user has opened too many sessions in the last hour. */
export async function requireSessionAllowance(): Promise<Guard> {
  const guard = await requireUser();
  if (!guard.ok) return guard;

  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await guard.supabase
    .from("voice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", guard.user.id)
    .gte("started_at", since);
  if (error) {
    // Fail closed: without the count the cap cannot be enforced.
    console.error("[voice-guard] count failed:", error.message);
    return deny(503, "Could not check your conversation allowance. Try again in a moment.");
  }
  if ((count ?? 0) >= SESSIONS_PER_HOUR) {
    return deny(
      429,
      `You have had ${SESSIONS_PER_HOUR} conversations in the last hour. Take a break and try again later.`,
    );
  }
  return guard;
}

/** Records a session that was just opened. False if the row could not be written. */
export async function recordSession(
  g: { supabase: SupabaseClient; user: User },
  session: { id: string; lang: Lang; venueId: VenueId },
): Promise<boolean> {
  const { error } = await g.supabase.from("voice_sessions").insert({
    id: session.id,
    user_id: g.user.id,
    lang: session.lang,
    venue_id: session.venueId,
  });
  if (error) console.error("[voice-guard] record failed:", error.message);
  return !error;
}

/** True if the session belongs to the user (row-level security hides everyone else's). */
export async function ownsSession(
  g: { supabase: SupabaseClient; user: User },
  sessionId: string,
): Promise<boolean> {
  const { data, error } = await g.supabase
    .from("voice_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", g.user.id)
    .maybeSingle();
  if (error) console.error("[voice-guard] lookup failed:", error.message);
  return Boolean(data);
}

export async function markSessionEnded(
  g: { supabase: SupabaseClient; user: User },
  sessionId: string,
): Promise<void> {
  const { error } = await g.supabase
    .from("voice_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", g.user.id);
  if (error) console.error("[voice-guard] mark ended failed:", error.message);
}

/** True if the user has a conversation open right now (started within the hour, not ended). */
export async function hasOpenSession(g: { supabase: SupabaseClient; user: User }): Promise<boolean> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await g.supabase
    .from("voice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", g.user.id)
    .is("ended_at", null)
    .gte("started_at", since);
  if (error) {
    console.error("[voice-guard] open-session check failed:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

// Per-instance sliding window. Serverless instances do not share it, so it is a
// brake on a single runaway client rather than a hard limit; the hard limit on
// spend is that judge calls need an open, capped voice session.
const judgeCalls = new Map<string, number[]>();

export function judgeRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (judgeCalls.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= JUDGE_CALLS_PER_MINUTE) {
    judgeCalls.set(userId, recent);
    return true;
  }
  recent.push(now);
  judgeCalls.set(userId, recent);
  if (judgeCalls.size > 5000) {
    for (const [id, times] of judgeCalls) {
      if (!times.some((t) => now - t < 60_000)) judgeCalls.delete(id);
    }
  }
  return false;
}
