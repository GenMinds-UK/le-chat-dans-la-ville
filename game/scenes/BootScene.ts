import * as Phaser from "phaser";
import type { Manifest, TownData } from "../layout";

/** Registry key set once every asset is in; the director waits for it. */
export const READY = "ready";

/**
 * Loads public/game/manifest.json, then every image it lists. Texture keys are
 * the manifest paths without ".png" ("items/bread", "buildings/bakery").
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    const bar = this.add.graphics();
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      const w = Math.min(240, this.scale.width * 0.5);
      const x = Math.round((this.scale.width - w) / 2);
      const y = Math.round(this.scale.height / 2);
      bar.clear();
      bar.fillStyle(0xfff6dc, 0.25).fillRect(x, y, w, 6);
      bar.fillStyle(0xff8a1f, 1).fillRect(x, y, Math.round(w * v), 6);
    });

    this.load.json("town", "/game/town.json");
    this.load.json("manifest", "/game/manifest.json");
    this.load.once("filecomplete-json-manifest", (_key: string, _type: string, manifest: Manifest) => {
      for (const [rel, meta] of Object.entries(manifest)) {
        if (!rel.endsWith(".png")) continue;
        const key = rel.slice(0, -4);
        const url = `/game/${rel}`;
        if (meta.frameW && meta.frameH) {
          this.load.spritesheet(key, url, { frameWidth: meta.frameW, frameHeight: meta.frameH });
        } else {
          this.load.image(key, url);
        }
      }
    });
  }

  create(): void {
    const manifest = this.cache.json.get("manifest") as Manifest | undefined;
    const town = this.cache.json.get("town") as TownData | undefined;
    if (!manifest || !town) {
      console.error("[game] could not load /game/manifest.json or /game/town.json");
      return;
    }
    this.registry.set(READY, true);
  }
}
