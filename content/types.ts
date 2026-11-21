// Shared content contract (GAME_PLAN.md 3.2). Changing these types needs the
// lead's sign-off: every workstream depends on them.

export type Lang = "fr" | "es" | "de";
export type VenueId = "bakery" | "pharmacy" | "supermarket" | "bank";

/** term is in the target language, with its article. */
export type VocabEntry = { id: string; term: string; en: string };
/** An object in the shop; icon = public/game/items/<icon>.png */
export type ShopItem = VocabEntry & { icon: string };
/** text in English; hint in English with the phrase to say. */
export type Objective = { id: string; text: string; hint: string };

export type Venue = {
  id: VenueId;
  lang: Lang;
  /** "La Boulangerie" / "La Panadería" / "Die Bäckerei" */
  name: string;
  npc: { sprite: string; name: string; persona: string; voiceId: string };
  /** English quest-card text */
  quest: string;
  /** NPC's spoken opening line */
  welcome: string;
  /** 6, placed in the interior in this order */
  items: ShopItem[];
  /** 4–8 extra words/phrases the conversation needs */
  phrases: VocabEntry[];
  /** 3–5, in the natural order of the conversation */
  objectives: Objective[];
  unlocks?: VenueId;
};

// ---- storage shapes (content/venues.ts and content/<lang>/<venue>.ts) ----

/** Language-neutral half of a venue. */
export type VenueDef = {
  npcSprite: string;
  quest: string;
  items: readonly { id: string; icon: string; en: string }[];
  phrases: readonly { id: string; en: string }[];
  objectives: readonly { id: string; text: string }[];
  unlocks?: VenueId;
};

/**
 * One language's strings for a venue. Keyed by the ids in the VenueDef, so a
 * missing or misspelt translation fails `tsc`.
 */
export type VenueStrings<D extends VenueDef> = {
  name: string;
  npcName: string;
  persona: string;
  voiceId: string;
  welcome: string;
  items: Record<D["items"][number]["id"], string>;
  phrases: Record<D["phrases"][number]["id"], string>;
  hints: Record<D["objectives"][number]["id"], string>;
};
