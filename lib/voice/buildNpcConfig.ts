import type { AudioSessionCreateRequest } from "@mistralai/mistralai/models/components";
import type { Lang, Venue } from "../../content/types";
import { buildInstructions } from "./npcPrompt";
import { OBJECTIVE_TOOL_TIMEOUT_MS, objectiveToolDeclaration } from "./objectives";
import { TTS_MODEL, resolveNpcVoice } from "./voices";

// Server only: called by app/api/voice-session/route.ts. The browser sends
// { venueId, lang } and never sees or supplies this config.

/** The model that plays the NPC and decides when an objective is met. */
export const NPC_LLM_MODEL = "mistral-small-latest";

/** Spoken when the player has been silent for a while. */
const INACTIVITY_LINES: Record<Lang, string[]> = {
  fr: ["Vous êtes toujours là ? Prenez votre temps."],
  es: ["¿Sigue ahí? Tómese su tiempo."],
  de: ["Sind Sie noch da? Lassen Sie sich Zeit."],
};

/** A learner needs time to build a sentence: wait this long before a reminder. */
const INACTIVITY_TIMEOUT_MS = 25_000;
const INACTIVITY_MAX_REMINDERS = 2;

/** Terms the speech recogniser should expect: the shop's items and phrases, and the NPC's name. */
function contextBias(venue: Venue): string[] {
  const terms = [...venue.items, ...venue.phrases].map((v) =>
    v.term.replace(/[¿¡?!….]/g, "").trim(),
  );
  return [...new Set([...terms, venue.npc.name])].filter(Boolean);
}

export function buildNpcConfig(venue: Venue): AudioSessionCreateRequest {
  return {
    instructions: buildInstructions(venue),
    welcomeMessage: venue.welcome,
    llm: { model: NPC_LLM_MODEL },
    stt: { language: venue.lang, contextBias: contextBias(venue) },
    tts: { model: TTS_MODEL, voiceId: resolveNpcVoice(venue) },
    turn: {
      allowInterruptions: true,
      inactivity: {
        timeoutMs: INACTIVITY_TIMEOUT_MS,
        messages: INACTIVITY_LINES[venue.lang],
        maxReminders: INACTIVITY_MAX_REMINDERS,
      },
    },
    tools: [
      { ...objectiveToolDeclaration(venue), timeoutMs: OBJECTIVE_TOOL_TIMEOUT_MS },
      { type: "hang_up" },
    ],
  };
}
