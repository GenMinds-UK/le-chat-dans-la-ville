import type { Venue } from "../../content/types";

// The objective tool, shared by the server (declares it to Mistral in
// buildNpcConfig) and the browser (useVoiceSession runs the handler). No
// secrets and no server-only imports here.

export const COMPLETE_OBJECTIVE = "complete_objective";

/** Ask the SDK to fail a tool call the browser has not answered after this long. */
export const OBJECTIVE_TOOL_TIMEOUT_MS = 8000;

export type ObjectiveToolDeclaration = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/**
 * `complete_objective({ objective_ids: string[] })`. An array, so that a
 * single player turn that achieves several objectives ("Bonjour, je voudrais
 * deux baguettes et un croissant") is reported in one call.
 */
export function objectiveToolDeclaration(venue: Venue): ObjectiveToolDeclaration {
  const ids = venue.objectives.map((o) => o.id);
  return {
    type: "function",
    function: {
      name: COMPLETE_OBJECTIVE,
      description:
        "Record that the customer has just achieved one or more objectives. Call it right " +
        "after the customer's turn in which they achieved them, before you reply, and never " +
        "for something the customer has not said themselves. List every objective achieved " +
        "in that turn. The result lists the objectives that remain and tells you what to do next.",
      parameters: {
        type: "object",
        properties: {
          objective_ids: {
            type: "array",
            description: "Ids of the objectives the customer has just achieved.",
            items: { type: "string", enum: ids },
            minItems: 1,
          },
        },
        required: ["objective_ids"],
        additionalProperties: false,
      },
    },
  };
}

/** Accepts `{ objective_ids: [...] }`, and `{ objective_id: "..." }` in case the model sends one. */
export function readObjectiveIds(args: Record<string, unknown>): string[] {
  const raw = args.objective_ids ?? args.objective_id ?? args.ids ?? args.id;
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return [...new Set(list.filter((v): v is string => typeof v === "string").map((v) => v.trim()))].filter(
    Boolean,
  );
}

export type ObjectiveToolResult = {
  ok: boolean;
  completed: string[];
  remaining: { id: string; objective: string }[];
  all_done: boolean;
  next: string;
  error?: string;
};

const LANGUAGE_NAME = { fr: "French", es: "Spanish", de: "German" } as const;

/** What the NPC is told after a tool call. `done` is every objective achieved so far. */
export function objectiveToolResult(
  venue: Venue,
  done: readonly string[],
  problem?: string,
): ObjectiveToolResult {
  const remaining = venue.objectives
    .filter((o) => !done.includes(o.id))
    .map((o) => ({ id: o.id, objective: o.text }));
  const language = LANGUAGE_NAME[venue.lang];
  const allDone = remaining.length === 0;
  const next = allDone
    ? `Every objective is complete. Say one short goodbye sentence in ${language}, then call hang_up. Do not ask anything else.`
    : `Carry on the conversation in ${language}. Do not mention objectives. Do not call hang_up yet.`;
  return {
    ok: !problem,
    completed: venue.objectives.filter((o) => done.includes(o.id)).map((o) => o.id),
    remaining,
    all_done: allDone,
    next,
    ...(problem ? { error: problem } : {}),
  };
}
