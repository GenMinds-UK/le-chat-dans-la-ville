import type { VenueStrings } from "../types";
import type { bakery } from "../venues";

// Reference venue: every other language file matches this shape and standard.
const strings: VenueStrings<typeof bakery> = {
  name: "La Boulangerie",
  npcName: "Madame Brioche",
  persona:
    "A warm, cheerful bear who has run this bakery for twenty years. She speaks slowly and " +
    "clearly, loves to recommend things, and is proud that the croissants came out of the " +
    "oven ten minutes ago. A loaf of bread costs one euro and a croissant costs one euro, " +
    "so two loaves and a croissant come to three euros.",
  voiceId: "TODO_VOICE",
  welcome: "Bonjour ! Bienvenue à la boulangerie. Vous désirez ?",
  items: {
    bread: "la baguette",
    croissant: "le croissant",
    muffin: "le muffin",
    cake: "le gâteau",
    bread_roll: "le petit pain",
    biscuit: "le biscuit",
  },
  phrases: {
    hello: "bonjour",
    i_would_like: "je voudrais",
    please: "s'il vous plaît",
    two: "deux",
    how_much: "C'est combien ?",
    thank_you: "merci",
    goodbye: "au revoir",
  },
  hints: {
    greet: 'Start with a greeting. Try: "Bonjour !"',
    order_bread: 'Ask politely for two. Try: "Je voudrais deux baguettes, s\'il vous plaît."',
    order_croissant: 'Add one more thing. Try: "Et un croissant, s\'il vous plaît."',
    ask_price: 'Ask for the total. Try: "C\'est combien ?"',
    say_goodbye: 'Finish politely. Try: "Merci, au revoir !"',
  },
};

export default strings;
