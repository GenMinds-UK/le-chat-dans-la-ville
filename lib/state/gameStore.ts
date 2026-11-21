import { create } from "zustand";
import { getVenue, hasVenue } from "@/content";
import type { Lang, VenueId } from "@/content/types";

// The game store (GAME_PLAN.md 3.3). The only thing shared between the Phaser
// world and React. Phaser uses useGameStore.getState() / .subscribe(); React
// uses the hook. Changing this contract needs the lead's sign-off.

export type VoiceStatus = "idle" | "connecting" | "live" | "error";
export type TranscriptLine = {
  id: string;
  role: "user" | "assistant";
  content: string;
  final: boolean;
};

export type GameState = {
  user: { id: string; email: string } | null;
  lang: Lang | null; // null until chosen
  /** False from sign-in until the account's saved language and progress have been loaded. */
  profileLoaded: boolean;
  scene: "title" | "town" | "venue";
  activeVenueId: VenueId | null;
  venueMode: "explore" | "talking"; // explore = walking round the shop
  inspectedItemId: string | null; // item pop-up is open when set
  objectivesDone: string[]; // for the current conversation
  completedVenues: VenueId[]; // for the current lang
  vocabSeen: string[]; // vocab ids, for the current lang
  /** Set by completeVenue; the completion screen shows while it is set. Cleared by leaveVenue. */
  justCompletedVenueId: VenueId | null;
  voice: { status: VoiceStatus; agentState: string | null; error: string | null };
  transcript: TranscriptLine[];

  // actions
  setUser(u: GameState["user"]): void; // platform (auth). null = signed out: resets everything
  setLang(lang: Lang): void; // ui-hud (language picker); platform swaps in that language's progress
  /** platform: replace language and progress with what was loaded for the account. */
  hydrateProgress(p: { lang: Lang | null; completedVenues: VenueId[]; vocabSeen: string[] }): void;
  startGame(): void; // ui-hud: title -> town (needs lang)
  enterVenue(id: VenueId): void; // game-engine, on door overlap. Does NOT start the voice session
  leaveVenue(): void; // game-engine (exit mat) or ui-hud
  inspectItem(itemId: string): void; // game-engine, on interact with an object; adds to vocabSeen
  closeItem(): void; // ui-hud (pop-up close)
  startConversation(): void; // game-engine, on interact with the NPC -> venueMode "talking"
  endConversation(): void; // ui-hud (leave button) or voice-npc (session ended) -> "explore"
  completeObjective(id: string): void; // voice-npc, from the tool handler
  completeVenue(): void; // voice-npc, when the session ends with all objectives done
  setVoice(v: Partial<GameState["voice"]>): void;
  upsertTranscript(line: TranscriptLine): void;
};

const IDLE_VOICE: GameState["voice"] = { status: "idle", agentState: null, error: null };

const addUnique = <T,>(list: T[], ...items: T[]): T[] => {
  const extra = items.filter((i) => !list.includes(i));
  return extra.length ? [...list, ...extra] : list;
};

export const useGameStore = create<GameState>()((set, get) => ({
  user: null,
  lang: null,
  profileLoaded: false,
  scene: "title",
  activeVenueId: null,
  venueMode: "explore",
  inspectedItemId: null,
  objectivesDone: [],
  completedVenues: [],
  vocabSeen: [],
  justCompletedVenueId: null,
  voice: IDLE_VOICE,
  transcript: [],

  setUser: (user) => {
    if (user) {
      // Same user again (token refresh, second tab event): keep everything.
      if (get().user?.id === user.id) return;
      set({ user, profileLoaded: false });
      return;
    }
    // Signed out: back to a clean title screen.
    set({
      user: null,
      lang: null,
      profileLoaded: false,
      scene: "title",
      activeVenueId: null,
      venueMode: "explore",
      inspectedItemId: null,
      objectivesDone: [],
      completedVenues: [],
      vocabSeen: [],
      justCompletedVenueId: null,
      voice: IDLE_VOICE,
      transcript: [],
    });
  },

  setLang: (lang) => {
    if (get().lang === lang) return;
    // Progress is kept per language: start empty, platform's sync loads the
    // saved rows for the new language. Changing language returns to the town.
    set((s) => ({
      lang,
      completedVenues: [],
      vocabSeen: [],
      scene: s.scene === "title" ? "title" : "town",
      activeVenueId: null,
      venueMode: "explore",
      inspectedItemId: null,
      objectivesDone: [],
      justCompletedVenueId: null,
      voice: IDLE_VOICE,
      transcript: [],
    }));
  },

  hydrateProgress: ({ lang, completedVenues, vocabSeen }) =>
    set((s) => ({
      lang,
      profileLoaded: true,
      // Keep anything done locally while the load was in flight.
      completedVenues: s.lang === lang ? addUnique(completedVenues, ...s.completedVenues) : completedVenues,
      vocabSeen: s.lang === lang ? addUnique(vocabSeen, ...s.vocabSeen) : vocabSeen,
    })),

  startGame: () => {
    if (get().lang && get().scene === "title") set({ scene: "town" });
  },

  enterVenue: (id) =>
    set({
      scene: "venue",
      activeVenueId: id,
      venueMode: "explore",
      inspectedItemId: null,
      objectivesDone: [],
      justCompletedVenueId: null,
      transcript: [],
      voice: IDLE_VOICE,
    }),

  leaveVenue: () =>
    set({
      scene: "town",
      activeVenueId: null,
      venueMode: "explore",
      inspectedItemId: null,
      objectivesDone: [],
      justCompletedVenueId: null,
      transcript: [],
      voice: IDLE_VOICE,
    }),

  inspectItem: (itemId) =>
    set((s) => ({ inspectedItemId: itemId, vocabSeen: addUnique(s.vocabSeen, itemId) })),

  closeItem: () => set({ inspectedItemId: null }),

  startConversation: () => {
    const s = get();
    if (s.scene !== "venue" || !s.activeVenueId || s.venueMode === "talking") return;
    set({ venueMode: "talking", inspectedItemId: null, objectivesDone: [], transcript: [] });
  },

  endConversation: () =>
    set({ venueMode: "explore", objectivesDone: [], transcript: [], voice: IDLE_VOICE }),

  completeObjective: (id) => set((s) => ({ objectivesDone: addUnique(s.objectivesDone, id) })),

  completeVenue: () => {
    const { lang, activeVenueId } = get();
    if (!lang || !activeVenueId) return;
    const phraseIds = hasVenue(lang, activeVenueId)
      ? getVenue(lang, activeVenueId).phrases.map((p) => p.id)
      : [];
    set((s) => ({
      completedVenues: addUnique(s.completedVenues, activeVenueId),
      vocabSeen: addUnique(s.vocabSeen, ...phraseIds),
      justCompletedVenueId: activeVenueId,
    }));
  },

  setVoice: (v) => set((s) => ({ voice: { ...s.voice, ...v } })),

  upsertTranscript: (line) =>
    set((s) => {
      const idx = s.transcript.findIndex((l) => l.id === line.id);
      if (idx < 0) return { transcript: [...s.transcript, line] };
      const next = s.transcript.slice();
      next[idx] = line;
      return { transcript: next };
    }),
}));

// Development only: lets automated playtests read and drive the store from the
// browser console. Never present in a production build.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}
