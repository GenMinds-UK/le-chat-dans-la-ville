import type {
  BrowserVoiceEventMap,
  VoiceAgentSession,
} from "@mistralai/mistralai/extra/voice-agents";
import type { Venue } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { buildInstructions } from "./npcPrompt";
import {
  COMPLETE_OBJECTIVE,
  objectiveToolDeclaration,
  objectiveToolResult,
  readObjectiveIds,
} from "./objectives";

// One spoken conversation with a venue's NPC: one Mistral voice session, from
// "the player spoke to the NPC" to "the conversation is over". Browser only.
// useVoiceSession owns the React side; this owns the session and the store
// wiring, with no React in it so the lifecycle can be read top to bottom.
//
// Three flags describe where a conversation is:
//   disposed  the hook let go of us (HUD unmounted, tab closing). The store is
//             no longer ours to touch; all that is left is to close the session.
//   ended     the conversation finished on its own (completed, the session
//             dropped, or it failed to start) and the store has been told.
//   live      connected and talking.

type Session = VoiceAgentSession<BrowserVoiceEventMap>;

export type Conversation = {
  /** Opens the session. Safe to call once; later calls do nothing. */
  start(): void;
  /** Closes the session without touching the store. Idempotent. */
  dispose(): void;
  requestHint(): void;
  setMuted(muted: boolean): void;
};

/** Second opinion on objectives from POST /api/voice-session/judge (see judgeObjectives.ts). */
const JUDGE_ENABLED = true;
const JUDGE_DEBOUNCE_MS = 250;
const JUDGE_LINES = 12;
const JUDGE_MAX_FAILURES = 3;

// Ending once every objective is done. The NPC says goodbye and we close the
// session ourselves (the NPC has no hang_up tool by default, and when it has
// one it does not reliably use it).
/** After the NPC stops speaking its goodbye. */
const GOODBYE_GRACE_MS = 3500;
/** If the NPC has not started speaking this long after the last objective. */
const GOODBYE_NO_SPEECH_MS = 6000;
/** Whatever happens, never keep a finished conversation open longer than this. */
const GOODBYE_MAX_MS = 30000;

/** A session that ended this way simply ended: the NPC hung up, or the server closed the room. */
const NORMAL_END_REASONS = ["session_ended", "server_closed", "client_closed"];

class RouteError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail);
  }
}

class MicrophoneError extends Error {}

/** At most one conversation holds a session at a time, whatever the callers do. */
let current: Conversation | null = null;

