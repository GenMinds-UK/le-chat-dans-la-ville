import type { VenueStrings } from "../types";
import type { bakery } from "../venues";

const strings: VenueStrings<typeof bakery> = {
  name: "Die Bäckerei",
  npcName: "Frau Brezel",
  persona:
    "A warm, cheerful bear who has run this bakery for twenty years. She speaks slowly and " +
    "clearly, loves to recommend things, and is proud that the croissants came out of the " +
    "oven ten minutes ago. A loaf of bread costs one euro and a croissant costs one euro, " +
    "so two loaves and a croissant come to three euros.",
  voiceId: "TODO_VOICE",
  welcome: "Guten Tag! Willkommen in der Bäckerei. Was darf es sein?",
  items: {
    bread: "das Brot",
    croissant: "das Croissant",
    muffin: "der Muffin",
    cake: "der Kuchen",
    bread_roll: "das Brötchen",
    biscuit: "der Keks",
  },
  phrases: {
    hello: "Guten Tag",
    i_would_like: "ich möchte",
    please: "bitte",
    two: "zwei",
    how_much: "Was kostet das?",
    thank_you: "danke",
    goodbye: "Auf Wiedersehen",
  },
  hints: {
    greet: 'Start with a greeting. Try: "Guten Tag!"',
    order_bread: 'Ask politely for two. Try: "Ich möchte zwei Brote, bitte."',
    order_croissant: 'Add one more thing. Try: "Und ein Croissant, bitte."',
    ask_price: 'Ask for the total. Try: "Was kostet das?"',
    say_goodbye: 'Finish politely. Try: "Danke, auf Wiedersehen!"',
  },
};

export default strings;
