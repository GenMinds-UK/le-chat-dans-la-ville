import type { Lang, Venue, VenueDef, VenueId, VenueStrings } from "./types";
import { VENUE_DEFS, VENUE_ORDER } from "./venues";
import frBakery from "./fr/bakery";

export type { Lang, Venue, VenueId, VocabEntry, ShopItem, Objective } from "./types";
export { VENUE_ORDER };

export const LANGS: readonly { code: Lang; native: string; english: string }[] = [
  { code: "fr", native: "Français", english: "French" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "de", native: "Deutsch", english: "German" },
];

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);
export const isVenueId = (v: unknown): v is VenueId =>
  (VENUE_ORDER as readonly unknown[]).includes(v);

// content-designer: once every venue exists in every language, tighten this to
//   { [L in Lang]: { [V in VenueId]: VenueStrings<(typeof VENUE_DEFS)[V]> } }
// so that a missing file fails `tsc`, and drop the `undefined` handling below.
type Registry = {
  [L in Lang]?: { [V in keyof typeof VENUE_DEFS]?: VenueStrings<(typeof VENUE_DEFS)[V]> };
};

const STRINGS: Registry = {
  fr: { bakery: frBakery },
};

/** True when the venue has been written for that language. */
export function hasVenue(lang: Lang, id: VenueId): boolean {
  return Boolean((STRINGS[lang] as Record<string, unknown> | undefined)?.[id]);
}

/** The venue as every consumer sees it. Throws if it has not been written yet. */
export function getVenue(lang: Lang, id: VenueId): Venue {
  const def = (VENUE_DEFS as Partial<Record<VenueId, VenueDef>>)[id];
  const s = (STRINGS[lang] as Partial<Record<VenueId, VenueStrings<VenueDef>>> | undefined)?.[id];
  if (!def || !s) throw new Error(`No content for venue "${id}" in "${lang}"`);
  return {
    id,
    lang,
    name: s.name,
    npc: { sprite: def.npcSprite, name: s.npcName, persona: s.persona, voiceId: s.voiceId },
    quest: def.quest,
    welcome: s.welcome,
    items: def.items.map((i) => ({ id: i.id, icon: i.icon, en: i.en, term: s.items[i.id] })),
    phrases: def.phrases.map((p) => ({ id: p.id, en: p.en, term: s.phrases[p.id] })),
    objectives: def.objectives.map((o) => ({ id: o.id, text: o.text, hint: s.hints[o.id] })),
    unlocks: def.unlocks,
  };
}

/** Every venue written for a language, in play order. */
export function getVenues(lang: Lang): Venue[] {
  return VENUE_ORDER.filter((id) => hasVenue(lang, id)).map((id) => getVenue(lang, id));
}

/** A venue is open if it is first, or the venue that unlocks it is completed. */
export function isVenueUnlocked(id: VenueId, completed: readonly VenueId[]): boolean {
  const i = VENUE_ORDER.indexOf(id);
  return i === 0 || completed.includes(VENUE_ORDER[i - 1]);
}

/** The next venue to play, or null when all are done. */
export function currentQuestVenue(completed: readonly VenueId[]): VenueId | null {
  return VENUE_ORDER.find((id) => !completed.includes(id)) ?? null;
}
