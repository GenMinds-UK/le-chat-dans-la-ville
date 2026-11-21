"use client";

import type { Venue } from "@/content/types";
import { useVoiceSession } from "@/lib/voice/useVoiceSession";
import ConversationHud from "./ConversationHud";

// Mounting this component is what opens the (billable) voice session, and
// unmounting it closes it. Mount it only while venueMode === "talking" (Hud
// does that) and never in the dev preview, which renders ConversationHud with
// fake controls instead.
export default function LiveConversation({ venue }: { venue: Venue }) {
  const controls = useVoiceSession(venue);
  return <ConversationHud venue={venue} controls={controls} />;
}
