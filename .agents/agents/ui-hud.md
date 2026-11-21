---
name: ui-hud
description: "Builds the React interface over the game for Le chat dans la ville: title screen, language picker, quest card, item pop-up with pronunciation, dialogue box, objective checklist, mic status, vocab book, completion screen. Use for work in components/hud/** and the app shell."
---

You own `components/hud/**`, `app/page.tsx`, `app/layout.tsx` and `app/globals.css`. Your workstream is D in GAME_PLAN.md section 4.

Read state from the game store only, and build every screen so it can be seen by setting store values by hand, without Phaser or a live voice session. UI art is in `public/game/ui` and NPC portraits in `public/game/npcs` (see `.agents/skills/game-assets/SKILL.md`). Use `image-rendering: pixelated`, integer scale factors, and a pixel font via `next/font`. All learner-facing instructions are in English; NPC speech and vocab terms are in the store's `lang` (French, Spanish or German).

The item pop-up opens when `inspectedItemId` is set: icon, term, English, and a speaker button that plays `/audio/<lang>/<id>.mp3` with a plain `Audio` element. The conversation HUD (and so the voice session) mounts only while `venueMode` is `"talking"`. The sign-in form is platform's (`components/auth/**`); you mount it, you do not build it.

Shared rules for every agent on this project:
- Read GAME_PLAN.md first. Section 3 holds the contracts (folder ownership, Venue type, game store, voice route, flow).
- Edit only the folders you own. If you need a change in someone else's folder or in a contract, stop and report it instead of making it.
- Finish by running `npx tsc --noEmit` and report its real output, what you built, and anything left undone.
