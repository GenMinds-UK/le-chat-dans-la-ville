import type { Lang, Venue, VenueDef, VenueId, VenueStrings } from "./types";
import { VENUE_DEFS, VENUE_ORDER } from "./venues";
import frBakery from "./fr/bakery";
import frPharmacy from "./fr/pharmacy";
import frSupermarket from "./fr/supermarket";
import frBank from "./fr/bank";
import esBakery from "./es/bakery";
import esPharmacy from "./es/pharmacy";
import esSupermarket from "./es/supermarket";
import esBank from "./es/bank";
import deBakery from "./de/bakery";
import dePharmacy from "./de/pharmacy";
import deSupermarket from "./de/supermarket";
import deBank from "./de/bank";

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

// Every venue in every language: a missing file or venue is a type error here.
type Registry = {
  [L in Lang]: { [V in VenueId]: VenueStrings<(typeof VENUE_DEFS)[V]> };
};

const STRINGS: Registry = {
  fr: { bakery: frBakery, pharmacy: frPharmacy, supermarket: frSupermarket, bank: frBank },
  es: { bakery: esBakery, pharmacy: esPharmacy, supermarket: esSupermarket, bank: esBank },
  de: { bakery: deBakery, pharmacy: dePharmacy, supermarket: deSupermarket, bank: deBank },
};

/** True when the venue has been written for that language (always, for valid ids). */
export function hasVenue(lang: Lang, id: VenueId): boolean {
  return Boolean((STRINGS[lang] as Record<string, unknown> | undefined)?.[id]);
}

/** The venue as every consumer sees it. Throws on an id or language that is not in the content. */
export function getVenue(lang: Lang, id: VenueId): Venue {
  const def: VenueDef | undefined = (VENUE_DEFS as Record<string, VenueDef>)[id];
  const s = (STRINGS as Record<string, Record<string, VenueStrings<VenueDef>> | undefined>)[lang]?.[
    id
  ];
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
