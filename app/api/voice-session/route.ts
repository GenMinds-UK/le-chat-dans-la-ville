import { Mistral } from "@mistralai/mistralai";

// Server-side only: this route is the only place the API key is used.
// The browser receives just { id, participantToken, serverUrl }.
export const runtime = "nodejs";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(request: Request) {
  if (!process.env.MISTRAL_API_KEY) {
    return Response.json(
      { error: "MISTRAL_API_KEY is not set on the server (.env.local)" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const session = await client.audio.sessions.create({
      instructions: body.instructions,
      llm: body.llm,
      stt: body.stt,
      tts: body.tts,
      turn: body.turn,
      tools: body.tools,
      welcomeMessage: body.welcomeMessage,
    });

    // Only the connection credentials go to the browser — never the key.
    return Response.json({
      id: session.id,
      participantToken: session.participantToken,
      serverUrl: session.serverUrl,
    });
  } catch (err: any) {
    console.error("[voice-session] create failed:", err);
    const message = err?.body?.message ?? err?.message ?? "failed to create session";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }

  try {
    await client.audio.sessions.close({ sessionId });
    return new Response(null, { status: 204 });
  } catch (err: any) {
    console.error("[voice-session] close failed:", err);
    return Response.json({ error: err?.message ?? "failed to close session" }, { status: 502 });
  }
}
