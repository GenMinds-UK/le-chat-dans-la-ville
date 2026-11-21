import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { getVenue, hasVenue, isLang, isVenueId } from "@/content";
import {
  JUDGE_MAX_LINE_CHARS,
  JUDGE_MAX_LINES,
  JUDGE_MODEL,
  buildJudgeMessages,
  parseJudgeReply,
} from "@/lib/voice/judgeObjectives";
import { hasOpenSession, judgeRateLimited, requireUser } from "@/lib/supabase/voiceGuard";

// POST /api/voice-session/judge
//   { venueId, lang, done: string[], lines: { role, content }[] }
//   -> { achieved: string[] }   objective ids the player has newly achieved
//
// A second opinion on the objectives, from a stronger text model than the one
// voice agents can use (see lib/voice/judgeObjectives.ts for why). One short
// chat completion per player turn; no audio, no session. The prompt is built
// here from content/: the browser supplies only ids and the recent transcript.
// If this route fails the game still works on the NPC's own tool calls.
export const runtime = "nodejs";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const Body = z.object({
  venueId: z.string(),
  lang: z.string(),
  done: z.array(z.string().max(64)).max(16),
  lines: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(JUDGE_MAX_LINE_CHARS * 4),
      }),
    )
    .min(1)
    .max(JUDGE_MAX_LINES * 2),
});

export async function POST(request: Request) {
  // This route spends the Mistral key too: it needs a signed-in user (401),
  // is rate-limited per user (429), and only answers while that user has a
  // conversation open, so its spend is bounded by the voice-session cap.
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  if (judgeRateLimited(guard.user.id)) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }
  if (!(await hasOpenSession(guard))) {
    return Response.json({ error: "no conversation is open" }, { status: 403 });
  }

  if (!process.env.MISTRAL_API_KEY) {
    return Response.json({ error: "MISTRAL_API_KEY is not set on the server" }, { status: 500 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "expected a JSON body { venueId, lang, done, lines }" },
      { status: 400 },
    );
  }
  const { venueId, lang, done, lines } = parsed.data;
  if (!isLang(lang) || !isVenueId(venueId) || !hasVenue(lang, venueId)) {
    return Response.json({ error: "unknown venue or lang" }, { status: 400 });
  }

  const venue = getVenue(lang, venueId);
  if (!lines.some((l) => l.role === "user" && l.content.trim())) {
    return Response.json({ achieved: [] });
  }
  if (venue.objectives.every((o) => done.includes(o.id))) {
    return Response.json({ achieved: [] });
  }

  try {
    const res = await client.chat.complete({
      model: JUDGE_MODEL,
      messages: buildJudgeMessages(venue, done, lines),
      responseFormat: { type: "json_object" },
      temperature: 0,
      maxTokens: 200,
    });
    const achieved = parseJudgeReply(venue, done, res.choices?.[0]?.message?.content);
    return Response.json({ achieved });
  } catch (err) {
    console.error("[voice-session/judge] failed:", err);
    return Response.json({ error: "judge failed" }, { status: 502 });
  }
}
