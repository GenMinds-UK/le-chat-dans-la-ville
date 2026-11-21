// Collision and path-finding for one scene. No Phaser in here, so it can be
// checked from a plain node script.

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * The player's collision box, relative to the feet point (bottom-centre of the
 * sprite): FEET.hw to each side, FEET.up above and FEET.down below.
 */
export const FEET = { hw: 5, up: 4, down: 1 };

/** Path-finding grid step, in world pixels. */
const GRID = 2;

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

export const inRect = (p: Pt, r: Rect, pad = 0): boolean =>
  p.x >= r.x - pad && p.x < r.x + r.w + pad && p.y >= r.y - pad && p.y < r.y + r.h + pad;

export class World {
  readonly bounds: Rect;
  readonly solids: Rect[];
  private readonly cols: number;
  private readonly rows: number;
  private readonly gx0: number;
  private readonly gy0: number;
  private readonly open: Uint8Array;

  /** bounds: where the feet box may be. solids: rectangles it may not overlap. */
  constructor(bounds: Rect, solids: readonly Rect[]) {
    this.bounds = bounds;
    // Only the solids that can actually be touched from inside the bounds.
    this.solids = solids.filter(
      (s) =>
        s.x < bounds.x + bounds.w &&
        s.x + s.w > bounds.x &&
        s.y < bounds.y + bounds.h &&
        s.y + s.h > bounds.y,
    );
    this.gx0 = Math.ceil(bounds.x / GRID) * GRID;
    this.gy0 = Math.ceil(bounds.y / GRID) * GRID;
    this.cols = Math.max(1, Math.floor((bounds.x + bounds.w - this.gx0) / GRID) + 1);
    this.rows = Math.max(1, Math.floor((bounds.y + bounds.h - this.gy0) / GRID) + 1);
    this.open = new Uint8Array(this.cols * this.rows);
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        this.open[j * this.cols + i] = this.free(this.gx0 + i * GRID, this.gy0 + j * GRID) ? 1 : 0;
      }
    }
  }

  /** Can the player stand with their feet at (x, y)? */
  free(x: number, y: number): boolean {
    const l = x - FEET.hw;
    const r = x + FEET.hw;
    const t = y - FEET.up;
    const b = y + FEET.down;
    const bd = this.bounds;
    if (l < bd.x || r > bd.x + bd.w || t < bd.y || b > bd.y + bd.h) return false;
    for (const s of this.solids) {
      if (l < s.x + s.w && r > s.x && t < s.y + s.h && b > s.y) return false;
    }
    return true;
  }

  /** Move by (dx, dy), sliding along anything solid. Returns the new position. */
  slide(from: Pt, dx: number, dy: number): Pt {
    let { x, y } = from;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
    if (steps === 0) return { x, y };
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx !== 0 && this.free(x + sx, y)) x += sx;
      if (sy !== 0 && this.free(x, y + sy)) y += sy;
    }
    return { x, y };
  }

  /**
   * Walk `step` pixels along `path` (way-points from findPath), removing the
   * ones that are reached. The segments were checked by clear(), so the walk
   * goes straight along them and only falls back to sliding if it must.
   */
  follow(from: Pt, path: Pt[], step: number): Pt {
    let p = { x: from.x, y: from.y };
    while (step > 0 && path.length > 0) {
      const wp = path[0];
      const d = dist(p, wp);
      if (d <= step) {
        if (d > 0 && !this.free(wp.x, wp.y)) {
          path.length = 0;
          break;
        }
        p = { x: wp.x, y: wp.y };
        path.shift();
        step -= d;
        continue;
      }
      const dx = ((wp.x - p.x) / d) * step;
      const dy = ((wp.y - p.y) / d) * step;
      p = this.free(p.x + dx, p.y + dy) ? { x: p.x + dx, y: p.y + dy } : this.slide(p, dx, dy);
      break;
    }
    return p;
  }

  /** Is the straight walk from a to b free all the way? */
  clear(a: Pt, b: Pt): boolean {
    const n = Math.ceil(dist(a, b));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!this.free(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  private cellNear(p: Pt): number {
    const ci = Math.round((p.x - this.gx0) / GRID);
    const cj = Math.round((p.y - this.gy0) / GRID);
    let best = -1;
    let bestD = Infinity;
    for (let dj = -3; dj <= 3; dj++) {
      for (let di = -3; di <= 3; di++) {
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) continue;
        if (!this.open[j * this.cols + i]) continue;
        const d = Math.hypot(this.gx0 + i * GRID - p.x, this.gy0 + j * GRID - p.y);
        if (d < bestD) {
          bestD = d;
          best = j * this.cols + i;
        }
      }
    }
    return best;
  }

  private cellPt(c: number): Pt {
    return { x: this.gx0 + (c % this.cols) * GRID, y: this.gy0 + Math.floor(c / this.cols) * GRID };
  }

  /**
   * Way-points from `from` to the reachable spot nearest to `to` (which may be
   * inside something solid, e.g. a tapped shop item). Empty when already there
   * or when nowhere can be reached.
   */
  findPath(from: Pt, to: Pt): Pt[] {
    const start = this.cellNear(from);
    if (start < 0) return [];
    const { cols, rows, open } = this;
    const prev = new Int32Array(cols * rows).fill(-1);
    const queue = new Int32Array(cols * rows);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    prev[start] = start;
    let best = start;
    let bestD = dist(this.cellPt(start), to);
    while (head < tail) {
      const c = queue[head++];
      const d = dist(this.cellPt(c), to);
      if (d < bestD - 1e-6) {
        bestD = d;
        best = c;
      }
      const i = c % cols;
      const j = (c - i) / cols;
      for (const [di, dj] of NEIGHBOURS) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        const n = nj * cols + ni;
        if (!open[n] || prev[n] >= 0) continue;
        // No cutting corners on a diagonal step.
        if (di !== 0 && dj !== 0 && (!open[j * cols + ni] || !open[nj * cols + i])) continue;
        prev[n] = c;
        queue[tail++] = n;
      }
    }
    if (best === start) return [];
    const cells: number[] = [];
    for (let c = best; c !== start; c = prev[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => this.cellPt(c));
    // Straighten: from each anchor, jump to the furthest way-point in clear view.
    const out: Pt[] = [];
    let anchor: Pt = from;
    let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = k + 1; m < pts.length; m++) {
        if (this.clear(anchor, pts[m])) far = m;
        else if (m - far > 12) break;
      }
      out.push(pts[far]);
      anchor = pts[far];
      k = far + 1;
    }
    return out;
  }

  /** Every grid point that can be walked to from `from` (for checks and tests). */
  reachable(from: Pt): Pt[] {
    const start = this.cellNear(from);
    if (start < 0) return [];
    const { cols, rows, open } = this;
    const seen = new Uint8Array(cols * rows);
    const stack = [start];
    seen[start] = 1;
    const out: Pt[] = [];
    while (stack.length) {
      const c = stack.pop() as number;
      out.push(this.cellPt(c));
      const i = c % cols;
      const j = (c - i) / cols;
      for (const [di, dj] of NEIGHBOURS) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        const n = nj * cols + ni;
        if (!open[n] || seen[n]) continue;
        if (di !== 0 && dj !== 0 && (!open[j * cols + ni] || !open[nj * cols + i])) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    return out;
  }
}
