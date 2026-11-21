import type { VenueStrings } from "../types";
import type { bakery } from "../venues";

const strings: VenueStrings<typeof bakery> = {
  name: "La Panadería",
  npcName: "Señora Hogaza",
  persona:
    "A warm, cheerful bear who has run this bakery for twenty years. She speaks slowly and " +
    "clearly, loves to recommend things, and is proud that the croissants came out of the " +
    "oven ten minutes ago. A loaf of bread costs one euro and a croissant costs one euro, " +
    "so two loaves and a croissant come to three euros.",
  voiceId: "TODO_VOICE",
  welcome: "¡Hola, buenos días! ¿Qué desea?",
  items: {
    bread: "la barra de pan",
    croissant: "el cruasán",
    muffin: "la magdalena",
    cake: "la tarta",
    bread_roll: "el panecillo",
    biscuit: "la galleta",
  },
  phrases: {
    hello: "hola",
    i_would_like: "quisiera",
    please: "por favor",
    two: "dos",
    how_much: "¿Cuánto es?",
    thank_you: "gracias",
    goodbye: "adiós",
  },
  hints: {
    greet: 'Start with a greeting. Try: "¡Hola!"',
    order_bread: 'Ask politely for two. Try: "Quisiera dos barras de pan, por favor."',
    order_croissant: 'Add one more thing. Try: "Y un cruasán, por favor."',
    ask_price: 'Ask for the total. Try: "¿Cuánto es?"',
    say_goodbye: 'Finish politely. Try: "¡Gracias, adiós!"',
  },
};

export default strings;
