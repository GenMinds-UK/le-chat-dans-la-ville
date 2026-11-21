"use client";

import { useEffect, useRef, useState } from "react";
import ConversationHud from "@/components/hud/ConversationHud";
import Hud from "@/components/hud/Hud";
import { TitleHeader, TitleMenu } from "@/components/hud/TitleScreen";
import { safeVenue } from "@/components/hud/content";
import { useHudUi } from "@/components/hud/hudUi";
import { LANGS, VENUE_ORDER, hasVenue } from "@/content";
import type { Lang, Venue, VenueId } from "@/content/types";
import { useGameStore, type GameState, type TranscriptLine } from "@/lib/state/gameStore";

// This page deliberately does not import LiveConversation or useVoiceSession:
// the conversation is the presentational ConversationHud with fake controls.

const IDLE: GameState["voice"] = { status: "idle", agentState: null, error: null };
const FAKE_USER = { id: "preview", email: "preview@example.com" };

const set = (patch: Partial<GameState>) => {
  useHudUi.getState().close();
  useGameStore.setState(patch);
};

/** Clean slate for one scene, keeping language and progress. */
const base = (patch: Partial<GameState>): Partial<GameState> => ({
  user: FAKE_USER,
  profileLoaded: true,
  scene: "town",
  activeVenueId: null,
  venueMode: "explore",
  inspectedItemId: null,
  objectivesDone: [],
  justCompletedVenueId: null,
  voice: IDLE,
  transcript: [],
  ...patch,
});

/**
 * A made-up conversation built only from the venue's own content, so it works
 * in any language: the welcome line, then for each objective the phrase quoted
 * in its hint (player) and a short reply (NPC).
 */
function fakeScript(venue: Venue) {
  const steps: { line: TranscriptLine; objective?: string; agentState: string }[] = [
    {
      line: { id: "a0", role: "assistant", content: venue.welcome, final: true },
      agentState: "speaking",
    },
  ];
  venue.objectives.forEach((o, i) => {
    const quoted = /"([^"]+)"/.exec(o.hint)?.[1];
    const said = quoted ?? venue.phrases[i % Math.max(venue.phrases.length, 1)]?.term ?? "…";
    const item = venue.items[i % Math.max(venue.items.length, 1)];
    const phrase = venue.phrases[(i + 1) % Math.max(venue.phrases.length, 1)];
    const reply = [item?.term, phrase?.term].filter(Boolean).join(" … ") || venue.welcome;
    steps.push({
      line: { id: `u${i}`, role: "user", content: said, final: true },
      agentState: "thinking",
    });
    steps.push({
      line: { id: `a${i + 1}`, role: "assistant", content: reply, final: true },
      objective: o.id,
      agentState: "speaking",
    });
  });
  return steps;
}

