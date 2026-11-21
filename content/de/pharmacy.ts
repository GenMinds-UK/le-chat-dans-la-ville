import type { VenueStrings } from "../types";
import type { pharmacy } from "../venues";

const strings: VenueStrings<typeof pharmacy> = {
  name: "Die Apotheke",
  npcName: "Frau Kamille",
  persona:
    "A calm, kind rabbit in a white coat who listens carefully and speaks slowly and " +
    "reassuringly. She asks one short question at a time. When the customer says they have a " +
    'headache she always asks whether they also have a fever ("Haben Sie Fieber?"), then ' +
    "recommends the tablets: one tablet with water, morning and evening. She has tablets, " +
    "cough syrup, plasters, thermometers, cream and toothbrushes in stock. A box of tablets " +
    "costs four euros and a toothbrush costs two euros, so together they come to six euros.",
  voiceId: "TODO_VOICE",
  welcome: "Guten Tag! Kann ich Ihnen helfen?",
  items: {
    tablets: "die Tabletten",
    cough_syrup: "der Hustensaft",
    plaster: "das Pflaster",
    thermometer: "das Thermometer",
    cream: "die Creme",
    toothbrush: "die Zahnbürste",
  },
  phrases: {
    headache: "Ich habe Kopfschmerzen.",
    fever: "das Fieber",
    yes: "ja",
    no: "nein",
    do_you_have: "haben Sie",
    also: "auch",
    nice_day: "Schönen Tag noch!",
  },
  hints: {
    greet_pharmacist: 'Start with a greeting. Try: "Guten Tag!"',
    say_headache: 'Say what is wrong. Try: "Ich habe Kopfschmerzen."',
    answer_fever:
      'She asks if you have a fever. Answer yes or no. Try: "Nein, ich habe kein Fieber."',
    ask_toothbrush: 'Ask for one more thing. Try: "Haben Sie auch eine Zahnbürste?"',
    thank_pharmacist: 'Finish politely. Try: "Danke, auf Wiedersehen! Schönen Tag noch!"',
  },
};

export default strings;
