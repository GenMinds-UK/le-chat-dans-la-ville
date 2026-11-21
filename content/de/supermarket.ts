import type { VenueStrings } from "../types";
import type { supermarket } from "../venues";

const strings: VenueStrings<typeof supermarket> = {
  name: "Der Supermarkt",
  npcName: "Herr Korb",
  persona:
    "A friendly, energetic dog in a green apron who works in the small neighbourhood " +
    "supermarket and serves the fruit, vegetables and eggs himself. He talks in short, simple " +
    "sentences and is always glad to point the way. The milk is next to the cheese " +
    '("Die Milch ist neben dem Käse."). A kilo of apples costs two euros and six eggs cost ' +
    "three euros, so together they come to five euros. Once the customer has ordered he asks " +
    'if that is everything ("Ist das alles?") and then whether they want a bag ' +
    '("Möchten Sie eine Tüte?"). The bag is free.',
  voiceId: "TODO_VOICE",
  welcome: "Guten Tag! Suchen Sie etwas?",
  items: {
    apple: "der Apfel",
    milk: "die Milch",
    cheese: "der Käse",
    eggs: "die Eier",
    tomato: "die Tomate",
    water: "das Wasser",
  },
  phrases: {
    excuse_me: "Entschuldigung",
    where_is: "wo ist",
    next_to: "neben",
    a_kilo_of: "ein Kilo",
    six: "sechs",
    bag: "die Tüte",
    thats_all: "Das ist alles.",
  },
  hints: {
    greet_cashier: 'Start with a greeting. Try: "Guten Tag!"',
    ask_where_milk: 'Ask the way politely. Try: "Entschuldigung, wo ist die Milch?"',
    order_apples:
      'Ask for a quantity. More than one Apfel is Äpfel. Try: "Ich möchte ein Kilo Äpfel, bitte."',
    order_eggs: 'Add one more thing. Try: "Und sechs Eier, bitte."',
    answer_bag: 'He asks if you want a bag. Try: "Ja, eine Tüte, bitte." or "Nein, danke."',
  },
};

export default strings;