export default function HudPreview() {
  const scene = useGameStore((s) => s.scene);
  const lang = useGameStore((s) => s.lang);
  const completed = useGameStore((s) => s.completedVenues);
  const vocabSeen = useGameStore((s) => s.vocabSeen);
  const voice = useGameStore((s) => s.voice);
  const venueMode = useGameStore((s) => s.venueMode);
  const [venueId, setVenueId] = useState<VenueId>(VENUE_ORDER[0]);
  const [phone, setPhone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hints, setHints] = useState(0);
  const [auto, setAuto] = useState(false);
  const step = useRef(0);
  const itemIndex = useRef(0);

  const venue = safeVenue(lang, venueId);

  // Start signed in, in town, in the first language.
  useEffect(() => {
    useGameStore.setState(base({ lang: useGameStore.getState().lang ?? LANGS[0].code }));
  }, []);

  const pickLang = (code: Lang) => {
    // Set by hand rather than through setLang, so progress stays for comparing languages.
    set(base({ lang: code }));
    setAuto(false);
  };

  const talk = (voicePatch: GameState["voice"]) => {
    step.current = 0;
    setMuted(false);
    set(base({ scene: "venue", activeVenueId: venueId, venueMode: "talking", voice: voicePatch }));
  };

  /** Adds the next fake line; ticks the objective that goes with it. */
  const advance = () => {
    const v = safeVenue(useGameStore.getState().lang, venueId);
    if (!v) return false;
    const script = fakeScript(v);
    const s = script[step.current];
    if (!s) return false;
    step.current += 1;
    const store = useGameStore.getState();
    store.upsertTranscript(s.line);
    if (s.objective) store.completeObjective(s.objective);
    store.setVoice({ status: "live", agentState: s.agentState, error: null });
    return true;
  };

  // "Live, auto-play": a line every 1.6s, then back to listening.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      if (!advance()) {
        useGameStore.getState().setVoice({ agentState: "listening" });
        setAuto(false);
      }
    }, 1600);
    return () => clearInterval(t);
    // advance reads everything it needs at call time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, venueId]);

  const actions: { label: string; run: () => void; needsVenue?: boolean }[] = [
    { label: "Title: pick language", run: () => set(base({ scene: "title", lang: null })) },
    { label: "Title: returning player", run: () => set(base({ scene: "title" })) },
    { label: "Town quest", run: () => set(base({ completedVenues: [] })) },
    {
      label: "Town: next quest",
      run: () =>
        set(
          base({
            completedVenues: VENUE_ORDER.slice(0, (completed.length + 1) % VENUE_ORDER.length),
          }),
        ),
    },
    {
      label: "All venues complete",
      run: () => set(base({ completedVenues: [...VENUE_ORDER] })),
    },
    {
      label: "In shop (explore)",
      run: () => set(base({ scene: "venue", activeVenueId: venueId })),
    },
    {
      label: "Item pop-up (next item)",
      needsVenue: true,
      run: () => {
        if (!venue) return;
        const item = venue.items[itemIndex.current % venue.items.length];
        itemIndex.current += 1;
        set(base({ scene: "venue", activeVenueId: venueId }));
        useGameStore.getState().inspectItem(item.id);
      },
    },
    {
      label: "Item pop-up (unknown id)",
      run: () => set(base({ scene: "venue", activeVenueId: venueId, inspectedItemId: "no_such_item" })),
    },
    {
      label: "Voice: connecting",
      needsVenue: true,
      run: () => {
        setAuto(false);
        talk({ status: "connecting", agentState: null, error: null });
      },
    },
    {
      label: "Voice: live (auto-play)",
      needsVenue: true,
      run: () => {
        talk({ status: "live", agentState: "listening", error: null });
        setAuto(true);
      },
    },
    {
      label: "Voice: next line",
      needsVenue: true,
      run: () => {
        setAuto(false);
        if (useGameStore.getState().venueMode !== "talking") {
          talk({ status: "live", agentState: "listening", error: null });
        }
        advance();
      },
    },
    {
      label: "Voice: partial line",
      needsVenue: true,
      run: () => {
        setAuto(false);
        if (useGameStore.getState().venueMode !== "talking") {
          talk({ status: "live", agentState: "listening", error: null });
        }
        const v = safeVenue(useGameStore.getState().lang, venueId);
        const text = v?.phrases[0]?.term ?? "…";
        useGameStore.getState().upsertTranscript({
          id: "partial",
          role: "user",
          content: text.slice(0, Math.max(2, Math.ceil(text.length / 2))),
          final: false,
        });
        useGameStore.getState().setVoice({ agentState: "listening" });
      },
    },
    {
      label: "Voice: error",
      needsVenue: true,
      run: () => {
        setAuto(false);
        talk({
          status: "error",
          agentState: null,
          error: "Microphone permission was denied.",
        });
      },
    },
    {
      label: "Venue complete",
      needsVenue: true,
      run: () => {
        setAuto(false);
        set(base({ scene: "venue", activeVenueId: venueId, venueMode: "talking" }));
        // The same two calls voice-npc makes when the NPC hangs up.
        useGameStore.getState().completeVenue();
        useGameStore.getState().endConversation();
      },
    },
    {
      label: "Vocab book",
      run: () => {
        if (useGameStore.getState().scene === "title") set(base({}));
        if (useGameStore.getState().venueMode === "talking") set(base({}));
        useHudUi.getState().open("vocab");
      },
    },
    {
      label: "Menu",
      run: () => {
        set(base({}));
        useHudUi.getState().open("menu");
      },
    },
    {
      label: "Vocab: see every word",
      run: () => {
        const v = VENUE_ORDER.flatMap((id) => {
          const x = safeVenue(lang, id);
          return x ? [...x.items, ...x.phrases].map((e) => e.id) : [];
        });
        useGameStore.setState({ vocabSeen: v });
      },
    },
    {
      label: "Reset progress",
      run: () => set(base({ completedVenues: [], vocabSeen: [] })),
    },
  ];

  return (
    <div className="hud-preview">
      <div className="hud-preview-controls">
        <strong>HUD preview</strong>
        <div className="hud-preview-row">
          {LANGS.map((l) => (
            <button key={l.code} aria-pressed={lang === l.code} onClick={() => pickLang(l.code)}>
              {l.code}
            </button>
          ))}
          <span>|</span>
          {VENUE_ORDER.map((id) => (
            <button
              key={id}
              aria-pressed={venueId === id}
              onClick={() => {
                setAuto(false);
                setVenueId(id);
              }}
              title={lang && !hasVenue(lang, id) ? "No content yet in this language" : undefined}
            >
              {id}
              {lang && !hasVenue(lang, id) ? " (none)" : ""}
            </button>
          ))}
          <span>|</span>
          <button aria-pressed={phone} onClick={() => setPhone((p) => !p)}>
            360 x 640
          </button>
        </div>
        <div className="hud-preview-row">
          {actions.map((a) => (
            <button key={a.label} onClick={a.run} disabled={a.needsVenue && !venue}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="hud-preview-state">
          scene={scene} mode={venueMode} voice={voice.status}/{voice.agentState ?? "-"} completed=
          {completed.length} vocabSeen={vocabSeen.length} requestHint calls={hints}
        </div>
      </div>

      <div className={phone ? "hud-preview-stage is-phone" : "hud-preview-stage"}>
        {scene === "title" ? (
          <div className="app app-title">
            <TitleHeader />
            <div className="app-body">
              <TitleMenu onSignOut={() => set(base({ scene: "title", lang: null }))} />
            </div>
          </div>
        ) : (
          <div className="game-root">
            <div className="game-canvas hud-preview-canvas" />
            <Hud
              renderConversation={(v) => (
                <ConversationHud
                  venue={v}
                  controls={{
                    muted,
                    setMuted,
                    requestHint: () => setHints((n) => n + 1),
                  }}
                />
              )}
              onSignOut={() => set(base({ scene: "title", lang: null }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
