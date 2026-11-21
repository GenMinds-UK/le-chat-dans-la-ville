// Everything that touches Phaser starts here. This module is only ever loaded
// with a dynamic import from PhaserGame.tsx, so Phaser never runs on the server.

import * as Phaser from "phaser";
import type { VenueId } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { Controls } from "./controls";
import { BootScene, READY } from "./scenes/BootScene";
import { TownScene, type TownSceneData } from "./scenes/TownScene";
import { VenueScene, type VenueSceneData } from "./scenes/VenueScene";

export type GameHandle = { destroy(): void };

/**
 * Canvas size in device pixels (even numbers, so the camera centre is a whole
 * pixel), plus the CSS zoom that maps it back onto the container. Scenes then
 * pick a whole-number camera zoom, so one art pixel is always N x N screen pixels.
 */
function measure(parent: HTMLElement): { width: number; height: number; zoom: number } {
  const dpr = window.devicePixelRatio || 1;
  const even = (n: number) => Math.max(2, Math.floor((n * dpr) / 2) * 2);
  return { width: even(parent.clientWidth), height: even(parent.clientHeight), zoom: 1 / dpr };
}

export function createGame(parent: HTMLElement): GameHandle {
  const controls = new Controls();
  const first = measure(parent);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#2b2233",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    banner: false,
    audio: { noAudio: true },
    // Keyboard is handled by Controls so that Phaser never captures keys.
    input: { keyboard: false, gamepad: false },
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: first.width,
      height: first.height,
      zoom: first.zoom,
      expandParent: false,
      autoRound: false,
    },
    scene: [BootScene, TownScene, VenueScene],
  });
  game.registry.set("controls", controls);

  // ---- size: follow the container ----
  const fit = () => {
    if (!game.canvas || !game.scale) return;
    const m = measure(parent);
    if (game.scale.zoom !== m.zoom) game.scale.setZoom(m.zoom);
    if (game.scale.width !== m.width || game.scale.height !== m.height) {
      game.scale.resize(m.width, m.height);
    }
    game.canvas.style.display = "block";
  };
  const observer = new ResizeObserver(fit);
  observer.observe(parent);
  window.addEventListener("resize", fit);
  game.events.once(Phaser.Core.Events.READY, fit);

  // ---- director: the store says which scene should be showing ----
  // "title" and "town" are both the Town scene (it ignores input on the title);
  // "venue" is the Venue scene for that shop and language.
  let applied: string | null = null;
  let lastVenue: VenueId | null = null;
  let dirty = true;
  const unsubscribe = useGameStore.subscribe((s, prev) => {
    if (s.scene !== prev.scene || s.activeVenueId !== prev.activeVenueId || s.lang !== prev.lang) dirty = true;
  });
  const stop = (key: string) => {
    if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
  };
  // Scenes are swapped between frames (never from inside a scene's update).
  const direct = () => {
    if (!dirty || !game.registry.get(READY)) return;
    dirty = false;
    const s = useGameStore.getState();
    const venueId = s.scene === "venue" && s.lang ? s.activeVenueId : null;
    const want = venueId && s.lang ? `venue:${venueId}:${s.lang}` : "town";
    if (want === applied) return;
    const cameFromVenue = applied !== null && applied !== "town";
    applied = want;
    stop("Boot");
    if (venueId && s.lang) {
      stop("Town");
      const data: VenueSceneData = { venueId, lang: s.lang };
      game.scene.start("Venue", data);
      lastVenue = venueId;
    } else {
      stop("Venue");
      const data: TownSceneData = { fromVenue: cameFromVenue ? lastVenue : null };
      game.scene.start("Town", data);
    }
  };
  game.events.on(Phaser.Core.Events.PRE_STEP, direct);

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("resize", fit);
      game.events.off(Phaser.Core.Events.PRE_STEP, direct);
      controls.destroy();
      game.destroy(true);
    },
  };
}
