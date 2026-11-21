import type { VenueStrings } from "../types";
import type { bank } from "../venues";

const strings: VenueStrings<typeof bank> = {
  name: "El Banco",
  npcName: "Señor Céntimo",
  persona:
    "A precise, courteous mouse in a suit who has worked at the bank counter for many years. " +
    "He is formal but kind, speaks slowly in short sentences, and repeats numbers clearly. " +
    "The cash machine is out of order today, so he serves every customer at the counter and " +
    "apologises for it. Today one hundred dollars is ninety euros. When a customer wants to " +
    'change money he asks how much ("¿Cuánto?"), then whether they want banknotes or coins ' +
    '("¿Quiere billetes o monedas?"). The bank closes at five o\'clock ("a las cinco").',
  voiceId: "TODO_VOICE",
  welcome: "Buenos días. ¿En qué puedo ayudarle?",
  items: {
    coin: "la moneda",
    banknote: "el billete",
    bank_card: "la tarjeta bancaria",
    cash_machine: "el cajero automático",
    safe: "la caja fuerte",
    form: "el formulario",
  },
  phrases: {
    change_money: "cambiar dinero",
    hundred: "cien",
    dollar: "el dólar",
    euro: "el euro",
    what_time_close: "¿A qué hora cierran?",
    at_five: "a las cinco",
  },
  hints: {
    greet_banker: 'Be a little formal. Try: "Buenos días, señor."',
    ask_change_money: 'Say what you need. Try: "Quisiera cambiar dinero, por favor."',
    say_amount: 'He asks how much. Try: "Cien dólares, por favor."',
    choose_banknotes: 'He asks: banknotes or coins? Try: "Billetes, por favor."',
    ask_closing_time: 'Ask about closing time. Try: "¿A qué hora cierran?"',
  },
};

export default strings;
