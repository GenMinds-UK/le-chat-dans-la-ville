"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Fills its parent. The parent needs a size of its own (the app shell gives it
// a full-viewport box).
const STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#2b2233",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};

/**
 * Mounts the Phaser game. Phaser is loaded with a dynamic import inside the
 * effect, so it never runs during server rendering, and the game is destroyed
 * on unmount. Everything else the game needs comes from the game store.
 */
export default function PhaserGame() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = ref.current;
    if (!parent) return;
    // Strict mode mounts, unmounts and mounts again: an import that resolves
    // after its effect was cleaned up must not create a second game.
    let cancelled = false;
    let handle: { destroy(): void } | null = null;
    import("./createGame")
      .then(({ createGame }) => {
        if (!cancelled) handle = createGame(parent);
      })
      .catch((err) => console.error("[game] failed to start", err));
    return () => {
      cancelled = true;
      handle?.destroy();
      handle = null;
    };
  }, []);

  return <div ref={ref} className="phaser-game" style={STYLE} />;
}
