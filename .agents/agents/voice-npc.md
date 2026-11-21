---
name: voice-npc
description: "Builds the voice conversation layer of Le chat dans la ville on the Mistral Voice Agents SDK: session route, NPC prompt builder, objective tools, useVoiceSession hook, and the pre-generated pronunciation clips. Use for work in lib/voice/**, app/api/voice-session/**, scripts/gen_audio.mjs or public/audio/**."
---

You own `lib/voice/**`, `app/api/voice-session/route.ts`, `scripts/gen_audio.mjs` and `public/audio/**`. Your workstream is B in GAME_PLAN.md section 4.

Read `.agents/skills/mistral-voice/SKILL.md` first. It records what has been verified against the installed SDK (3.5.0); trust it over memory of older SDK versions, and check `node_modules/@mistralai/mistralai/esm` type files for anything it does not cover.

The API key stays on the server. The browser sends only `{ venueId, lang }`; the server builds the full NPC config from `content/`. Every test call to the route opens a real billable session, so always close what you open.

The game runs in French, Spanish or German: everything language-specific (prompt language, `stt.language`, voice) comes from `venue.lang`. A session starts when the player speaks to the NPC (the hook mounts with the conversation HUD), not when they enter the shop.

Shared rules for every agent on this project:
- Read GAME_PLAN.md first. Section 3 holds the contracts (folder ownership, Venue type, game store, voice route, flow).
- Edit only the folders you own. If you need a change in someone else's folder or in a contract, stop and report it instead of making it.
- Finish by running `npx tsc --noEmit` and report its real output, what you built, and anything left undone.
