"use client";

import { useEffect, useRef } from "react";

// While a HUD pop-up or modal is open, key presses belong to it and not to the
// game underneath. The listener sits on window in the capture phase, so it runs
// before Phaser's (window, bubble phase) and stops the event there. Only
// keydown is stopped: keyup still reaches the game, so a key that was held
// when the panel opened cannot get stuck down. Default actions (typing, Tab,
// activating the focused button) are untouched.
export function useKeyCapture(active: boolean, onKey: (e: KeyboardEvent) => void) {
  const handler = useRef(onKey);
  useEffect(() => {
    handler.current = onKey;
  });

  useEffect(() => {
    if (!active) return;
    const onDown = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      // A held key auto-repeats: the E that opened a pop-up must not also close it.
      if (e.repeat) return;
      handler.current(e);
    };
    window.addEventListener("keydown", onDown, true);
    return () => window.removeEventListener("keydown", onDown, true);
  }, [active]);
}
