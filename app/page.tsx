import VoiceAgent from "@/components/VoiceAgent";

export default function Home() {
  return (
    <main>
      <h1>
        <img src="/avatars/mistral-cat.svg" alt="Mistral cat" width={28} height={28} />
        Mistral voice agent
      </h1>
      <p className="subtitle">
        Next.js port of the{" "}
        <a href="https://docs.mistral.ai/studio/audio/voice-agents/quickstarts/build-a-voice-agent">
          &quot;Build a voice agent&quot; quickstart
        </a>{" "}
        — runs entirely in your browser via the Voice Agents API.
      </p>
      <VoiceAgent />
    </main>
  );
}
