import type { VenueDef, VenueId } from "./types";

// Language-neutral venue data: order, unlocks, NPC sprite, item ids and icons,
// phrase ids, objective ids and English text, English quest.
// Item and phrase ids are unique across the whole game.

export const VENUE_ORDER: readonly VenueId[] = ["bakery", "pharmacy", "supermarket", "bank"];

export const bakery = {
  npcSprite: "baker",
  quest:
    "Go to the bakery, look around, then ask the baker for two loaves of bread and a croissant.",
  items: [
    { id: "bread", icon: "bread", en: "the loaf of bread" },
    { id: "croissant", icon: "croissant", en: "the croissant" },
    { id: "muffin", icon: "cupcake", en: "the muffin" },
    { id: "cake", icon: "cake", en: "the cake" },
    { id: "bread_roll", icon: "roll", en: "the bread roll" },
    { id: "biscuit", icon: "biscuit", en: "the biscuit" },
  ],
  phrases: [
    { id: "hello", en: "hello" },
    { id: "i_would_like", en: "I would like…" },
    { id: "please", en: "please" },
    { id: "two", en: "two" },
    { id: "how_much", en: "How much is it?" },
    { id: "thank_you", en: "thank you" },
    { id: "goodbye", en: "goodbye" },
  ],
  objectives: [
    { id: "greet", text: "Say hello to the baker" },
    { id: "order_bread", text: "Ask for two loaves of bread" },
    { id: "order_croissant", text: "Ask for a croissant" },
    { id: "ask_price", text: "Ask how much it costs" },
    { id: "say_goodbye", text: "Say thank you and goodbye" },
  ],
  unlocks: "pharmacy",
} as const satisfies VenueDef;

// content-designer: add pharmacy, supermarket and bank here, then make this
// `satisfies Record<VenueId, VenueDef>`.
export const VENUE_DEFS = { bakery } as const satisfies Partial<Record<VenueId, VenueDef>>;
