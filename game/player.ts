import * as Phaser from "phaser";
import { dist, type Pt, type World } from "./world";

const SPEED = 72; // world pixels per second
const HOP_MS = 130;
const MAX_STEP_MS = 50;

// Sheet columns: down, down_left, left, up_left, up, up_right, right, down_right.
export const DIR = { down: 0, left: 2, up: 4, right: 6 } as const;

/** Sheet column for a movement vector. */
export function dirOf(dx: number, dy: number): number {
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)); // 0 = right, 2 = down
  return (((sector + 6) % 8) + 8) % 8;
}

/** The cat: a sprite and shadow that walk a World by keyboard or along a path. */
export class Player {
  readonly pos: Pt;
  dir: number;
  private readonly world: World;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private path: Pt[] = [];
  private hopClock = 0;
  private stuckMs = 0;

  constructor(scene: Phaser.Scene, world: World, at: Pt, dir: number) {
    this.world = world;
    this.pos = { x: at.x, y: at.y };
    this.dir = dir;
    this.shadow = scene.add.image(0, 0, "player/shadow");
    this.sprite = scene.add.sprite(0, 0, "player/cat", dir).setOrigin(0.5, 1);
    this.draw(false);
  }

  get object(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /** True while there are way-points left to walk. */
  get walking(): boolean {
    return this.path.length > 0;
  }

  /** Walk to the reachable spot nearest to `to`. */
  walkTo(to: Pt): void {
    this.path = this.world.findPath(this.pos, to);
    this.stuckMs = 0;
  }

  stop(): void {
    this.path.length = 0;
  }

  face(dir: number): void {
    this.dir = dir;
    this.draw(false);
  }

  /**
   * Advance one frame. `keys` is the keyboard direction (each axis -1, 0 or 1)
   * or null when the keyboard is being ignored; a held key cancels any path.
   */
  update(deltaMs: number, keys: { x: number; y: number } | null): void {
    const dt = Math.min(deltaMs, MAX_STEP_MS);
    const step = (SPEED * dt) / 1000;
    const before = { x: this.pos.x, y: this.pos.y };
    let wanted = false;

    if (keys && (keys.x !== 0 || keys.y !== 0)) {
      this.path.length = 0;
      wanted = true;
      const len = Math.hypot(keys.x, keys.y);
      const next = this.world.slide(this.pos, (keys.x / len) * step, (keys.y / len) * step);
      this.pos.x = next.x;
      this.pos.y = next.y;
      this.dir = dirOf(keys.x, keys.y);
    } else if (this.path.length > 0) {
      wanted = true;
      const next = this.world.follow(this.pos, this.path, step);
      const dx = next.x - this.pos.x;
      const dy = next.y - this.pos.y;
      if (Math.hypot(dx, dy) > 0.01) this.dir = dirOf(dx, dy);
      this.pos.x = next.x;
      this.pos.y = next.y;
      // Blocked on the way: give up rather than walk on the spot for ever.
      this.stuckMs = dist(before, this.pos) < step * 0.2 ? this.stuckMs + dt : 0;
      if (this.stuckMs > 300) this.path.length = 0;
    }

    const moved = wanted && dist(before, this.pos) > 0.01;
    this.hopClock = moved ? this.hopClock + dt : 0;
    this.draw(moved && Math.floor(this.hopClock / HOP_MS) % 2 === 0);
  }

  private draw(hop: boolean): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    this.sprite.setFrame(this.dir + (hop ? 8 : 0));
    this.sprite.setPosition(x, y + 1).setDepth(y);
    this.shadow.setPosition(x, y - 1).setDepth(y - 0.5);
  }
}
