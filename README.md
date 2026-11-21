# Le chat dans la ville

A top-down pixel-art town game for learning French, Spanish or German. You play a
cat. Each shop (bakery, pharmacy, supermarket, bank) holds six objects you can
inspect to see and hear their names, and a shopkeeper. Speaking to the shopkeeper
starts a real spoken conversation in the language you chose, and a checklist of
objectives ticks off as you get through it. Finishing a shop unlocks the next.

Conversations run on [Mistral voice agents](https://docs.mistral.ai/studio/audio/voice-agents/browser).
Players sign in with email and password, and progress is saved per language.

Production: https://mistral-hack.genminds.co.uk (deploys from `main`).

## Status

The game is being built to [GAME_PLAN.md](./GAME_PLAN.md).

| Part | State |
|---|---|
| Content: four shops in three languages | Done |
| Game store and content contracts | Done |
| Accounts (Supabase email and password) and progress sync | Done |
| HUD and app shell (title, language picker, quest card, item pop-up, conversation HUD, vocab book) | Done |
| Phaser game (town, shop interiors, item art) | Done |
| Voice layer (NPC prompts, objective tool and judge, session hook) | Done |
| Pronunciation clips (51 per language) | Done |
| Voice route protection (sign-in required, 20 conversations per user per hour) | Done; signed-out requests verified, the signed-in cap not yet exercised |
| QA pass from the `playtest` skill, in each language | Not done |
| Mistral key and Supabase variables on Vercel | Not set: conversations do not work on the production URL until they are |

## Run it

Needs Node 18.18 or later. Python 3 with Pillow is only needed to regenerate art.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   ```
   MISTRAL_API_KEY=                       # server only, from console.mistral.ai
   NEXT_PUBLIC_SUPABASE_URL=              # from the Supabase project's API settings
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```
3. `npm run dev` and open http://localhost:3000. The microphone works on
   `localhost` and on HTTPS.

Every conversation opens a real, billable Mistral session.

## Commands

```
npm run dev                    # http://localhost:3000
npm run build
npx tsc --noEmit               # type-check
python scripts/gen_assets.py   # regenerate all art into public/game/
npm run gen:audio              # generate missing pronunciation clips into public/audio/
```

`/dev/hud` (development only) shows every HUD state without signing in, Phaser or
a voice session.

## How it fits together

```
app/page.tsx            shell: title -> sign in -> language picker -> game + HUD
game/                   Phaser: town, shop interiors, movement, interaction
components/hud/         React overlays on top of the canvas
components/auth/        sign-in and sign-up form
lib/state/gameStore.ts  zustand store; the only thing Phaser and React share
lib/voice/              NPC prompt builder, objective tool, useVoiceSession hook
lib/supabase/           browser and server clients, auth helpers, progress sync, voice route guard
app/api/voice-session/  creates and closes Mistral voice sessions; judge/ double-checks objectives
content/                venues: venues.ts is language-neutral, <lang>/<venue>.ts holds the strings
public/game/            generated art; manifest.json lists every file
public/audio/           pre-generated pronunciation clips, <lang>/<id>.mp3
scripts/                gen_assets.py (art), gen_audio.mjs (clips), sync-agents.mjs
supabase/migrations/    database schema
```

Phaser and React talk only through the store: Phaser calls actions such as
`enterVenue`, `inspectItem` and `startConversation`, and the HUD renders from the
resulting state.

Voice sessions:

```
Browser --POST /api/voice-session {venueId, lang}--> route (holds MISTRAL_API_KEY)
        <-- { id, participantToken, serverUrl } --
Browser <== realtime audio (LiveKit) ==> Mistral
Browser --DELETE /api/voice-session?sessionId=...--> route --> sessions.close()
```

The API key never reaches the browser, and the server builds the NPC's prompt from
`content/` so the browser cannot change it. A session opens only when the player
speaks to the shopkeeper, never on entering a shop. Object pronunciation plays
pre-generated clips, so it costs nothing at play time.

## Working on it

[AGENTS.md](./AGENTS.md) is the entry point for contributors and coding agents: the
rules, who owns which folder, and the skills in `.agents/skills/` that document
each area (art, voice, content, deployment, playtesting).

- Art is never edited by hand: change `scripts/gen_assets.py` and re-run it.
- Never hard-code a language: take it from the store's `lang` or the venue's `lang`.
- Interface text is English; NPC speech and vocabulary are in the chosen language at A1–A2.
- Never print or commit secrets.

[PLAN.md](./PLAN.md) is the plan for the original voice-agent prototype this grew
from, kept for reference.

## Credits

The game's art and characters are original, generated by `scripts/gen_assets.py`.
`public/avatars/mistral-cat.*` is Mistral AI's pixel-cat emblem from their brand
kit (https://mistral.ai/brand/), a trademark of Mistral AI.
