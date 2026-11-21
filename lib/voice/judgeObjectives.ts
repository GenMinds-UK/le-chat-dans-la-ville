import type { Venue } from "../../content/types";

// Server only: a second, independent check of the objectives.
//
// The voice agent's own model (the only one Mistral accepts for voice agents,
// see NPC_LLM_MODEL) plays the shopkeeper well but forgets to call
// complete_objective in about one turn in five, which leaves the player with
// an objective they have said and the game has not ticked. So after each
// player turn the browser sends the recent transcript to
// POST /api/voice-session/judge, which asks a stronger text model the single
// question "which open objectives has the customer achieved?". The hook
// completes the union of what the NPC reported and what the judge found.

/** Not usable for voice agents, but markedly better at this judgement than the small model. */
export const JUDGE_MODEL = "mistral-medium-latest";

export const JUDGE_MAX_LINES = 16;
export const JUDGE_MAX_LINE_CHARS = 400;

export type JudgeLine = { role: "user" | "assistant"; content: string };

const LANGUAGE_NAME = { fr: "French", es: "Spanish", de: "German" } as const;

/** The example phrase in a hint: its last double-quoted text. */
function hintPhrase(hint: string): string | null {
  const quoted = hint.match(/"[^"]+"|“[^”]+”/g);
  const last = quoted?.[quoted.length - 1];
  return last ? last.slice(1, -1).trim() : null;
}

/** Chat messages for the judge. `done` objectives are left out: they cannot be un-achieved. */
export function buildJudgeMessages(
  venue: Venue,
  done: readonly string[],
  lines: readonly JudgeLine[],
): { role: "system" | "user"; content: string }[] {
  const language = LANGUAGE_NAME[venue.lang];
  const open = venue.objectives.filter((o) => !done.includes(o.id));
  const objectives = open
    .map((o) => {
      const phrase = hintPhrase(o.hint);
      return `- ${o.id}: ${o.text}${phrase ? ` (a sentence that would achieve it: "${phrase}")` : ""}`;
    })
    .join("\n");

  const system = `You check a language learner's progress in a spoken role-play. The learner is the CUSTOMER in a shop called "${venue.name}" and has to speak ${language}. The SHOPKEEPER is ${venue.npc.name}. The transcript comes from speech recognition, so it may contain recognition and spelling mistakes.

Open objectives (id: what the customer has to do):
${objectives}

Go through every CUSTOMER line, one by one, and decide which of these objectives the CUSTOMER has achieved anywhere in the transcript. An objective achieved in an earlier line stays achieved.

Rules:
- Only CUSTOMER lines count. Never credit something only the SHOPKEEPER said. What the shopkeeper says never cancels what the customer said.
- Be generous with a beginner. Judge the meaning, not the form: wrong grammar, wrong gender, wrong word order, missing words, a missing "please", an informal word (any greeting counts as a greeting, any way of saying goodbye counts as goodbye) and recognition or spelling mistakes do not matter when you can tell what the customer meant.
- The customer has to say it in ${language}. First check the language of each CUSTOMER line: ignore completely a line that is in English or another language, even if its meaning would achieve an objective.
- A bare "yes" or "no" achieves an objective only if the objective is to answer a question and the shopkeeper asked that question. It never achieves an objective that requires the customer to ask for something or ask a question.
- If the objective names a quantity ("two loaves"), the customer has to ask for that quantity.
- If the objective has two parts ("say thank you and goodbye"), both are needed, in one line or in consecutive customer lines.

Answer with JSON only, in this shape: {"achieved": ["objective_id"]}. Use only ids from the list above. Use an empty list if none is achieved.`;

  const transcript = lines
    .slice(-JUDGE_MAX_LINES)
    .map((l) => `${l.role === "user" ? "CUSTOMER" : "SHOPKEEPER"}: ${l.content.slice(0, JUDGE_MAX_LINE_CHARS)}`)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: `Transcript:\n${transcript}` },
  ];
}

/** Reads the judge's reply, keeping only ids that are real, open objectives. */
export function parseJudgeReply(venue: Venue, done: readonly string[], reply: unknown): string[] {
  if (typeof reply !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(reply);
  } catch {
    return [];
  }
  const achieved = (parsed as { achieved?: unknown } | null)?.achieved;
  if (!Array.isArray(achieved)) return [];
  const open = venue.objectives.map((o) => o.id).filter((id) => !done.includes(id));
  return open.filter((id) => achieved.includes(id));
}
