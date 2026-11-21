import * as Phaser from "phaser";
import { getVenue, hasVenue } from "@/content";
import type { Lang, VenueId } from "@/content/types";
import { useGameStore, type GameState } from "@/lib/state/gameStore";
import type { Controls } from "../controls";
import {
  interiorTargets,
  onExitMat,
  targetInReach,
  zoomFor,
  type InteriorMeta,
  type Manifest,
  type Target,
} from "../layout";
import { DIR, dirOf, Player } from "../player";
import { dist, inRect, World } from "../world";

const BG_DEPTH = -1000;
const UI_DEPTH = 100000;
const INK = "#2b2233";
const REPATH_MS = 180;
/** After a pop-up or conversation closes, ignore the interact key this long. */
const QUIET_MS = 250;

export type VenueSceneData = { venueId: VenueId; lang: Lang };

/** Input is ignored while a pop-up, a conversation or the completion screen is up. */
const isLocked = (s: GameState): boolean =>
  s.scene !== "venue" ||
  s.inspectedItemId !== null ||
  s.venueMode === "talking" ||
  s.justCompletedVenueId !== null;

/**
 * A shop interior. The player walks freely; objects call inspectItem, the
 * shopkeeper calls startConversation, the mat calls leaveVenue. Nothing here
 * shows text: the pop-up and the conversation belong to the HUD.
 */
export class VenueScene extends Phaser.Scene {
  private meta!: InteriorMeta;
  private venueId!: VenueId;
  private world!: World;
  private player!: Player;
  private controls!: Controls;
  /** What can be interacted with. Empty when the venue has no content yet. */
  private targets: Target[] = [];
  /** Store item id for each item spot. */
  private itemIds: (string | null)[] = [];
  private corners: Phaser.GameObjects.Image[] = [];
  private prompt!: Phaser.GameObjects.Image;
  private exclaim!: Phaser.GameObjects.Image;
  private hasContent = false;
  private pending: Target | null = null;
  private touch = false;
  private dragging = false;
  private lastPathAt = 0;
  private wasLocked = false;
  private wasTalking = false;
  private quietUntil = 0;
  private leaving = false;

  constructor() {
    super("Venue");
  }

