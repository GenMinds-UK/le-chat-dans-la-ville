// What the art generator tells the game (public/game/manifest.json and
// town.json), and the geometry rules built on it: door zones, exit mat, what
// is in reach. No Phaser in here.

import { dist, FEET, type Pt, type Rect } from "./world";

// ---- manifest.json ----

export type AssetMeta = {
  w: number;
  h: number;
  frameW?: number;
  frameH?: number;
  /** buildings: bottom-centre of the door, in image pixels */
  door?: Pt;
  /** buildings and props: the part that blocks the player, in image pixels */
  solid?: Rect;
};

export type InteriorMeta = AssetMeta & {
  npcFeet: Pt;
  talkSpot: Pt;
  entry: Pt;
  exit: Rect;
  /** where the player may stand */
  floor: Rect;
  /** walls, counter, stands, plants */
  solids: Rect[];
  /** bottom-centre of each item icon; item i goes on spot i */
  itemSpots: Pt[];
  /** icon names used when the venue has no content yet */
  items: string[];
  /** NPC sprite name ("baker"), used when the venue has no content yet */
  npc: string;
};

export type Manifest = Record<string, AssetMeta>;

// ---- town.json ----

export type TownSprite = { sprite: string; x: number; y: number };
export type TownBuilding = TownSprite & { venue: string | null };
export type TownData = {
  tile: number;
  cols: number;
  rows: number;
  tiles: number[][];
  tileNames: string[];
  play: Rect;
  spawn: Pt;
  solids: Rect[];
  buildings: TownBuilding[];
  props: TownSprite[];
};

/** A sprite's solid rectangle in world pixels (sprites are anchored bottom-centre). */
export function worldSolid(s: TownSprite, meta: AssetMeta): Rect | null {
  if (!meta.solid) return null;
  return {
    x: Math.round(s.x - meta.w / 2) + meta.solid.x,
    y: s.y - meta.h + meta.solid.y,
    w: meta.solid.w,
    h: meta.solid.h,
  };
}

export function townSolids(town: TownData, manifest: Manifest): Rect[] {
  const out: Rect[] = [...town.solids];
  for (const s of [...town.buildings, ...town.props]) {
    const meta = manifest[`${s.sprite}.png`];
    const r = meta ? worldSolid(s, meta) : null;
    if (r) out.push(r);
  }
  return out;
}

// ---- doors (town) ----

/** Bottom-centre of a building's door in world pixels. */
export function doorOf(b: TownSprite, meta: AssetMeta): Pt {
  const door = meta.door ?? { x: meta.w / 2, y: meta.h };
  return { x: Math.round(b.x - meta.w / 2) + door.x, y: b.y - meta.h + door.y };
}

const DOOR_HALF = 8;
const DOOR_DEPTH = FEET.up + 6;

/** Standing on the doorstep. Entering also needs the player to be heading in. */
export const inDoorZone = (feet: Pt, door: Pt): boolean =>
  Math.abs(feet.x - door.x) <= DOOR_HALF && feet.y >= door.y && feet.y <= door.y + DOOR_DEPTH;

/** Where tap-to-walk aims for when a door is tapped. */
export const doorStep = (door: Pt): Pt => ({ x: door.x, y: door.y + FEET.up + 1 });

/** Where the player is put when coming back out: clear of the door zone. */
export const outsideDoor = (door: Pt): Pt => ({ x: door.x, y: door.y + DOOR_DEPTH + 6 });

/** The part of the building that counts as "tapping the door". */
export const doorTapArea = (door: Pt): Rect => ({ x: door.x - 12, y: door.y - 30, w: 24, h: 30 + DOOR_DEPTH + 2 });

// ---- interiors ----

/** Feet far enough onto the exit mat to leave the shop. */
export const onExitMat = (feet: Pt, exit: Rect): boolean =>
  feet.x >= exit.x && feet.x < exit.x + exit.w && feet.y >= exit.y + 2;

export type Target = {
  kind: "item" | "npc";
  index: number;
  /** the point distances are measured to */
  at: Pt;
  reach: number;
  /** on-screen rectangle, for the highlight and for taps */
  frame: Rect;
};

const ITEM_REACH = 24;

export function interiorTargets(meta: InteriorMeta): Target[] {
  const out: Target[] = meta.itemSpots.map((s, index) => ({
    kind: "item" as const,
    index,
    at: { x: s.x, y: s.y - 2 },
    reach: ITEM_REACH,
    frame: { x: s.x - 9, y: s.y - 17, w: 18, h: 18 },
  }));
  // The shopkeeper is behind the counter, so "in reach" means standing in
  // front of them: around the midpoint between their feet and the talk spot.
  const { npcFeet, talkSpot } = meta;
  out.push({
    kind: "npc",
    index: 0,
    at: { x: (npcFeet.x + talkSpot.x) / 2, y: (npcFeet.y + talkSpot.y) / 2 },
    reach: dist(npcFeet, talkSpot) / 2 + 14,
    frame: { x: npcFeet.x - 13, y: npcFeet.y - 27, w: 26, h: 21 },
  });
  return out;
}

/** The nearest target in reach of the player's feet, if any. */
export function targetInReach(feet: Pt, targets: readonly Target[]): Target | null {
  let best: Target | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const d = dist(feet, t.at);
    if (d <= t.reach && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

// ---- view ----

/** The room size every screen must be able to show in full. */
export const VIEW = { w: 240, h: 160 };

/** Largest whole-number zoom at which a VIEW-sized room still fits. */
export const zoomFor = (width: number, height: number): number =>
  Math.max(1, Math.floor(Math.min(width / VIEW.w, height / VIEW.h)));
