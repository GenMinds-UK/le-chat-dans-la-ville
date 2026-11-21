import { create } from "zustand";

// HUD-only interface state (which menu panel is open). Not part of the game
// store contract: nothing outside components/hud and the dev preview reads it.
export type HudPanel = "menu" | "vocab" | "help" | "lang" | null;

export const useHudUi = create<{
  panel: HudPanel;
  open(panel: Exclude<HudPanel, null>): void;
  close(): void;
}>()((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
}));
