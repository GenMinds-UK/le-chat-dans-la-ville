"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Venue } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { type Conversation, createConversation } from "./conversation";

// Contract between voice-npc (implements) and ui-hud (calls from the
// conversation HUD, which is mounted only while venueMode === "talking").
//
// The hook opens a voice session for the venue on mount and closes it on
// unmount. Everything else flows through the game store: voice status and
// errors (setVoice), transcript (upsertTranscript), objectives
// (completeObjective), and the ending (completeVenue then endConversation when
// the conversation finishes with all objectives done; endConversation alone
// when the session ends by itself before that). If the session cannot start or
// drops, voice.status is "error" with a message for the player in voice.error,
// and the conversation stays open so the HUD can show it.
//
// Call it from one component at a time. The session logic is in ./conversation.
export type VoiceSessionControls = {
  /**
   * Ask the NPC to slow down and rephrase more simply. Takes effect in the
   * NPC's next reply (it cannot be made to speak on demand) and lasts for
   * that one reply.
   */
  requestHint(): void;
  muted: boolean;
  setMuted(muted: boolean): void;
};

export function useVoiceSession(venue: Venue): VoiceSessionControls {
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  const conversationRef = useRef<Conversation | null>(null);

  // getVenue() returns a new object on every call, so the session is keyed on
  // the venue's identity (id + language), never on the object.
  const venueRef = useRef(venue);
  useEffect(() => {
    venueRef.current = venue;
  });

  useEffect(() => {
    const conversation = createConversation(venueRef.current);
    conversationRef.current = conversation;
    conversation.setMuted(mutedRef.current);

    // React strict mode mounts, unmounts and mounts again in one go. Starting
    // on the next tick means the first, discarded mount never opens a
    // (billable) session: its timer is cancelled before it fires.
    const timer = setTimeout(() => conversation.start(), 0);

    // Tab closed or navigated away: release the session now. If the page comes
    // back from the back/forward cache, the player is on the shop floor again.
    const onPageHide = () => {
      conversation.dispose();
      const s = useGameStore.getState();
      if (s.venueMode === "talking") s.endConversation();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", onPageHide);
      // The HUD unmounting us means the store already says what happened
      // (leave button, venue left, signed out): close and touch nothing.
      conversation.dispose();
      if (conversationRef.current === conversation) conversationRef.current = null;
    };
  }, [venue.id, venue.lang]);

  const requestHint = useCallback(() => conversationRef.current?.requestHint(), []);

  const setMuted = useCallback((next: boolean) => {
    mutedRef.current = next;
    setMutedState(next);
    conversationRef.current?.setMuted(next);
  }, []);

  return { requestHint, muted, setMuted };
}
