import type { Lang, Venue } from "../../content/types";

// Voices chosen from client.audio.voices.list() (66 presets on 2026-11-21).
// The catalogue has four French speakers, one Spanish and one German, all
// female; the full notes are in .agents/skills/mistral-voice/SKILL.md.
//
// Values are voice slugs. The API also accepts the voice's UUID.

/** Text-to-speech model. The "voice_*" presets are rejected by voxtral-mini-tts-latest. */
export const TTS_MODEL = "voxtral-mini-tts-3";

/** Keyed by NPC sprite (content/venues.ts `npcSprite`). */
export type NpcSprite = "baker" | "pharmacist" | "cashier" | "banker";

export const NPC_VOICES: Record<Lang, Record<NpcSprite, string>> = {
  fr: {
    baker: "fr_marie_happy", // Marie - Happy: tagged warm / radiant
    pharmacist: "voice_3141", // Camille
    cashier: "voice_589", // Lea
    banker: "voice_3137", // Manon
  },
  es: {
    // Elena is the only Spanish voice.
    baker: "voice_483",
    pharmacist: "voice_483",
    cashier: "voice_483",
    banker: "voice_483",
  },
  de: {
    // Heidi is the only German voice.
    baker: "voice_481",
    pharmacist: "voice_481",
    cashier: "voice_481",
    banker: "voice_481",
  },
};

/** One clear voice per language for the pronunciation clips (scripts/gen_audio.mjs). */
export const ITEM_VOICE: Record<Lang, string> = {
  fr: "fr_marie_neutral", // Marie - Neutral: tagged composed / steady
  es: "voice_483", // Elena
  de: "voice_481", // Heidi
};

/** Used when a sprite has no entry (a new NPC added before its voice is chosen). */
const FALLBACK_NPC_VOICE: Record<Lang, string> = {
  fr: "voice_592", // Marie
  es: "voice_483",
  de: "voice_481",
};

/** The venue's own voiceId, or the table above while content still says "TODO_VOICE". */
export function resolveNpcVoice(venue: Venue): string {
  const own = venue.npc.voiceId?.trim();
  if (own && own !== "TODO_VOICE") return own;
  const byLang: Record<string, string> = NPC_VOICES[venue.lang];
  return byLang[venue.npc.sprite] ?? FALLBACK_NPC_VOICE[venue.lang];
}
