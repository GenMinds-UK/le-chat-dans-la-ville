---
name: mistral-voice
description: Verified facts and patterns for the Mistral Voice Agents SDK (@mistralai/mistralai 3.5.0) as used in Le chat dans la ville — session lifecycle, browser client, function tools for objectives, per-language (French, Spanish, German) STT/TTS config, and pre-generating pronunciation clips. Load before changing lib/voice or the voice-session route.
---

# Mistral voice agents in this project

Everything below was checked against the installed SDK's type files under
`node_modules/@mistralai/mistralai/esm` (`extra/voice-agents/*.d.ts`,
`models/components/audio*.d.ts`). If the SDK version in `package.json` is no longer
3.5.0, re-check before relying on it.

## Architecture

```
Browser --POST /api/voice-session {venueId, lang}--> route (holds MISTRAL_API_KEY)
        <-- { id, participantToken, serverUrl } --
Browser <== realtime audio (LiveKit) ==> Mistral
Browser --DELETE /api/voice-session?sessionId=...--> route --> sessions.close()
```

The key never reaches the browser. The route must use `runtime = "nodejs"`.

## Server: creating a session

`client.audio.sessions.create(request)` accepts:

| Field | Notes |
|---|---|
| `instructions` | NPC system prompt. |
| `welcomeMessage` | Spoken by the agent as soon as the player connects. |
| `llm` | `{ model: "mistral-small-latest" }` is what the prototype uses. |
| `stt` | `{ language: venue.lang, contextBias: string[] }` (`"fr"`, `"es"` or `"de"`) — pass the venue's item and phrase terms as bias terms so learner pronunciation is recognised. |
| `tts` | `{ voiceId, expressiveness? }`. |
| `turn` | `{ allowInterruptions, inactivity }`. |
| `tools` | Function tools, plus built-ins such as `{ type: "hang_up" }`. |
| `agentId` | Alternative: start from a saved agent (`client.audio.agents`). |

Close with `client.audio.sessions.close({ sessionId })`.

Voices: `client.audio.voices.list()`; each voice has `languages` and `gender`.
**No voice IDs have been chosen yet** for French, Spanish or German — the prototype
uses `fr_marie_neutral`. Whoever picks them should record here, per language, one
voice per NPC (reuse if the catalogue is short) and one clear voice for object
pronunciation.

## When a session starts

Entering a shop does not open a session: the player walks round and inspects
objects first. `useVoiceSession(venue)` mounts with the conversation HUD, which
appears when the player speaks to the NPC (`venueMode === "talking"`), and closes
when they leave the conversation or finish it.

## Pronunciation clips (plain text-to-speech)

The item pop-up and vocab book play `/audio/<lang>/<id>.mp3`. These are generated
ahead of time by `scripts/gen_audio.mjs`, not at play time:

```ts
const res = await client.audio.speech.complete({
  input: entry.term, voiceId: ITEM_VOICE[lang], responseFormat: "mp3",
});
```

`SpeechRequest` also takes `expressiveness` and `phonemeHints`; output formats are
pcm, wav, mp3, flac, opus. The shape of the response (how the audio bytes come
back) has not been checked yet: read `models/operations` for `SpeechResponse`
before writing the script, and record it here.

The script covers every item and phrase in every language, skips files that
already exist, and needs `MISTRAL_API_KEY` in the environment. Listen to a sample
in each language before committing the clips; a single word can be read with the
wrong language's pronunciation if the voice does not match.

## Browser: connecting

```ts
const { initSession } = await import("@mistralai/mistralai/extra/voice-agents/browser"); // dynamic: browser only
const session = await initSession({ createSession, deleteSession, /* tools */ });
session.on("transcript", ...);            // register handlers BEFORE connect
await session.connect();                  // SDK >= 3: initSession does not connect
```

- Events: `connected`, `disconnected`, `transcript`, `agent_state_changed`,
  `tool_call_started`, `tool_call_ended`, `unhandled_tool`, `session_updated`,
  `error`, `audio_track`.
- `transcript` events are cumulative per `id`: replace the line with the same id,
  don't append. Fields used: `id`, `role`, `content`, `final`.
- `session.setInputEnabled(false)` mutes the mic. `session.close()` stops the mic,
  leaves the room and calls `deleteSession`. A session connects once; make a new
  one for each conversation.
- `session.update({ instructions?, tools?, turn? })` changes a live session;
  instructions and tools apply from the next turn.
- `session.transcript` holds every turn so far and stays readable after close.

## Objectives as a function tool

`functionTool` from `@mistralai/mistralai/extra/voice-agents` takes
`{ name, description, parameters: zodSchema, handler }` (zod v4). The handler runs
in the browser; the declaration must also be sent to the server when the session
is created. `toAudioTool(tool)` converts a declaration to the shape
`sessions.create()` expects.

Pattern for this game:

- One tool, `complete_objective({ objective_id })`. Its handler calls
  `store.completeObjective(id)` and returns the list of objectives still open, so
  the NPC knows what remains.
- The prompt lists each objective with its id and says to call the tool the moment
  the player achieves one, never before, and to say goodbye then call `hang_up`
  once none remain.
- Since the browser no longer sends raw config, the server builds the tool
  declarations from the venue and the browser registers matching handlers by name.

## Prompt rules for NPCs

- Write the prompt for the venue's language and name that language in it. Speak
  only that language, one or two short sentences per turn, A1–A2 vocabulary,
  polite register (vous / usted / Sie).
- Stay in the shop role; never explain grammar or switch to English.
- If the player makes a mistake, repeat it back correctly in passing and carry on.
- If the player is silent or lost, offer a simple either/or question.

## Costs and hygiene

- Each `POST` opens a real, billable session. In tests, always `DELETE` it.
- React strict mode mounts effects twice in dev: guard so only one session opens.
- Close the session on unmount and on tab close.
- First use in `next dev` is slow because the SDK and LiveKit compile on demand.
