import * as Phaser from "phaser";
import { currentQuestVenue, isVenueId, isVenueUnlocked } from "@/content";
import type { VenueId } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import type { Controls } from "../controls";
import {
  doorOf,
  doorStep,
  doorTapArea,
  inDoorZone,
  outsideDoor,
  townSolids,
  zoomFor,
  type Manifest,
  type TownData,
} from "../layout";
import { DIR, Player } from "../player";
import { inRect, World, type Pt } from "../world";

const GROUND_DEPTH = -1000;
const MARKER_DEPTH = 100000;
const GRASS = "#6abe5a";
const REPATH_MS = 180;

type Door = {
  venue: VenueId;
  at: Pt;
  /** top-centre of the building, where the arrow and star sit */
  roof: Pt;
  lock: Phaser.GameObjects.Image;
  star: Phaser.GameObjects.Image;
};

export type TownSceneData = { fromVenue?: VenueId | null };

/**
 * The town. Also the backdrop while the store's scene is "title": then it is
 * drawn but takes no input.
 */
export class TownScene extends Phaser.Scene {
  private town!: TownData;
  private world!: World;
  private player!: Player;
  private controls!: Controls;
  private doors: Door[] = [];
  private arrow!: Phaser.GameObjects.Image;
  private arrowAt: Pt | null = null;
  private pendingDoor: VenueId | null = null;
  private dragging = false;
  private lastPathAt = 0;
  private rattleUntil = 0;
  private leaving = false;

  constructor() {
    super("Town");
  }

  create(data: TownSceneData): void {
    const manifest = this.cache.json.get("manifest") as Manifest;
    this.town = this.cache.json.get("town") as TownData;
    this.controls = this.registry.get("controls") as Controls;
    this.doors = [];
    this.arrowAt = null;
    this.pendingDoor = null;
    this.dragging = false;
    this.lastPathAt = 0;
    this.rattleUntil = 0;
    this.leaving = false;
    const town = this.town;

    // Ground.
    const map = this.make.tilemap({ data: town.tiles, tileWidth: town.tile, tileHeight: town.tile });
    const tileset = map.addTilesetImage("town", "tiles/town_tiles", town.tile, town.tile, 0, 0);
    const ground = tileset ? map.createLayer(0, tileset, 0, 0) : null;
    ground?.setDepth(GROUND_DEPTH);
    const w0 = town.tileNames.indexOf("water_0");
    const w1 = town.tileNames.indexOf("water_1");
    if (ground && w0 >= 0 && w1 >= 0) {
      this.time.addEvent({ delay: 600, loop: true, callback: () => ground.swapByIndex(w0, w1) });
    }

    // Buildings and props, sorted by their bottom edge.
    for (const s of [...town.buildings, ...town.props]) {
      if (!this.textures.exists(s.sprite)) continue;
      this.add.image(s.x, s.y, s.sprite).setOrigin(0.5, 1).setDepth(s.y);
    }

    // Doors and their markers.
    for (const b of town.buildings) {
      const meta = manifest[`${b.sprite}.png`];
      if (!meta || !isVenueId(b.venue)) continue;
      const at = doorOf(b, meta);
      this.doors.push({
        venue: b.venue,
        at,
        roof: { x: b.x, y: b.y - meta.h },
        lock: this.add.image(at.x, at.y - 13, "ui/lock").setDepth(MARKER_DEPTH),
        star: this.add.image(b.x, b.y - meta.h + 2, "ui/star").setOrigin(0.5, 1).setDepth(MARKER_DEPTH),
      });
    }
    this.arrow = this.add.image(0, 0, "ui/arrow").setOrigin(0.5, 1).setDepth(MARKER_DEPTH);

    // The cat: at the door of the shop it has just left, otherwise in the plaza.
    this.world = new World(town.play, townSolids(town, manifest));
    const from = this.doors.find((d) => d.venue === data?.fromVenue);
    const start = from ? outsideDoor(from.at) : town.spawn;
    this.player = new Player(this, this.world, this.world.free(start.x, start.y) ? start : town.spawn, DIR.down);

    const cam = this.cameras.main;
    cam.setBackgroundColor(GRASS);
    cam.setRoundPixels(true);
    cam.startFollow(this.player.object, true, 1, 1, 0, 12);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);

