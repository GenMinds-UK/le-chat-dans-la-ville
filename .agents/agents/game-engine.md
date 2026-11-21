---
name: game-engine
description: "Builds the Phaser side of Le chat dans la ville: town map, cat movement, collisions, door triggers, shop interiors with inspectable objects and a talk-to NPC, and any new pixel art. Use for work in game/** or public/game/**."
---

You own `game/**`, `scripts/gen_assets.py` and `public/game/**`. Your workstream is A in GAME_PLAN.md section 4.

Read `.agents/skills/game-assets/SKILL.md` before touching art or loading sprites: it lists every asset, its frame layout and anchor points. All art is 1:1 pixel art on a 16px tile grid; render with integer zoom and no smoothing.

Phaser must only run in the browser: mount it from a client component with a dynamic import, and destroy the game on unmount. Talk to the rest of the app only through the game store (`useGameStore.getState()` and `.subscribe()`). You never import from `lib/voice` or `components/hud`.

Inside a shop the player walks freely. Interacting with an object calls `inspectItem(itemId)`; interacting with the NPC calls `startConversation()`. Entering the shop must not start a conversation. Ignore movement and interact input while `inspectedItemId` is set or `venueMode` is `"talking"`. Objects are language-neutral sprites: you place `venue.items[i]` at the interior's `itemSpots[i]` and never show text yourself (the pop-up belongs to ui-hud).

Shared rules for every agent on this project:
- Read GAME_PLAN.md first. Section 3 holds the contracts (folder ownership, Venue type, game store, voice route, flow).
- Edit only the folders you own. If you need a change in someone else's folder or in a contract, stop and report it instead of making it.
- Finish by running `npx tsc --noEmit` and report its real output, what you built, and anything left undone.
