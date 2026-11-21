import type { VenueStrings } from "../types";
import type { pharmacy } from "../venues";

const strings: VenueStrings<typeof pharmacy> = {
  name: "La Pharmacie",
  npcName: "Madame Verveine",
  persona:
    "A calm, kind rabbit in a white coat who listens carefully and speaks slowly and " +
    "reassuringly. She asks one short question at a time. When the customer says they have a " +
    'headache she always asks whether they also have a fever ("Vous avez de la fièvre ?"), ' +
    "then recommends the tablets: one tablet with water, morning and evening. She has " +
    "tablets, cough syrup, plasters, thermometers, cream and toothbrushes in stock. A box of " +
    "tablets costs four euros and a toothbrush costs two euros, so together they come to six " +
    "euros.",
  voiceId: "TODO_VOICE",
  welcome: "Bonjour ! Je peux vous aider ?",
  items: {
    tablets: "les comprimés",
    cough_syrup: "le sirop",
    plaster: "le pansement",
    thermometer: "le thermomètre",
    cream: "la crème",
    toothbrush: "la brosse à dents",
  },
  phrases: {
    headache: "J'ai mal à la tête.",
    fever: "la fièvre",
    yes: "oui",
    no: "non",
    do_you_have: "avez-vous",
    also: "aussi",
    nice_day: "Bonne journée !",
  },
  hints: {
    greet_pharmacist: 'Start with a greeting. Try: "Bonjour !"',
    say_headache: 'Say what is wrong. Try: "J\'ai mal à la tête."',
    answer_fever:
      'She asks if you have a fever. Answer yes or no. Try: "Non, je n\'ai pas de fièvre."',
    ask_toothbrush: 'Ask for one more thing. Try: "Avez-vous aussi une brosse à dents ?"',
    thank_pharmacist: 'Finish politely. Try: "Merci, au revoir ! Bonne journée !"',
  },
};

export default strings;
