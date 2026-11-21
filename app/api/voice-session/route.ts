import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { getVenue, hasVenue, isLang, isVenueId } from "@/content";
import { buildNpcConfig } from "@/lib/voice/buildNpcConfig";

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
  // ---------------------------------------------------------------------
  // PHASE 3 (platform): before anything else in this handler,
  //   1. require a signed-in user (401 { error } if there is none);
  //   2. cap sessions per user per hour using `voice_sessions`
  //      (429 { error } when over the cap).
  // After a successful create below, insert the `voice_sessions` row
  // (id = session.id, user_id, lang, venue_id, started_at).
  // The client already turns 401 and 429 into readable messages.
  // ---------------------------------------------------------------------

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

    // PHASE 3 (platform): record the session in `voice_sessions` here.

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
  // PHASE 3 (platform): require a signed-in user, check the session is theirs
  // in `voice_sessions`, and set its `ended_at`. The browser calls this with
  // fetch(..., { keepalive: true }) on tab close, so cookies are sent as usual.

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }

  try {
    await client.audio.sessions.close({ sessionId });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[voice-session] close failed:", err);
    return Response.json({ error: errorMessage(err, "failed to close session") }, { status: 502 });
  }
}
