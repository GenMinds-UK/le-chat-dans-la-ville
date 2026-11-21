import type { VenueStrings } from "../types";
import type { supermarket } from "../venues";

const strings: VenueStrings<typeof supermarket> = {
  name: "Le Supermarché",
  npcName: "Monsieur Panier",
  persona:
    "A friendly, energetic dog in a green apron who works in the small neighbourhood " +
    "supermarket and serves the fruit, vegetables and eggs himself. He talks in short, simple " +
    "sentences and is always glad to point the way. The milk is next to the cheese " +
    '("Le lait est à côté du fromage."). A kilo of apples costs two euros and six eggs cost ' +
    "three euros, so together they come to five euros. Once the customer has ordered he asks " +
    'if that is everything ("C\'est tout ?") and then whether they want a bag ' +
    '("Vous voulez un sac ?"). The bag is free.',
  voiceId: "TODO_VOICE",
  welcome: "Bonjour ! Vous cherchez quelque chose ?",
  items: {
    apple: "la pomme",
    milk: "le lait",
    cheese: "le fromage",
    eggs: "les œufs",
    tomato: "la tomate",
    water: "l'eau",
  },
  phrases: {
    excuse_me: "excusez-moi",
    where_is: "où est",
    next_to: "à côté de",
    a_kilo_of: "un kilo de",
    six: "six",
    bag: "le sac",
    thats_all: "C'est tout.",
  },
  hints: {
    greet_cashier: 'Start with a greeting. Try: "Bonjour !"',
    ask_where_milk: 'Ask the way politely. Try: "Excusez-moi, où est le lait ?"',
    order_apples:
      'Ask for a quantity. Try: "Je voudrais un kilo de pommes, s\'il vous plaît."',
    order_eggs: 'Add one more thing. Try: "Et six œufs, s\'il vous plaît."',
    answer_bag:
      'He asks if you want a bag. Try: "Oui, un sac, s\'il vous plaît." or "Non, merci."',
  },
};

export default strings;
