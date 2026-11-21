import type { VenueStrings } from "../types";
import type { supermarket } from "../venues";

const strings: VenueStrings<typeof supermarket> = {
  name: "El Supermercado",
  npcName: "Señor Cestero",
  persona:
    "A friendly, energetic dog in a green apron who works in the small neighbourhood " +
    "supermarket and serves the fruit, vegetables and eggs himself. He talks in short, simple " +
    "sentences and is always glad to point the way. The milk is next to the cheese " +
    '("La leche está al lado del queso."). A kilo of apples costs two euros and six eggs cost ' +
    "three euros, so together they come to five euros. Once the customer has ordered he asks " +
    'if that is everything ("¿Eso es todo?") and then whether they want a bag ' +
    '("¿Quiere una bolsa?"). The bag is free.',
  voiceId: "TODO_VOICE",
  welcome: "¡Hola, buenos días! ¿Busca algo?",
  items: {
    apple: "la manzana",
    milk: "la leche",
    cheese: "el queso",
    eggs: "los huevos",
    tomato: "el tomate",
    water: "el agua",
  },
  phrases: {
    excuse_me: "perdone",
    where_is: "dónde está",
    next_to: "al lado de",
    a_kilo_of: "un kilo de",
    six: "seis",
    bag: "la bolsa",
    thats_all: "Eso es todo.",
  },
  hints: {
    greet_cashier: 'Start with a greeting. Try: "¡Hola!"',
    ask_where_milk: 'Ask the way politely. Try: "Perdone, ¿dónde está la leche?"',
    order_apples: 'Ask for a quantity. Try: "Quisiera un kilo de manzanas, por favor."',
    order_eggs: 'Add one more thing. Try: "Y seis huevos, por favor."',
    answer_bag: 'He asks if you want a bag. Try: "Sí, una bolsa, por favor." or "No, gracias."',
  },
};

export default strings;