export function createConversation(venue: Venue): Conversation {
  const store = () => useGameStore.getState();
  const npc = venue.npc.name;

  let started = false;
  let disposed = false;
  let ended = false;
  let live = false;
  let connecting = false;

  let session: Session | null = null;
  let sessionId: string | null = null;
  let deleteSent = false;

  let wantMuted = false;
  let agentState: string | null = null;
  let userSpoke = false;
  /** Set when the session drops for a reason the player should be told about. */
  let fatalMessage: string | null = null;

  // Instructions are only ever replaced with a full prompt built by
  // buildInstructions(), so a hint or a progress note can never lose the
  // original. `lastPushed` starts as what the server sent at creation.
  let hintActive = false;
  let hintSpoken = false;
  let progressInPrompt = false;
  let lastPushed = buildInstructions(venue);
  let pushChain: Promise<void> = Promise.resolve();

  let judgeTimer: ReturnType<typeof setTimeout> | null = null;
  let judgeFailures = 0;
  let lastJudged = "";
  const judgeAbort = new AbortController();

  let goodbyeArmed = false;
  let npcSpokeSinceDone = false;
  let goodbyeTimer: ReturnType<typeof setTimeout> | null = null;
  let goodbyeCap: ReturnType<typeof setTimeout> | null = null;
  let endFallback: ReturnType<typeof setTimeout> | null = null;

  const active = () => !disposed && !ended;
  const objectiveIds = venue.objectives.map((o) => o.id);
  const doneIds = () => store().objectivesDone.filter((id) => objectiveIds.includes(id));
  const allDone = () => {
    const done = store().objectivesDone;
    return objectiveIds.length > 0 && objectiveIds.every((id) => done.includes(id));
  };

  function clearTimers() {
    for (const t of [judgeTimer, goodbyeTimer, goodbyeCap, endFallback]) if (t) clearTimeout(t);
    judgeTimer = goodbyeTimer = goodbyeCap = endFallback = null;
  }

  // ---- the remote session ----

  /**
   * Tells the server to close the session. `keepalive` lets the request
   * outlive the page, which is what makes closing on tab close work
   * (navigator.sendBeacon can only POST, and the route closes on DELETE).
   */
  function deleteRemote(id: string): Promise<void> {
    if (deleteSent) return Promise.resolve();
    deleteSent = true;
    const send = () =>
      fetch(`/api/voice-session?sessionId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        keepalive: true,
      });
    return send()
      .then((res) => {
        if (!res.ok && res.status >= 500) return send().then(() => undefined);
      })
      .catch(() => {
        // The session expires on Mistral's side if this never arrives.
      });
  }

  function closeSession() {
    if (sessionId) void deleteRemote(sessionId);
    // While connect() is in flight the SDK has no transport to close yet;
    // closing now would let the connect finish afterwards and leave the room
    // and the microphone open. start() closes it once connect() settles.
    if (session && !connecting) void session.close().catch(() => {});
  }

  async function createSession() {
    const res = await fetch("/api/voice-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId: venue.id, lang: venue.lang }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      throw new RouteError(res.status, typeof body?.error === "string" ? body.error : res.statusText);
    }
    const data = (await res.json()) as { id: string; participantToken: string; serverUrl: string };
    sessionId = data.id;
    // Unmounted or tab closed while the request was in flight: release it now.
    if (disposed) void deleteRemote(data.id);
    return {
      id: data.id,
      participantToken: data.participantToken,
      serverUrl: data.serverUrl,
      // The route returns only the three fields above. The SDK reads the rest
      // locally: the dates are unused, and functionTools is checked against
      // our handlers when connecting.
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      functionTools: [objectiveToolDeclaration(venue)],
    };
  }

  // ---- objectives ----

  function markDone(ids: string[]): boolean {
    const before = store().objectivesDone;
    const fresh = ids.filter((id) => objectiveIds.includes(id) && !before.includes(id));
    for (const id of fresh) store().completeObjective(id);
    if (fresh.length === 0) return false;
    if (progressInPrompt) pushInstructions();
    if (allDone()) armGoodbye();
    return true;
  }

  /** Runs when the NPC calls complete_objective. The return value is what the NPC reads. */
  function onObjectiveTool(args: Record<string, unknown>) {
    if (!active()) return objectiveToolResult(venue, doneIds(), "The conversation has ended.");
    if (!userSpoke) {
      return objectiveToolResult(
        venue,
        doneIds(),
        "The customer has not said anything yet, so no objective can be complete. Wait for the customer to speak.",
      );
    }
    const ids = readObjectiveIds(args);
    const known = ids.filter((id) => objectiveIds.includes(id));
    if (known.length === 0) {
      return objectiveToolResult(
        venue,
        doneIds(),
        `Unknown objective id. Use only these ids: ${objectiveIds.join(", ")}.`,
      );
    }
    markDone(known);
    return objectiveToolResult(venue, doneIds());
  }

  function scheduleJudge() {
    if (!JUDGE_ENABLED || !active() || allDone() || judgeFailures >= JUDGE_MAX_FAILURES) return;
    if (judgeTimer) clearTimeout(judgeTimer);
    judgeTimer = setTimeout(runJudge, JUDGE_DEBOUNCE_MS);
  }

  async function runJudge() {
    judgeTimer = null;
    if (!active() || !session || allDone()) return;
    const lines = session.transcript
      .filter((l) => l.content.trim())
      .slice(-JUDGE_LINES)
      .map((l) => ({ role: l.role, content: l.content }));
    // Nothing new from the player since the last check: nothing to judge.
    const said = lines
      .filter((l) => l.role === "user")
      .map((l) => l.content)
      .join("\n");
    if (!said || said === lastJudged) return;
    lastJudged = said;
    try {
      const res = await fetch("/api/voice-session/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: venue.id, lang: venue.lang, done: doneIds(), lines }),
        signal: judgeAbort.signal,
      });
      if (!res.ok) {
        judgeFailures++;
        return;
      }
      judgeFailures = 0;
      const data = (await res.json()) as { achieved?: unknown };
      if (!active() || !Array.isArray(data.achieved)) return;
      const achieved = data.achieved.filter((id): id is string => typeof id === "string");
      const before = doneIds();
      if (achieved.some((id) => objectiveIds.includes(id) && !before.includes(id))) {
        // The NPC did not report these, so from now on its prompt carries the
        // progress: otherwise it would keep steering the player towards them.
        progressInPrompt = true;
        if (!markDone(achieved)) pushInstructions();
      }
    } catch {
      if (!judgeAbort.signal.aborted) judgeFailures++;
    }
  }

  // ---- live instruction updates (hint, progress) ----

  function pushInstructions() {
    pushChain = pushChain
      .then(async () => {
        if (!active() || !live || !session) return;
        const text = buildInstructions(venue, {
          done: progressInPrompt ? doneIds() : undefined,
          hint: hintActive,
        });
        if (text === lastPushed) return;
        await session.update({ instructions: text });
        lastPushed = text;
      })
      .catch((err) => {
        console.warn("[voice] could not update the NPC's instructions:", err);
      });
  }

  function requestHint() {
    if (!active() || !live || allDone()) return;
    hintActive = true;
    hintSpoken = false;
    pushInstructions();
  }

  // ---- ending ----

  /** Every objective is done: let the NPC say goodbye, then finish. */
  function armGoodbye() {
    if (goodbyeArmed || !active()) return;
    goodbyeArmed = true;
    goodbyeCap = setTimeout(finishCompleted, GOODBYE_MAX_MS);
    if (agentState === "speaking") {
      npcSpokeSinceDone = true;
    } else {
      goodbyeTimer = setTimeout(finishCompleted, GOODBYE_NO_SPEECH_MS);
    }
  }

  function onAgentState(state: string) {
    agentState = state;
    const speaking = state === "speaking";

    // The player's turn is over. Normally the final transcript line has
    // already scheduled the judge; this covers a turn that never went final.
    if (state === "thinking" && userSpoke) scheduleJudge();

    // A hint lasts for one NPC turn: once it has spoken, restore the prompt.
    if (hintActive) {
      if (speaking) hintSpoken = true;
      else if (hintSpoken) {
        hintActive = false;
        hintSpoken = false;
        pushInstructions();
      }
    }

    if (goodbyeArmed) {
      if (goodbyeTimer) clearTimeout(goodbyeTimer);
      goodbyeTimer = null;
      if (speaking) npcSpokeSinceDone = true;
      else if (npcSpokeSinceDone) goodbyeTimer = setTimeout(finishCompleted, GOODBYE_GRACE_MS);
      else if (state !== "thinking") goodbyeTimer = setTimeout(finishCompleted, GOODBYE_NO_SPEECH_MS);
    }
  }

  /** We end it: all objectives done and the NPC has had its goodbye. */
  function finishCompleted() {
    if (!active()) return;
    ended = true;
    live = false;
    clearTimers();
    const s = store();
    if (s.venueMode === "talking") {
      s.completeVenue();
      s.endConversation();
    }
    closeSession();
  }

  /** The session ended without us asking: the NPC hung up, it timed out, or the connection dropped. */
  function onSessionEnded() {
    if (!active()) return;
    ended = true;
    live = false;
    clearTimers();
    const s = store();
    // If the HUD has already left the conversation the store is up to date.
    if (s.venueMode !== "talking") return;
    if (allDone()) {
      s.completeVenue();
      s.endConversation();
    } else if (fatalMessage) {
      s.setVoice({ status: "error", agentState: null, error: fatalMessage });
    } else {
      s.endConversation();
    }
  }

  function fail(message: string) {
    if (!active()) return;
    ended = true;
    live = false;
    clearTimers();
    store().setVoice({ status: "error", agentState: null, error: message });
  }

  // ---- errors, in words a player can act on ----

  function describe(err: unknown): string {
    if (err instanceof MicrophoneError) return err.message;
    if (err instanceof RouteError) {
      if (err.status === 401 || err.status === 403) return "Please sign in again to talk to the shopkeepers.";
      if (err.status === 429) return "You have had a lot of conversations in a short time. Take a break and try again later.";
      if (err.status === 400) return `This conversation is not available yet (${err.message}).`;
      return "The voice service is not available right now. Please try again in a moment.";
    }
    const e = err as { name?: unknown; message?: unknown; cause?: unknown } | null;
    const text = [e?.name, e?.message, (e?.cause as { name?: unknown } | null)?.name]
      .filter((v): v is string => typeof v === "string")
      .join(" ");
    return describeText(text);
  }

  function describeText(text: string): string {
    if (/NotAllowedError|SecurityError|permission denied|not allowed/i.test(text)) return MIC_BLOCKED(npc);
    if (/NotFoundError|device not found|no microphone/i.test(text)) return MIC_MISSING;
    if (/NotReadableError|could not start audio source|in use/i.test(text)) return MIC_BUSY;
    if (/network|timeout|timed out|failed to fetch|disconnected/i.test(text)) {
      return `The connection to ${npc} was lost. Check your internet connection and try again.`;
    }
    return `Something went wrong with the conversation. Leave and talk to ${npc} again.`;
  }

  /** Asks for the microphone before a billable session exists, so "blocked" costs nothing. */
  async function checkMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneError(
        "This browser cannot use the microphone here. Open the game over https in a recent browser.",
      );
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
    } catch (err) {
      const name = (err as { name?: unknown } | null)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") throw new MicrophoneError(MIC_BLOCKED(npc));
      if (name === "NotFoundError" || name === "OverconstrainedError") throw new MicrophoneError(MIC_MISSING);
      if (name === "NotReadableError" || name === "AbortError") throw new MicrophoneError(MIC_BUSY);
      throw new MicrophoneError(`The microphone could not be started. ${String((err as Error)?.message ?? "")}`.trim());
    }
  }

  // ---- wiring and start ----

  function wire(s: Session) {
    s.on("transcript", (e) => {
      if (!active() || !e.content.trim()) return;
      store().upsertTranscript({ id: e.id, role: e.role, content: e.content, final: e.final });
      if (e.role === "user") {
        userSpoke = true;
        if (e.final) scheduleJudge();
      }
    });

    s.on("agent_state_changed", (e) => {
      if (!active()) return;
      store().setVoice({ agentState: e.state });
      onAgentState(e.state);
    });

    s.on("error", (e) => {
      if (!active()) return;
      // Non-fatal errors (a failed mute, a cleanup hiccup) are not the player's problem.
      if (!e.fatal) {
        console.warn("[voice]", e.code, e.message);
        return;
      }
      const reason = (e.payload as { reason?: unknown } | null | undefined)?.reason;
      const dropped = e.code === "session_disconnected" || e.code === "agent_disconnected";
      const normalEnd = dropped && typeof reason === "string" && NORMAL_END_REASONS.includes(reason);
      if (!normalEnd) {
        console.error("[voice]", e.code, e.message);
        fatalMessage = describeText(`${e.code} ${e.message} ${typeof reason === "string" ? reason : ""}`);
      }
      // The SDK closes after a fatal error and then emits "disconnected".
      // Should that not arrive, end anyway.
      if (live && !endFallback) endFallback = setTimeout(onSessionEnded, 2000);
    });

    s.on("disconnected", () => {
      // While connecting, start() reports the failure with the real cause.
      if (live) onSessionEnded();
    });
  }

  async function run() {
    store().setVoice({ status: "connecting", agentState: null, error: null });
    try {
      await checkMicrophone();
      if (disposed) return;

      // Browser-only entry point; the dynamic import keeps it (and livekit) out of the server bundle.
      const { initSession } = await import("@mistralai/mistralai/extra/voice-agents/browser");
      if (disposed) return;

      const s = await initSession({
        createSession,
        deleteSession: deleteRemote,
        functionHandlers: { [COMPLETE_OBJECTIVE]: onObjectiveTool },
      });
      session = s;
      if (disposed) {
        await s.close();
        return;
      }

      wire(s);
      connecting = true;
      try {
        await s.connect(); // SDK >= 3: initSession does not connect
      } finally {
        connecting = false;
      }
      if (disposed) {
        await s.close();
        return;
      }

      live = true;
      if (wantMuted) await s.setInputEnabled(false).catch(() => {});
      if (active()) store().setVoice({ status: "live", error: null });
    } catch (err) {
      console.error("[voice] could not start the conversation:", err);
      // A failed connect() has already closed the session; this covers the rest.
      if (sessionId) void deleteRemote(sessionId);
      await session?.close().catch(() => {});
      fail(describe(err));
    }
  }

  const conversation: Conversation = {
    start() {
      if (started || disposed) return;
      started = true;
      if (current && current !== conversation) current.dispose();
      current = conversation;
      void run();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      live = false;
      clearTimers();
      judgeAbort.abort();
      if (current === conversation) current = null;
      closeSession();
    },

    requestHint,

    setMuted(muted: boolean) {
      wantMuted = muted;
      if (live && session && active()) void session.setInputEnabled(!muted).catch(() => {});
    },
  };

  return conversation;
}

const MIC_BLOCKED = (npc: string) =>
  `The microphone is blocked. Allow microphone access for this site in your browser's address bar, then talk to ${npc} again.`;
const MIC_MISSING = "No microphone was found. Plug one in or check your sound settings, then try again.";
const MIC_BUSY = "The microphone is being used by another app. Close it, then try again.";
