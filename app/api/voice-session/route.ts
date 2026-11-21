import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { getVenue, hasVenue, isLang, isVenueId } from "@/content";
import { buildNpcConfig } from "@/lib/voice/buildNpcConfig";
import {
  markSessionEnded,
  ownsSession,
  recordSession,
  requireSessionAllowance,
  requireUser,
} from "@/lib/supabase/voiceGuard";

// Server-side only: the API key is used here and in ./judge/route.ts, nowhere
// else. The browser sends { venueId, lang } and receives just
// { id, participantToken, serverUrl }; the NPC's prompt, tools, speech
// recognition and voice are built here from content/ (GAME_PLAN.md 3.4).
export const runtime = "nodejs";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const Body = z.object({ venueId: z.string(), lang: z.string() });

const errorMessage = (err: unknown, fallback: string): string => {
  const e = err as { body?: unknown; message?: unknown } | null;
  if (typeof e?.body === "string") {
    try {
      const detail = JSON.parse(e.body) as { message?: unknown; detail?: unknown };
      if (typeof detail.message === "string") return detail.message;
      if (detail.detail) return JSON.stringify(detail.detail);
    } catch {
      // not JSON: fall through to the plain message
    }
  }
  return typeof e?.message === "string" ? e.message : fallback;
};

export async function POST(request: Request) {
  // A signed-in user is required (401) and sessions are capped per user per
  // hour (429). Without this anyone could spend the Mistral key.
  const guard = await requireSessionAllowance();
  if (!guard.ok) return guard.response;

  if (!process.env.MISTRAL_API_KEY) {
    return Response.json(
      { error: "MISTRAL_API_KEY is not set on the server (.env.local)" },
      { status: 500 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "expected a JSON body { venueId, lang }" }, { status: 400 });
  }
  const { venueId, lang } = parsed.data;
  if (!isLang(lang)) {
    return Response.json({ error: `unknown lang "${lang}"` }, { status: 400 });
  }
  if (!isVenueId(venueId) || !hasVenue(lang, venueId)) {
    return Response.json({ error: `unknown venue "${venueId}" for "${lang}"` }, { status: 400 });
  }

  try {
    const session = await client.audio.sessions.create(buildNpcConfig(getVenue(lang, venueId)));

    // The row is what the hourly cap counts and what lets the owner close the
    // session, so a session that cannot be recorded is not handed out.
    if (!(await recordSession(guard, { id: session.id, lang, venueId }))) {
      await client.audio.sessions.close({ sessionId: session.id }).catch(() => {});
      return Response.json(
        { error: "Could not start the conversation. Try again in a moment." },
        { status: 503 },
      );
    }

    // Only the connection credentials go to the browser, never the key.
    return Response.json({
      id: session.id,
      participantToken: session.participantToken,
      serverUrl: session.serverUrl,
    });
  } catch (err) {
    console.error("[voice-session] create failed:", err);
    return Response.json({ error: errorMessage(err, "failed to create session") }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  // Only the signed-in owner can close a session. The browser calls this with
  // fetch(..., { keepalive: true }) on tab close, so cookies are sent as usual.
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }

  if (!(await ownsSession(guard, sessionId))) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }

  try {
    await client.audio.sessions.close({ sessionId });
    await markSessionEnded(guard, sessionId);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[voice-session] close failed:", err);
    return Response.json({ error: errorMessage(err, "failed to close session") }, { status: 502 });
  }
}
