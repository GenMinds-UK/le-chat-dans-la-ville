"use client";

import { useState } from "react";
import type { Venue } from "@/content/types";
import { useGameStore, type GameState } from "@/lib/state/gameStore";
import { portraitUrl } from "./content";
import { Panel, PxButton, PxImg, cx } from "./ui";

/** The part of useVoiceSession's result the HUD needs. The dev preview passes a fake. */
export type ConversationControls = {
  requestHint(): void;
  muted: boolean;
  setMuted(muted: boolean): void;
};

type Voice = GameState["voice"];

function statusOf(voice: Voice, muted: boolean, npcName: string) {
  if (voice.status === "error") return { tone: "error", text: "Connection problem" };
  if (voice.status !== "live") return { tone: "wait", text: "Connecting…" };
  if (muted) return { tone: "muted", text: "Your microphone is muted" };
  switch (voice.agentState) {
    case "listening":
      return { tone: "listen", text: "Listening: your turn to speak" };
    case "speaking":
      return { tone: "speak", text: `${npcName} is speaking` };
    case "thinking":
      return { tone: "wait", text: `${npcName} is thinking…` };
    default:
      return { tone: "listen", text: "Live: speak when you are ready" };
  }
}

/**
 * Everything on screen during a conversation, drawn from the store alone:
 * objective checklist (top), mic and voice status, hint / mute / leave buttons
 * and the dialogue box (bottom). The middle of the screen is left clear for
 * the NPC and the cat. It opens no voice session: LiveConversation does that.
 * Reads: voice, transcript, objectivesDone. Writes: endConversation.
 */
export default function ConversationHud({
  venue,
  controls,
}: {
  venue: Venue;
  controls: ConversationControls;
}) {
  const voice = useGameStore((s) => s.voice);
  const transcript = useGameStore((s) => s.transcript);
  const objectivesDone = useGameStore((s) => s.objectivesDone);
  const endConversation = useGameStore((s) => s.endConversation);

  const [hintFor, setHintFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const next = venue.objectives.find((o) => !objectivesDone.includes(o.id)) ?? null;
  const doneCount = venue.objectives.filter((o) => objectivesDone.includes(o.id)).length;
  const hintShown = next !== null && hintFor === next.id;

  const lastOf = (role: "assistant" | "user") => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === role && transcript[i].content.trim()) return transcript[i];
    }
    return null;
  };
  const npcLine = lastOf("assistant");
  const userLine = lastOf("user");

  const isError = voice.status === "error";
  const status = statusOf(voice, controls.muted, venue.npc.name);

  const askHint = () => {
    if (next) setHintFor(next.id);
    controls.requestHint();
  };

  return (
    <div className="convo">
      <div className="convo-top">
        <Panel className={cx("objectives", showAll && "is-expanded")}>
          <div className="objectives-head">
            <h2>Your goals</h2>
            <button
              type="button"
              className="objectives-toggle"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              {doneCount}/{venue.objectives.length} {showAll ? "-" : "+"}
            </button>
            <span className="objectives-count">
              {doneCount}/{venue.objectives.length}
            </span>
          </div>
          <ol>
            {venue.objectives.map((o) => {
              const done = objectivesDone.includes(o.id);
              return (
                <li
                  key={o.id}
                  className={cx("objective", done && "is-done", o.id === next?.id && "is-next")}
                >
                  <PxImg src={done ? "/game/ui/check_on.png" : "/game/ui/check_off.png"} size={12} />
                  <span>
                    {o.text}
                    <span className="sr-only">{done ? " (done)" : " (to do)"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {!next && <p className="objectives-alldone">All done! Say goodbye.</p>}
          {hintShown && next && (
            <p className="hint" role="status">
              <strong>Hint:</strong> {next.hint}
            </p>
          )}
        </Panel>
      </div>

      <div className="convo-bottom">
        <div className="convo-bar">
          <div className={cx("voice-chip", `is-${status.tone}`)} role="status" aria-live="polite">
            <PxImg src="/game/ui/mic.png" size={16} className="voice-mic" />
            <span>{status.text}</span>
          </div>
          <div className="convo-buttons">
            {!isError && (
              <>
                <PxButton onClick={askHint} disabled={!next || voice.status !== "live"}>
                  Hint
                </PxButton>
                <PxButton
                  variant="quiet"
                  aria-pressed={controls.muted}
                  onClick={() => controls.setMuted(!controls.muted)}
                  disabled={voice.status !== "live"}
                >
                  {controls.muted ? "Unmute" : "Mute"}
                </PxButton>
              </>
            )}
            <PxButton variant="quiet" onClick={endConversation}>
              Leave
            </PxButton>
          </div>
        </div>

        {isError ? (
          <Panel className="dialogue dialogue-error" role="alert">
            <div className="dialogue-text">
              <p className="dialogue-name">The conversation could not start</p>
              <p className="dialogue-line">
                {voice.error || "Something went wrong with the voice connection."}
              </p>
              <p className="hud-note">
                Check that your microphone is allowed for this site, then talk to{" "}
                <span lang={venue.lang}>{venue.npc.name}</span> again.
              </p>
              <PxButton onClick={endConversation}>Back to the shop</PxButton>
            </div>
          </Panel>
        ) : (
          <Panel className="dialogue">
            <div className={cx("dialogue-portrait", voice.agentState === "speaking" && "is-speaking")}>
              <PxImg src={portraitUrl(venue.npc.sprite)} size={24} />
            </div>
            <div className="dialogue-text">
              <p className="dialogue-name" lang={venue.lang}>
                {venue.npc.name}
              </p>
              <p
                className={cx("dialogue-line", npcLine && !npcLine.final && "is-partial")}
                lang={venue.lang}
                aria-live="polite"
              >
                {npcLine ? npcLine.content : voice.status === "live" ? venue.welcome : "…"}
              </p>
              {userLine && (
                <p className={cx("dialogue-you", !userLine.final && "is-partial")}>
                  <span className="dialogue-you-label">You:</span>{" "}
                  <span lang={venue.lang}>{userLine.content}</span>
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