    this.refreshMarkers();
    const unsubscribe = useGameStore.subscribe((s, prev) => {
      if (s.completedVenues !== prev.completedVenues || s.scene !== prev.scene || s.lang !== prev.lang) {
        this.refreshMarkers();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  update(time: number, delta: number): void {
    if (this.leaving) return;
    const s = useGameStore.getState();
    this.bobArrow(time);

    if (s.scene !== "town") {
      // Title screen (or about to switch): a quiet backdrop.
      this.controls.clearInteract();
      this.pendingDoor = null;
      this.dragging = false;
      this.player.stop();
      this.player.update(delta, null);
      return;
    }

    const keys = this.controls.vector();
    this.controls.clearInteract(); // nothing to interact with out here
    if (keys.x !== 0 || keys.y !== 0) {
      this.pendingDoor = null;
      this.dragging = false;
    } else if (this.dragging && this.input.activePointer.isDown && time - this.lastPathAt > REPATH_MS) {
      // Finger or mouse held down: keep walking towards it.
      this.walkToPointer(this.input.activePointer, time);
    }
    this.player.update(delta, keys);

    for (const door of this.doors) {
      if (!inDoorZone(this.player.pos, door.at)) continue;
      if (keys.y >= 0 && this.pendingDoor !== door.venue) continue;
      this.pendingDoor = null;
      this.dragging = false;
      if (isVenueUnlocked(door.venue, s.completedVenues)) {
        this.leaving = true;
        this.player.stop();
        s.enterVenue(door.venue); // the director swaps scenes before the next frame
        return;
      }
      this.rattle(door, time);
    }
    if (this.pendingDoor && !this.player.walking) this.pendingDoor = null;
  }

  // ---- input ----

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.leaving || useGameStore.getState().scene !== "town") return;
    this.dragging = true;
    this.walkToPointer(pointer, this.time.now);
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  private walkToPointer(pointer: Phaser.Input.Pointer, time: number): void {
    const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const door = this.doors.find((d) => inRect(p, doorTapArea(d.at)));
    this.pendingDoor = door ? door.venue : null;
    this.player.walkTo(door ? doorStep(door.at) : { x: p.x, y: p.y });
    this.lastPathAt = time;
  }

  // ---- markers ----

  private refreshMarkers(): void {
    const s = useGameStore.getState();
    const quest = s.scene === "town" ? currentQuestVenue(s.completedVenues) : null;
    this.arrowAt = null;
    for (const door of this.doors) {
      const done = s.completedVenues.includes(door.venue);
      door.star.setVisible(done);
      door.lock.setVisible(!done && !isVenueUnlocked(door.venue, s.completedVenues));
      if (door.venue === quest) this.arrowAt = door.roof;
    }
    this.arrow.setVisible(this.arrowAt !== null);
  }

  private bobArrow(time: number): void {
    if (!this.arrowAt) return;
    this.arrow.setPosition(this.arrowAt.x, this.arrowAt.y + Math.round(Math.sin(time / 220) * 2));
  }

  /** A locked door: shake the padlock instead of opening. */
  private rattle(door: Door, time: number): void {
    if (time < this.rattleUntil) return;
    this.rattleUntil = time + 500;
    this.tweens.add({
      targets: door.lock,
      x: { from: door.at.x - 2, to: door.at.x + 2 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => door.lock.setX(door.at.x),
    });
  }

  // ---- camera ----

  private layout(): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    const zoom = zoomFor(width, height);
    cam.setSize(width, height);
    cam.setZoom(zoom);
    // Keep the view inside the map; if the view is larger, centre the map in it.
    const mapW = this.town.cols * this.town.tile;
    const mapH = this.town.rows * this.town.tile;
    const bw = Math.max(mapW, Math.ceil(width / zoom));
    const bh = Math.max(mapH, Math.ceil(height / zoom));
    cam.setBounds(Math.floor((mapW - bw) / 2), Math.floor((mapH - bh) / 2), bw, bh);
  }
}
