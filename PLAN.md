# Plan: Next.js app running the Mistral "Build a voice agent" quickstart

> **Status: implemented.** Files are in this repo; see README.md to run.
> Implemented against `@mistralai/mistralai` **3.5.0** + `next` 16. Note: SDK >= 3
> `initSession()` returns a *not-yet-connected* session — call
> `session.on(...)` first, then `await session.connect()`.

Source: https://docs.mistral.ai/studio/audio/voice-agents/quickstarts/build-a-voice-agent
Companion page used: https://docs.mistral.ai/studio/audio/voice-agents/browser (Browser (TypeScript) guide)

## 1. What the quickstart actually needs

The quickstart is terminal-based: it captures mic audio, transcribes, answers, and speaks
(`client.audio.sessions.init(audio_interface=..., instructions=...)`), which in Node.js needs
SoX + FFmpeg and a real microphone/speaker. A Next.js app cannot use that path — instead it
uses the **browser flow** from the Browser guide:

```
Browser --(1) POST /api/voice-session--> Next.js route handler --(2) sessions.create() with API key--> Mistral
Browser <--(3) { id, participantToken, serverUrl }-- route handler
Browser <====(4) real-time audio (LiveKit)====> Mistral
Browser --(5) DELETE /api/voice-session?sessionId=...--> route handler --> sessions.close()
```

Key rule from the docs: **the API key never reaches the browser**. The Next.js server route
creates the session; the page connects with the returned credentials via
`initSession()` from `@mistralai/mistralai/extra/voice-agents/browser` and uses
`getUserMedia()` for the mic — so no SoX/FFmpeg/PortAudio is needed in the browser path.

## 2. Prerequisites

- Mistral API key from AI Studio (console.mistral.ai) -> stored as `MISTRAL_API_KEY`
- Node.js >= 18.18, npm
- Mic access requires a secure context: `http://localhost` is fine for dev; HTTPS in prod

## 3. Steps

1. Scaffold in this (empty) directory:
   `npx create-next-app@latest . --typescript --eslint --app --use-npm --tailwind --src-dir=false --import-alias "@/*"`
2. Install the SDK: `npm install @mistralai/mistralai` (add `zod` only if you add client-side tools)
3. Create `.env.local` with `MISTRAL_API_KEY=...` (already gitignored by create-next-app)
4. Add API route `app/api/voice-session/route.ts` (POST create / DELETE close — code below)
5. Add client component `components/VoiceAgent.tsx` ('use client', dynamically imports the
   browser SDK so it never runs during SSR) with start/stop buttons + live transcript
6. Render it from `app/page.tsx`
7. `npm run dev`, open http://localhost:3000, click "Start", allow the mic, talk.
   Expect transcript lines prefixed `user:` / `assistant:` (exactly what the quickstart prints)
8. Map the quickstart options into the create call: `instructions` = the dramatic-persona
   prompt, `tts: { voiceId: "fr_marie_neutral" }` (the quickstart's `voice_id`), `llm`
   defaults to `mistral-small-latest`
9. Harden before production: protect the POST route with your own auth + rate limiting
   (the docs explicitly warn the route is public otherwise), handle `fatal` errors,
   always `session.close()` in a `finally`

## 4. File tree

```
mistral-test/
├── .env.local                          # MISTRAL_API_KEY=... (gitignored, server-only)
├── app/
│   ├── api/voice-session/route.ts      # POST = sessions.create(), DELETE = sessions.close()
│   ├── layout.tsx
│   ├── page.tsx                        # renders <VoiceAgent />
│   └── globals.css
├── components/
│   └── VoiceAgent.tsx                  # 'use client' — initSession + connect, transcript UI, mute, hang up
├── package.json                        # next 16, react 19, @mistralai/mistralai 3.5, livekit-client
├── README.md                           # how to run
└── PLAN.md
```

The code blocks below are the docs' reference snippets; the implemented versions
(in `app/api/voice-session/route.ts` and `components/VoiceAgent.tsx`) match the
installed SDK 3.5.0 API, including the extra `await session.connect()` step.

## 5. Key code

### app/api/voice-session/route.ts (server only — holds the key)

```ts
import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

export async function POST(request: Request) {
  const body = await request.json();
  const session = await client.audio.sessions.create({
    instructions: body.instructions,
    llm: body.llm,
    stt: body.stt,
    tts: body.tts,
    tools: body.tools,
  });
  return Response.json({
    id: session.id,
    participantToken: session.participantToken,
    serverUrl: session.serverUrl,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId")!;
  await client.audio.sessions.close(sessionId);
  return new Response(null, { status: 204 });
}
```

### components/VoiceAgent.tsx (browser)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type Line = { role: string; content: string };

export default function VoiceAgent() {
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const sessionRef = useRef<any>(null);

  async function start() {
    // dynamic import: browser-only SDK, no SSR
    const { initSession } = await import(
      "@mistralai/mistralai/extra/voice-agents/browser"
    );
    const session = await initSession({
      createSession: () =>
        fetch("/api/voice-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructions: "Please respond to me in the most dramatic way possible.",
            llm: { model: "mistral-small-latest" },
            tts: { voiceId: "fr_marie_neutral" }, // quickstart's tts voice_id
          }),
        }).then((res) => res.json()),
      deleteSession: (sessionId: string) =>
        fetch(`/api/voice-session?sessionId=${sessionId}`, { method: "DELETE" }),
    });
    sessionRef.current = session;
    session.on("transcript", (e: any) =>
      setLines((prev) => [...prev, { role: e.role, content: e.content }])
    );
    session.on("error", (e: any) => console.error("voice session error", e));
    setActive(true);
  }

  async function stop() {
    try {
      await sessionRef.current?.close(); // stops mic, leaves room, calls deleteSession
    } finally {
      sessionRef.current = null;
      setActive(false);
    }
  }

  function toggleMute() {
    const track = sessionRef.current?.localTrack as MediaStreamTrack | undefined;
    if (track) {
      track.enabled = muted; // unmute
      setMuted(!muted);
    }
  }

  useEffect(() => () => { sessionRef.current?.close(); }, []); // cleanup on unmount

  return (
    <main>
      <button onClick={active ? stop : start}>{active ? "Hang up" : "Start talking"}</button>
      {active && <button onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>}
      <ul>
        {lines.map((l, i) => (
          <li key={i}><b>{l.role}:</b> {l.content}</li>
        ))}
      </ul>
    </main>
  );
}
```

## 6. Verification checklist

- [ ] `npm run dev` starts without errors
- [ ] Clicking Start prompts for microphone permission (localhost counts as secure context)
- [ ] Speaking produces `user: ...` transcript lines; after a pause, `assistant: ...` lines
- [ ] Agent's voice plays through speakers (agent track arrives via `audio_track` event)
- [ ] Hang up stops the mic light and triggers the DELETE (check Network tab)
- [ ] No `MISTRAL_API_KEY` anywhere in client bundle (check Network tab / built JS)

## 7. Going further (from the docs)

- Saved agents: `client.audio.agents.create(...)` once, then start sessions by `agent_id`
- Client-side tools in the page: `functionTool({...})` from
  `@mistralai/mistralai/extra/voice-agents` + `zod`; declarations are forwarded by your
  `createSession` callback, handlers run in the browser
- Custom audio/visualization: `session.localTrack` (mic) and the `audio_track` event (agent)
- Production: signed webhooks for call start/end/fail, telephony guide for phone calls,
  auth + rate limiting on `/api/voice-session`
