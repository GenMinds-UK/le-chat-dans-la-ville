// Keyboard input for the game. Listens on window by physical key (so WASD is
// the same place on every layout), never calls preventDefault, and ignores
// anything typed into a form field, so HTML inputs outside the canvas keep
// working normally.

const MOVE: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
};
const INTERACT = new Set(["KeyE", "Space", "Enter"]);

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

// Space and Enter on a focused button or link belong to that element.
const isActivatable = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && el.closest("button, a, summary, [role='button']") !== null;

export class Controls {
  private readonly held = new Set<string>();
  private interactQueued = false;

  constructor() {
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
    this.held.clear();
  }

  /** Direction held on the keyboard: each axis is -1, 0 or 1. */
  vector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      const m = MOVE[code];
      if (m) {
        x += m[0];
        y += m[1];
      }
    }
    return { x: Math.sign(x), y: Math.sign(y) };
  }

  /** True once per press of E, Space or Enter. */
  takeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  /** Forget a queued interact press (used while input is locked). */
  clearInteract(): void {
    this.interactQueued = false;
  }

  private onDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditable(e.target)) {
      this.held.clear();
      return;
    }
    if (e.code in MOVE) {
      this.held.add(e.code);
    } else if (INTERACT.has(e.code) && !e.repeat) {
      if (e.code !== "KeyE" && isActivatable(e.target)) return;
      this.interactQueued = true;
    }
  };

  private onUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onBlur = (): void => {
    this.held.clear();
    this.interactQueued = false;
  };
}
