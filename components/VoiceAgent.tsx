"use client";

import { useEffect, useRef, useState } from "react";

type TranscriptLine = {
  id: string;
  role: string;
  content: string;
  final: boolean;
};

type Status = "idle" | "connecting" | "live" | "error";

// Minimal structural types for the dynamically imported browser SDK,
// so this file compiles even if the SDK types change shape.
type VoiceSession = {
  on(event: string, handler: (e: any) => void): () => void;
  connect(): Promise<void>;
  wait(): Promise<void>;
  close(): Promise<void>;
  setInputEnabled(enabled: boolean): Promise<void>;
  localTrack: MediaStreamTrack | null;
};

export default function VoiceAgent() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [agentState, setAgentState] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);

  // Transcript events are cumulative segments: same id replaces earlier text.
  const upsertLine = (e: any) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === e.id);
      const line: TranscriptLine = {
        id: e.id,
        role: e.role,
        content: e.content,
        final: e.final,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = line;
        return next;
      }
      return [...prev, line];
    });
  };

  const start = async () => {
    setError(null);
    setLines([]);
    setAgentState(null);
    setStatus("connecting");
    try {
      // Browser-only entry point; dynamic import keeps it out of the SSR bundle.
      const { initSession } = await import(
        "@mistralai/mistralai/extra/voice-agents/browser"
      );

      const session: VoiceSession = await initSession({
        createSession: () =>
          fetch("/api/voice-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // Straight from the quickstart:
              instructions: "Please respond to me in the most dramatic way possible.",
              llm: { model: "mistral-small-latest" },
              tts: { voiceId: "fr_marie_neutral" }, // quickstart's tts voice_id
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const msg = await res.text().catch(() => "");
              throw new Error(`create session failed (${res.status}): ${msg}`);
            }
            return res.json();
          }),
        deleteSession: (sessionId: string) =>
          fetch(`/api/voice-session?sessionId=${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
          }).then(() => {}),
      });

      sessionRef.current = session;
      session.on("transcript", upsertLine);
      session.on("agent_state_changed", (e: any) => setAgentState(e?.state ?? null));
      session.on("error", (e: any) => {
        console.error("[voice-agent] error event:", e);
        setError(e?.error?.message ?? e?.message ?? "voice session error");
      });
      session.on("disconnected", () => {
        setStatus("idle");
        setAgentState(null);
        sessionRef.current = null;
      });

      // SDK >= 3: initSession returns a session that is not connected yet.
      await session.connect();
      setStatus("live");
    } catch (err: any) {
      console.error("[voice-agent] start failed:", err);
      setStatus("error");
      setError(err?.message ?? String(err));
      try {
        await sessionRef.current?.close();
      } catch {}
      sessionRef.current = null;
    }
  };

  const stop = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setStatus("idle");
    setMuted(false);
    setAgentState(null);
    try {
      // close() stops the mic, leaves the room, then calls deleteSession
      // on the server so the session is released there too.
      await session?.close();
    } catch (err) {
      console.error("[voice-agent] close failed:", err);
    }
  };

  const toggleMute = async () => {
    const session = sessionRef.current;
    if (!session) return;
    const nextMuted = !muted;
    try {
      await session.setInputEnabled(!nextMuted);
      setMuted(nextMuted);
    } catch (err) {
      console.error("[voice-agent] mute toggle failed:", err);
    }
  };

  // Never leave a session behind when the component unmounts.
  useEffect(() => {
    return () => {
      sessionRef.current?.close().catch(() => {});
    };
  }, []);

  const busy = status === "connecting";
  const live = status === "live";

  return (
    <section>
      <div className="controls">
        {live ? (
          <button onClick={stop}>Hang up</button>
        ) : (
          <button onClick={start} disabled={busy}>
            {busy ? "Connecting…" : "Start talking"}
          </button>
        )}
        {live && (
          <button className="secondary" onClick={toggleMute}>
            {muted ? "Unmute mic" : "Mute mic"}
          </button>
        )}
      </div>

      <div className="status-row">
        <span
          className={[
            "avatar",
            live ? "live" : "",
            agentState === "speaking" ? "speaking" : "",
          ]
            .join(" ")
            .trim()}
          title="Mistral agent"
        >
          {/* Official pixel-cat emblem from mistral.ai/brand — see README */}
          <img src="/avatars/mistral-cat.svg" alt="Mistral cat" width={40} height={40} />
        </span>
        <p className="status">
          {status === "live" ? (
            <>
              <span className="live">● live</span>
              {agentState ? ` — agent: ${agentState}` : ""}
              {muted ? " — mic muted" : ""}
            </>
          ) : status === "connecting" ? (
            "Requesting microphone and session…"
          ) : status === "error" ? (
            "Something went wrong — try again."
          ) : (
            "Press “Start talking” and allow microphone access. Speak; your words appear below as “user:”, the agent answers as “assistant:”."
          )}
        </p>
      </div>

      <ul className="transcript">
        {lines.map((l) => (
          <li key={l.id} className={`role-${l.role}`}>
            {l.role === "assistant" && (
              <img
                className="line-avatar"
                src="/avatars/mistral-cat.svg"
                alt=""
                width={16}
                height={16}
              />
            )}
            <b>{l.role}:</b> {l.content}
            {!l.final ? " …" : ""}
          </li>
        ))}
      </ul>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
