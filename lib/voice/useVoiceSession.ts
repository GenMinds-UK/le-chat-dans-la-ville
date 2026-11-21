"use client";

import type { Venue } from "@/content/types";

// Contract between voice-npc (implements) and ui-hud (calls from the
// conversation HUD, which is mounted only while venueMode === "talking").
//
// The hook opens a voice session for the venue on mount and closes it on
// unmount. Everything else flows through the game store: voice status and
// errors (setVoice), transcript (upsertTranscript), objectives
// (completeObjective), and the ending (completeVenue then endConversation when
// the NPC hangs up with all objectives done; endConversation alone otherwise).
export type VoiceSessionControls = {
  /** Ask the NPC to slow down and rephrase its last line more simply. */
  requestHint(): void;
  muted: boolean;
  setMuted(muted: boolean): void;
};

// Phase 0 stub: voice-npc replaces the body, keeping this signature.
export function useVoiceSession(_venue: Venue): VoiceSessionControls {
  return { requestHint() {}, muted: false, setMuted() {} };
}