  create(data: VenueSceneData): void {
    const manifest = this.cache.json.get("manifest") as Manifest;
    const meta = manifest[`interiors/${data.venueId}_bg.png`] as InteriorMeta;
    this.meta = meta;
    this.venueId = data.venueId;
    this.controls = this.registry.get("controls") as Controls;
    this.pending = null;
    this.dragging = false;
    this.lastPathAt = 0;
    this.wasLocked = false;
    this.wasTalking = false;
    this.quietUntil = 0;
    this.leaving = false;

    const venue = hasVenue(data.lang, data.venueId) ? getVenue(data.lang, data.venueId) : null;
    this.hasContent = venue !== null;

    // Room, shopkeeper, then the counter over the shopkeeper's legs.
    this.add.image(0, 0, `interiors/${data.venueId}_bg`).setOrigin(0, 0).setDepth(BG_DEPTH);
    const npcKey = venue && this.textures.exists(`npcs/${venue.npc.sprite}`) ? venue.npc.sprite : meta.npc;
    this.add
      .image(meta.npcFeet.x, meta.npcFeet.y + 1, `npcs/${npcKey}`)
      .setOrigin(0.5, 1)
      .setDepth(meta.npcFeet.y);
    this.add.image(0, 0, `interiors/${data.venueId}_fg`).setOrigin(0, 0).setDepth(meta.npcFeet.y + 0.5);

    // Items: venue.items[i] on itemSpots[i]. Without content, the same icons
    // are shown from the manifest's list but cannot be inspected.
    this.itemIds = meta.itemSpots.map(() => null);
    meta.itemSpots.forEach((spot, i) => {
      const item = venue ? venue.items[i] : undefined;
      if (venue && !item) return;
      let icon = item ? item.icon : meta.items[i];
      if (!this.textures.exists(`items/${icon}`)) {
        console.warn(`[game] no art for item icon "${icon}" in ${data.venueId}`);
        icon = meta.items[i];
        if (!this.textures.exists(`items/${icon}`)) return;
      }
      this.add.image(spot.x, spot.y, `items/${icon}`).setOrigin(0.5, 1).setDepth(spot.y + 10);
      this.itemIds[i] = item ? item.id : null;
    });
    this.targets = venue
      ? interiorTargets(meta).filter((t) => t.kind === "npc" || this.itemIds[t.index] !== null)
      : [];

    // Highlight brackets, key / tap prompt, and the "talk to me" mark.
    this.corners = [0, 1, 2, 3].map((i) =>
      this.add
        .image(0, 0, "ui/corner")
        .setOrigin(i % 2, i < 2 ? 0 : 1)
        .setFlip(i % 2 === 1, i >= 2)
        .setDepth(UI_DEPTH)
        .setVisible(false),
    );
    this.prompt = this.add.image(0, 0, "ui/key_e").setOrigin(0.5, 1).setDepth(UI_DEPTH).setVisible(false);
    this.exclaim = this.add
      .image(meta.npcFeet.x, 0, "ui/exclaim")
      .setOrigin(0.5, 1)
      .setDepth(UI_DEPTH)
      .setVisible(false);

    this.world = new World(meta.floor, meta.solids);
    this.player = new Player(this, this.world, meta.entry, DIR.up);

    const cam = this.cameras.main;
    cam.setBackgroundColor(INK);
    cam.setRoundPixels(true);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  update(time: number, delta: number): void {
    if (this.leaving) return;
    const s = useGameStore.getState();
    const talking = s.scene === "venue" && s.venueMode === "talking";

    // Conversation started (from here or from outside): step up to the counter.
    if (talking && !this.wasTalking) this.player.walkTo(this.meta.talkSpot);
    this.wasTalking = talking;

    if (isLocked(s)) {
      this.wasLocked = true;
      this.pending = null;
      this.dragging = false;
      this.controls.clearInteract();
      if (!talking) this.player.stop();
      this.player.update(delta, null);
      if (talking && !this.player.walking) this.player.face(DIR.up);
      this.showTarget(null, time);
      this.showExclaim(false, time);
      return;
    }
    if (this.wasLocked) {
      this.wasLocked = false;
      this.quietUntil = time + QUIET_MS;
      this.player.stop();
    }

    const keys = this.controls.vector();
    if (keys.x !== 0 || keys.y !== 0) {
      this.pending = null;
      this.dragging = false;
      this.touch = false;
    } else if (this.dragging && this.input.activePointer.isDown && time - this.lastPathAt > REPATH_MS) {
      const p = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      this.player.walkTo({ x: p.x, y: p.y });
      this.lastPathAt = time;
    }
    this.player.update(delta, keys);

    if (onExitMat(this.player.pos, this.meta.exit)) {
      this.leaving = true;
      s.leaveVenue(); // the director swaps scenes before the next frame
      return;
    }

    const near = targetInReach(this.player.pos, this.targets);
    let act: Target | null = null;
    if (this.controls.takeInteract() && time >= this.quietUntil && near) {
      this.touch = false;
      act = near;
    }
    if (this.pending) {
      // Tapped something out of reach: interact as soon as the cat gets there.
      if (dist(this.player.pos, this.pending.at) <= this.pending.reach) act = this.pending;
      else if (!this.player.walking) this.pending = null;
    }
    if (act) {
      this.interact(act);
      this.showTarget(null, time);
      return;
    }
    this.showTarget(near, time);
    this.showExclaim(near?.kind !== "npc", time);
  }

  // ---- interaction ----

  private interact(t: Target): void {
    const s = useGameStore.getState();
    this.pending = null;
    this.dragging = false;
    this.player.stop();
    this.player.face(dirOf(t.at.x - this.player.pos.x, t.at.y - this.player.pos.y));
    if (t.kind === "item") {
      const id = this.itemIds[t.index];
      if (id) s.inspectItem(id);
    } else {
      s.startConversation(); // opens no voice session itself: the HUD does, on seeing "talking"
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.leaving || isLocked(useGameStore.getState())) return;
    this.touch = pointer.wasTouch;
    const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = this.targets.find((t) => inRect(p, t.frame, 5));
    if (!target) {
      this.pending = null;
      this.dragging = true;
      this.lastPathAt = this.time.now;
      this.player.walkTo({ x: p.x, y: p.y });
    } else if (dist(this.player.pos, target.at) <= target.reach) {
      this.interact(target);
    } else {
      this.pending = target;
      this.dragging = false;
      this.player.walkTo(target.at);
    }
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  // ---- markers ----

  /** Brackets round the thing in reach, with the key (or tap) prompt above it. */
  private showTarget(t: Target | null, time: number): void {
    const on = t !== null;
    for (const c of this.corners) c.setVisible(on);
    this.prompt.setVisible(on);
    if (!t) return;
    const grow = Math.floor(time / 320) % 2;
    const l = t.frame.x - grow;
    const r = t.frame.x + t.frame.w + grow;
    const top = t.frame.y - grow;
    const bottom = t.frame.y + t.frame.h + grow;
    this.corners[0].setPosition(l, top);
    this.corners[1].setPosition(r, top);
    this.corners[2].setPosition(l, bottom);
    this.corners[3].setPosition(r, bottom);
    this.prompt
      .setTexture(this.touch ? "ui/tap" : "ui/key_e")
      .setPosition(t.frame.x + t.frame.w / 2, t.frame.y - 3 + Math.round(Math.sin(time / 220)));
  }

  /** The exclamation mark over the shopkeeper until the shop is completed. */
  private showExclaim(allowed: boolean, time: number): void {
    const done = useGameStore.getState().completedVenues.includes(this.venueId);
    const on = allowed && this.hasContent && !done;
    this.exclaim.setVisible(on);
    if (on) this.exclaim.setY(this.meta.npcFeet.y - 25 + Math.round(Math.sin(time / 220) * 1.5));
  }

  // ---- camera ----

  private layout(): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    cam.setSize(width, height);
    cam.setZoom(zoomFor(width, height));
    cam.centerOn(this.meta.w / 2, this.meta.h / 2);
  }
}
