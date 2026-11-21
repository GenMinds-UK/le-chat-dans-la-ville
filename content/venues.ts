import type { VenueDef, VenueId } from "./types";

// Language-neutral venue data: order, unlocks, NPC sprite, item ids and icons,
// phrase ids, objective ids and English text, English quest.
// Item and phrase ids are unique across the whole game, so a later shop only
// lists the NEW language its conversation needs; it can still rely on the
// phrases of the shops before it.

export const VENUE_ORDER: readonly VenueId[] = ["bakery", "pharmacy", "supermarket", "bank"];

// Easiest shop: name the items, numbers to five.
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

// Adds describing a problem and answering a yes/no question.
export const pharmacy = {
  npcSprite: "pharmacist",
  quest:
    "Go to the pharmacy, look around, then tell the pharmacist you have a headache and ask for a toothbrush as well.",
  items: [
    { id: "tablets", icon: "pills", en: "the tablets" },
    { id: "cough_syrup", icon: "syrup", en: "the cough syrup" },
    { id: "plaster", icon: "bandage", en: "the plaster" },
    { id: "thermometer", icon: "thermometer", en: "the thermometer" },
    { id: "cream", icon: "cream", en: "the cream" },
    { id: "toothbrush", icon: "toothbrush", en: "the toothbrush" },
  ],
  phrases: [
    { id: "headache", en: "I have a headache." },
    { id: "fever", en: "the fever" },
    { id: "yes", en: "yes" },
    { id: "no", en: "no" },
    { id: "do_you_have", en: "Do you have…?" },
    { id: "also", en: "also" },
    { id: "nice_day", en: "Have a nice day!" },
  ],
  objectives: [
    { id: "greet_pharmacist", text: "Say hello to the pharmacist" },
    { id: "say_headache", text: "Say that you have a headache" },
    { id: "answer_fever", text: "Answer the question about a fever" },
    { id: "ask_toothbrush", text: "Ask for a toothbrush" },
    { id: "thank_pharmacist", text: "Say thank you and goodbye" },
  ],
  unlocks: "supermarket",
} as const satisfies VenueDef;

// Adds quantities and asking where things are.
export const supermarket = {
  npcSprite: "cashier",
  quest:
    "Go to the supermarket, look around, then ask where the milk is and buy a kilo of apples and six eggs.",
  items: [
    { id: "apple", icon: "apple", en: "the apple" },
    { id: "milk", icon: "milk", en: "the milk" },
    { id: "cheese", icon: "cheese", en: "the cheese" },
    { id: "eggs", icon: "eggs", en: "the eggs" },
    { id: "tomato", icon: "tomato", en: "the tomato" },
    { id: "water", icon: "water", en: "the water" },
  ],
  phrases: [
    { id: "excuse_me", en: "excuse me" },
    { id: "where_is", en: "Where is…?" },
    { id: "next_to", en: "next to" },
    { id: "a_kilo_of", en: "a kilo of" },
    { id: "six", en: "six" },
    { id: "bag", en: "the bag" },
    { id: "thats_all", en: "That is all." },
  ],
  objectives: [
    { id: "greet_cashier", text: "Say hello to the shop assistant" },
    { id: "ask_where_milk", text: "Ask where the milk is" },
    { id: "order_apples", text: "Ask for a kilo of apples" },
    { id: "order_eggs", text: "Ask for six eggs" },
    { id: "answer_bag", text: "Say whether you want a bag" },
  ],
  unlocks: "bank",
} as const satisfies VenueDef;

// Adds a short formal exchange: changing money, opening hours.
export const bank = {
  npcSprite: "banker",
  quest:
    "Go to the bank, look around, then change one hundred dollars into euros and ask what time the bank closes.",
  items: [
    { id: "coin", icon: "coin", en: "the coin" },
    { id: "banknote", icon: "banknote", en: "the banknote" },
    { id: "bank_card", icon: "card", en: "the bank card" },
    { id: "cash_machine", icon: "atm", en: "the cash machine" },
    { id: "safe", icon: "safe", en: "the safe" },
    { id: "form", icon: "form", en: "the form" },
  ],
  phrases: [
    { id: "change_money", en: "to change money" },
    { id: "hundred", en: "one hundred" },
    { id: "dollar", en: "the dollar" },
    { id: "euro", en: "the euro" },
    { id: "what_time_close", en: "What time do you close?" },
    { id: "at_five", en: "at five o'clock" },
  ],
  objectives: [
    { id: "greet_banker", text: "Greet the banker politely" },
    { id: "ask_change_money", text: "Say that you would like to change money" },
    { id: "say_amount", text: "Say the amount: one hundred dollars" },
    { id: "choose_banknotes", text: "Say whether you want banknotes or coins" },
    { id: "ask_closing_time", text: "Ask what time the bank closes" },
  ],
} as const satisfies VenueDef;

export const VENUE_DEFS = {
  bakery,
  pharmacy,
  supermarket,
  bank,
} as const satisfies Record<VenueId, VenueDef>;
