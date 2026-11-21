---
name: venue-content
description: How to write a venue for Le chat dans la ville in French, Spanish and German — quest, objectives, shop items, phrases, NPC persona and opening line — and how to add a new venue or language. Load before editing anything in content/.
---

# Writing venue content

The game is played in French, Spanish or German, chosen by the player. Every venue
exists in all three. Types are in `content/types.ts`, described in GAME_PLAN.md
section 3.2.

```
content/venues.ts          language-neutral: order, unlocks, NPC sprite, item ids and
                           icons, objective ids and English text, English quest
content/<lang>/<venue>.ts  one language's strings: shop name, NPC name, persona,
                           voiceId, welcome line, item terms, phrases, hints
content/index.ts           getVenue(lang, id), VENUE_ORDER, LANGS
```

`content/venues.ts` plus `content/fr/bakery.ts` are the reference: match them.

## Who it is for

English-speaking beginners, A1–A2. They can say greetings, numbers and a few nouns.
The win is getting through a real exchange out loud, not accuracy.

## How a shop plays

The player walks in, inspects the objects (each shows its name in the target
language and English, with a pronunciation button), then speaks to the shopkeeper,
which starts the conversation. So the items teach the words the conversation then
asks for: the quest must be doable using the shop's items and phrases.

## Rules

Shared, in `content/venues.ts`:

- **Quest** (English): one sentence with a concrete errand. "Ask the baker for two
  loaves of bread and a croissant", not "Practise shopping".
- **Items** (6 per shop): typical objects found in that shop. Each has an `id`
  (short snake_case, unique across the whole game, same in every language) and an
  `icon` that exists in `public/game/items/`. Agree the list with game-engine, who
  draws the icons. Pick things that are typical in France, Spain and Germany alike.
- **Objectives** (English, 3–5): things the player *says or achieves*, in the order
  a real visit goes — greet, ask for the thing, handle one follow-up (price,
  quantity, a question from the NPC), pay or confirm, say goodbye. Each must be
  something the NPC can clearly judge from one or two player turns. Ids are short
  snake_case.

Per language, in `content/<lang>/<venue>.ts`:

- **Item terms**: the everyday word with its article, since the article carries the
  gender (`la baguette`, `la barra de pan`, `das Brot`). Use the word a shopkeeper
  there would use, not a literal translation of the English.
- **Phrases** (4–8): what the conversation needs beyond the items — greeting,
  please, how much, numbers used in the quest, goodbye. Ids are shared across
  languages like item ids.
- **Hints** (English, with the phrase to say in the target language): shown if the
  player is stuck, e.g. `Try: "C'est combien ?"`.
- **Persona**: two or three traits that affect how the NPC talks, plus one fact that
  gives the player something to react to (the croissants are fresh, the card
  machine is broken). Keep the same character across languages.
- **NPC name and shop name**: natural for the language.
- **Welcome**: one short spoken line that invites the first objective.
- **voiceId**: from the list in the `mistral-voice` skill. Use the placeholder
  `"TODO_VOICE"` until that list exists.

## Language notes

- **French:** metropolitan French, `vous` from the NPC. Space before `?` and `!`.
- **Spanish:** Castilian, `usted` from the NPC. Opening `¿` and `¡`.
- **German:** standard German, `Sie` from the NPC. Nouns capitalised, with
  `der / die / das`.
- Terms are spoken by text-to-speech and used as speech-recognition hints, so write
  them exactly as they should be said: no abbreviations, no slashes, no brackets.

## NPCs and sprites

| Venue | NPC sprite | Character |
|---|---|---|
| bakery | `baker` | bear in a chef's hat |
| pharmacy | `pharmacist` | rabbit in a white coat |
| supermarket | `cashier` | dog in a green apron |
| bank | `banker` | mouse in a suit |

## Difficulty curve

Bakery is the easiest (name items, numbers to 5). Pharmacy adds describing a
problem ("I have a headache"). Supermarket adds quantities and asking where things
are. Bank adds a short formal exchange (changing money, opening hours). The curve
is the same in every language.

## Adding a venue or language

- New venue: add the id to `VenueId`, add it to `content/venues.ts`, write its file
  in every language, and ask game-engine for the building, interior, six item icons
  and NPC art (see the `game-assets` skill).
- New language: add it to `Lang` and `LANGS`, write `content/<lang>/` for every
  venue, ask voice-npc for voices, and run `scripts/gen_audio.mjs` for the clips.
  Quest, objective and hint text stay in English.

## Check before finishing

`npx tsc --noEmit` passes (a missing translation must be a type error), every
`icon` exists, every `unlocks` id exists, item and phrase ids are unique across the
game, and objective ids are unique within the venue.
