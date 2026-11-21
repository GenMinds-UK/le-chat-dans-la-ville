---
name: playtest
description: Verification checklist for Le chat dans la ville — type-check, build, run, and a full playthrough covering voice sessions, objectives, progress and failure paths. Load when asked to test, verify or QA the game, or before a deploy.
---

# Playtest checklist

Report every item as passed, failed (with output or steps), or not run (with why).

## 1. Static checks

```
npx tsc --noEmit
npm run build        # stop the dev server first: both write to .next
```

## 2. Run it

```
npm run dev          # http://localhost:3000
```

The first load and the first conversation are slow in dev because Next compiles on
demand. Wait before calling it a hang:
check the server answers `curl -s -o /dev/null -w "%{http_code}" localhost:3000`.

## 3. Without a microphone

These need no voice session:

- Town loads with crisp (unblurred) pixels; the cat moves in 8 directions and cannot
  walk through buildings, trees, water or fences.
- Signed out, only the title and sign-in form are reachable. Sign up with a new
  email and password, sign out, sign back in. Wrong password and an already-used
  email each give a clear message.
- First sign-in shows the language picker (French, Spanish, German). The choice
  survives a reload, and can be changed from the menu.
- Each venue door opens the right interior; the exit mat returns to the town at
  that door. Entering a shop opens no voice session (no `POST /api/voice-session`
  in the network tab).
- In each shop, all six objects can be inspected by key and by click / tap. In each
  of the three languages the pop-up shows the right term and English, and the
  speaker button plays a clip that says that term. Inspected words appear in the
  vocab book. The cat cannot move while a pop-up is open.
- Locked venues show a lock and cannot be entered; the quest arrow points at the
  current target.
- Every HUD state renders when store values are set by hand.

## 4. With a microphone (needs a person, or say it was not run)

For each venue, in each language (at least one full run per language, and every
venue in one of them): the conversation starts only when the player speaks to the
NPC; the NPC greets in the chosen language in a voice of that language; speech
appears as subtitles; each objective ticks only when actually achieved; the hint button makes
the NPC simpler; finishing all objectives ends the conversation, awards the star and
unlocks the next venue.

## 5. Failure paths

- Deny microphone permission: a clear message, no stuck "connecting" state.
- Leave a venue mid-conversation: the session closes (a `DELETE` appears in the
  network tab).
- Reload mid-conversation, then check no session is left open.
- Leave a conversation and speak to the NPC again: a fresh session, objectives
  start again.
- Route called with an unknown `venueId` or `lang`: 400, no session created.
- Once the platform work is in: signed-out request gets 401; over the cap gets 429.

## 6. Security

- `MISTRAL_API_KEY` does not appear in anything under `.next/static`.
- The route's response contains only `id`, `participantToken`, `serverUrl`.

## Cost note

Every `POST /api/voice-session` opens a real session on the user's Mistral account.
If you call the route directly, close it with
`DELETE /api/voice-session?sessionId=<id>` straight after.
