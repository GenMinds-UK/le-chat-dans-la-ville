import type { VenueStrings } from "../types";
import type { pharmacy } from "../venues";

const strings: VenueStrings<typeof pharmacy> = {
  name: "La Farmacia",
  npcName: "Señora Manzanilla",
  persona:
    "A calm, kind rabbit in a white coat who listens carefully and speaks slowly and " +
    "reassuringly. She asks one short question at a time. When the customer says they have a " +
    'headache she always asks whether they also have a fever ("¿Tiene fiebre?"), then ' +
    "recommends the tablets: one tablet with water, morning and evening. She has tablets, " +
    "cough syrup, plasters, thermometers, cream and toothbrushes in stock. A box of tablets " +
    "costs four euros and a toothbrush costs two euros, so together they come to six euros.",
  voiceId: "TODO_VOICE",
  welcome: "¡Hola, buenos días! ¿Le puedo ayudar?",
  items: {
    tablets: "las pastillas",
    cough_syrup: "el jarabe",
    plaster: "la tirita",
    thermometer: "el termómetro",
    cream: "la crema",
    toothbrush: "el cepillo de dientes",
  },
  phrases: {
    headache: "Me duele la cabeza.",
    fever: "la fiebre",
    yes: "sí",
    no: "no",
    do_you_have: "tiene",
    also: "también",
    nice_day: "¡Que tenga un buen día!",
  },
  hints: {
    greet_pharmacist: 'Start with a greeting. Try: "¡Hola!"',
    say_headache: 'Say what is wrong. Try: "Me duele la cabeza."',
    answer_fever: 'She asks if you have a fever. Answer yes or no. Try: "No, no tengo fiebre."',
    ask_toothbrush: 'Ask for one more thing. Try: "¿Tiene también un cepillo de dientes?"',
    thank_pharmacist: 'Finish politely. Try: "¡Gracias, adiós! ¡Que tenga un buen día!"',
  },
};

export default strings;
