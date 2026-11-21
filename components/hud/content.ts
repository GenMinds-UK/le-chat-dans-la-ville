import { LANGS, getVenue, getVenues, hasVenue } from "@/content";
import type { Lang, Venue, VenueId, VocabEntry } from "@/content/types";

// Content lands venue by venue and language by language, so every HUD lookup
// goes through these guards and never assumes a venue exists.

export function safeVenue(lang: Lang | null, id: VenueId | null): Venue | null {
  if (!lang || !id) return null;
  try {
    return hasVenue(lang, id) ? getVenue(lang, id) : null;
  } catch {
    return null;
  }
}

export function safeVenues(lang: Lang | null): Venue[] {
  if (!lang) return [];
  try {
    return getVenues(lang);
  } catch {
    return [];
  }
}

/** A shop item or phrase by id, looked up in the active venue first, then everywhere. */
export function findVocab(
  lang: Lang | null,
  id: string,
  preferred: Venue | null,
): (VocabEntry & { icon?: string }) | null {
  const venues = preferred ? [preferred, ...safeVenues(lang)] : safeVenues(lang);
  for (const v of venues) {
    const item = v.items.find((i) => i.id === id);
    if (item) return item;
    const phrase = v.phrases.find((p) => p.id === id);
    if (phrase) return phrase;
  }
  return null;
}

export function langInfo(lang: Lang | null) {
  return LANGS.find((l) => l.code === lang) ?? null;
}

/** "bread_roll" -> "Bread roll": an English label for an id when nothing better exists. */
export function labelFromId(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const clipUrl = (lang: Lang, id: string) => `/audio/${lang}/${encodeURIComponent(id)}.mp3`;
export const itemIconUrl = (icon: string) => `/game/items/${encodeURIComponent(icon)}.png`;
export const portraitUrl = (sprite: string) => `/game/npcs/${encodeURIComponent(sprite)}_portrait.png`;
