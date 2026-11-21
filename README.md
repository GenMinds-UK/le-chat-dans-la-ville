# Mistral voice agent (Next.js)

Browser port of the Mistral quickstart
[Build a voice agent](https://docs.mistral.ai/studio/audio/voice-agents/quickstarts/build-a-voice-agent),
using the [Browser (TypeScript) guide](https://docs.mistral.ai/studio/audio/voice-agents/browser)
flow. See [PLAN.md](./PLAN.md) for the design.

## How it works

```
Browser ──POST /api/voice-session──> route.ts ──sessions.create() + MISTRAL_API_KEY──> Mistral
Browser <──{ id, participantToken, serverUrl }── route.ts
Browser <═══ real-time audio (LiveKit) ═══> Mistral   (initSession from the SDK browser entry)
Browser ──DELETE /api/voice-session?sessionId=...──> route.ts ──sessions.close()──> Mistral
```

The API key never reaches the browser.

## Setup

1. Put your key in `.env.local` (gitignored):
   ```
   MISTRAL_API_KEY=your-key
   ```
2. Run:
   ```
   npm run dev
   ```
3. Open http://localhost:3000 (localhost is a secure context, so the mic works),
   click **Start talking**, allow microphone access, and speak.

## Verify

- Transcript lines appear as `user: ...` then `assistant: ...` (like the quickstart).
- The agent's voice plays out loud.
- **Hang up** stops the mic and fires the DELETE (check the Network tab).
- `MISTRAL_API_KEY` appears nowhere in the client bundle.

## Files

- `app/api/voice-session/route.ts` — POST creates a session server-side, DELETE closes it
- `components/VoiceAgent.tsx` — client UI: start/stop, mute, live transcript
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — page shell
- `public/` — static assets, served at the root URL (e.g. `public/images/logo.svg` → `/images/logo.svg`)
  - `public/images/` — logos, screenshots, UI imagery
  - `public/audio/` — ring/connect sounds, notification chimes, sample voice clips
  - `public/avatars/` — agent/user avatar images
    - `mistral-cat.svg` / `mistral-cat.png` — Mistral's "abstract pixel cat" emblem (Icon / Gradient, preferred per brand guidelines), from the official brand kit `Mistral_Logos_2026.zip` at https://mistral.ai/brand/ — trademark of Mistral AI, use per their guidelines
    - `mistral-cat-white.png` — monochrome white icon, for dark backgrounds
  - `public/icons/` — PWA icons, favicon variants (drop `app/icon.svg` in `app/` for the favicon convention)
  - `public/fonts/` — custom font files (prefer `next/font` when possible)

## Production notes

- Protect `POST /api/voice-session` with your own auth + rate limiting (it is public otherwise).
- Serve over HTTPS so `getUserMedia` works.
- Optional: client-side tools via `functionTool` from
  `@mistralai/mistralai/extra/voice-agents`, saved agents via `client.audio.agents.create`.
