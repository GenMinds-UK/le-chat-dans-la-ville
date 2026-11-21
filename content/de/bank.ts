import type { VenueStrings } from "../types";
import type { bank } from "../venues";

const strings: VenueStrings<typeof bank> = {
  name: "Die Bank",
  npcName: "Herr Pfennig",
  persona:
    "A precise, courteous mouse in a suit who has worked at the bank counter for many years. " +
    "He is formal but kind, speaks slowly in short sentences, and repeats numbers clearly. " +
    "The cash machine is out of order today, so he serves every customer at the counter and " +
    "apologises for it. Today one hundred dollars is ninety euros. When a customer wants to " +
    'change money he asks how much ("Wie viel?"), then whether they want banknotes or coins ' +
    '("Möchten Sie Geldscheine oder Münzen?"). The bank closes at five o\'clock ' +
    '("um fünf Uhr").',
  voiceId: "TODO_VOICE",
  welcome: "Guten Tag. Was kann ich für Sie tun?",
  items: {
    coin: "die Münze",
    banknote: "der Geldschein",
    bank_card: "die Bankkarte",
    cash_machine: "der Geldautomat",
    safe: "der Tresor",
    form: "das Formular",
  },
  phrases: {
    change_money: "Geld wechseln",
    hundred: "hundert",
    dollar: "der Dollar",
    euro: "der Euro",
    what_time_close: "Wann schließen Sie?",
    at_five: "um fünf Uhr",
  },
  hints: {
    greet_banker: 'Be a little formal. Try: "Guten Tag, Herr Pfennig."',
    ask_change_money: 'Say what you need. Try: "Ich möchte Geld wechseln, bitte."',
    say_amount: 'He asks how much. Try: "Hundert Dollar, bitte."',
    choose_banknotes: 'He asks: banknotes or coins? Try: "Geldscheine, bitte."',
    ask_closing_time: 'Ask about closing time. Try: "Wann schließen Sie?"',
  },
};

export default strings;
