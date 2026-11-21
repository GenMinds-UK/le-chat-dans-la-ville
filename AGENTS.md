# Le chat dans la ville

A top-down pixel-art town game for learning French, Spanish or German (the player
chooses at the start). The player (a cat) visits shops — bakery, pharmacy,
supermarket, bank — inspects the objects in each to learn and hear their names, then
speaks to the shopkeeper NPC to start a real spoken conversation, powered by Mistral
voice agents. Players sign in with email and password.

This file is the entry point for any coding agent. Nothing here is specific to one
tool.

## Read first

- `GAME_PLAN.md` — the build plan: phases, workstreams, and the shared contracts
  (section 3) that every workstream depends on.
- `.agents/skills/<name>/SKILL.md` — how-to knowledge for one area. Read the
  relevant one before working in that area.
- `.agents/agents/<role>.md` — the brief for each workstream role, for when the
  work is split between several agents.

## Stack

Next.js 16 (App Router), React 19, TypeScript, `@mistralai/mistralai` 3.5 with
`livekit-client` for voice. Planned: Phaser 3 (game), zustand (state), Supabase
(auth and progress), Vercel (hosting).

## Commands

```
npm install          # also runs agents:sync (see below)
npm run dev          # http://localhost:3000
npm run build
npx tsc --noEmit     # type-check; run before reporting work as done
python scripts/gen_assets.py   # regenerate all art (Python 3 + Pillow)
```

`MISTRAL_API_KEY` goes in `.env.local` (gitignored).

## Layout

```
app/                      Next.js pages and API routes
app/api/voice-session/    creates and closes Mistral voice sessions (holds the key)
components/               React components
public/game/              generated art; manifest.json lists every file
public/sprites/cat/       source art for the player
scripts/gen_assets.py     art generator
GAME_PLAN.md              plan and contracts
.agents/                  skills and role briefs (source of truth)
```

Planned folders (`game/`, `lib/voice/`, `lib/state/`, `content/`,
`components/hud/`, `components/auth/`, `lib/supabase/`, `public/audio/`) and who owns each are in `GAME_PLAN.md` 3.1.

## Rules

- The Mistral API key is server-only. The browser gets only
  `{ id, participantToken, serverUrl }`.
- Every `POST /api/voice-session` opens a real, billable session. Close what you open.
- Art is never edited by hand: change `scripts/gen_assets.py` and re-run it.
- Learner-facing instructions are in English; NPC speech is in the chosen language
  (French, Spanish or German) at A1–A2 level. Never hard-code one language: take it
  from the store's `lang` or the venue's `lang`.
- A voice session opens only when the player speaks to the NPC, never on entering a
  shop. Object pronunciation uses the pre-generated clips in `public/audio/`.
- The game is original work in a retro style. Do not copy characters, art or names
  from existing games.
- Ask the user before creating cloud projects, applying hosted database migrations,
  changing production environment variables, or deploying to production.
- Never print or commit secrets.

## Skills

| Skill | Read it before |
|---|---|
| `game-assets` | loading sprites, using UI art, or making new art |
| `mistral-voice` | changing the voice route or anything in `lib/voice/` |
| `venue-content` | editing `content/` |
| `deploy-platform` | Supabase schema or auth work, or deploying |
| `playtest` | testing, verifying, or preparing a deploy |

## Roles

`game-engine`, `voice-npc`, `content-designer`, `ui-hud`, `platform`,
`qa-playtest`. Each brief says which folders the role owns. Edit only what you own;
if a contract or someone else's folder needs to change, report it instead.

## Tool-specific setup

`.agents/` is the source of truth. Tools that read `AGENTS.md` and
`.agents/skills` need nothing extra.

A tool that looks for these files in a folder of its own gets generated copies.
List the folders in `.agents/sync-targets.local.json` (gitignored) as pairs of
`[from, to]`, for example `[[".agents/skills", ".mytool/skills"]]`.
`npm run agents:sync` (also run on `npm install`) copies each pair. Edit the files
in `.agents/`, never the copies, and keep the copies out of git.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
