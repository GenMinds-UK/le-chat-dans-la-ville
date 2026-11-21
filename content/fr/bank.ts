import type { VenueStrings } from "../types";
import type { bank } from "../venues";

const strings: VenueStrings<typeof bank> = {
  name: "La Banque",
  npcName: "Monsieur Centime",
  persona:
    "A precise, courteous mouse in a suit who has worked at the bank counter for many years. " +
    "He is formal but kind, speaks slowly in short sentences, and repeats numbers clearly. " +
    "The cash machine is out of order today, so he serves every customer at the counter and " +
    "apologises for it. Today one hundred dollars is ninety euros. When a customer wants to " +
    'change money he asks how much ("Combien ?"), then whether they want banknotes or coins ' +
    '("Vous voulez des billets ou des pièces ?"). The bank closes at five o\'clock ' +
    '("à cinq heures").',
  voiceId: "TODO_VOICE",
  welcome: "Bonjour. Bienvenue à la banque. Que puis-je faire pour vous ?",
  items: {
    coin: "la pièce",
    banknote: "le billet",
    bank_card: "la carte bancaire",
    cash_machine: "le distributeur",
    safe: "le coffre-fort",
    form: "le formulaire",
  },
  phrases: {
    change_money: "changer de l'argent",
    hundred: "cent",
    dollar: "le dollar",
    euro: "l'euro",
    what_time_close: "À quelle heure fermez-vous ?",
    at_five: "à cinq heures",
  },
  hints: {
    greet_banker: 'Be a little formal. Try: "Bonjour, monsieur."',
    ask_change_money:
      'Say what you need. Try: "Je voudrais changer de l\'argent, s\'il vous plaît."',
    say_amount: 'He asks how much. Try: "Cent dollars, s\'il vous plaît."',
    choose_banknotes:
      'He asks: banknotes or coins? Try: "Des billets, s\'il vous plaît."',
    ask_closing_time: 'Ask about closing time. Try: "À quelle heure fermez-vous ?"',
  },
};

export default strings;
