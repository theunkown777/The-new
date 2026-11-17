// Zahnärztliche Begriffe, die außerhalb der Zahnmedizin in keinem Patiententext stehen dürfen.
// Genutzt von den Prüfungen lib/anamneseProfile.test.ts, lib/demoAnamnese.test.ts und lib/einleitungFach.test.ts.

/** Deutsch */
export const ZAHN_BEGRIFFE =
  /zahn|zähne|zahnärzt|gebiss|zahnfleisch|kiefer|prophylaxe|\bPZR\b|füllung|krone|implantat|\bBEMA\b|\bGOZ\b|bonusheft|festzuschuss|bleaching|knirsch|bruxismus|zahnersatz|karies|parodont|lücke schließen/i;

/** Zahnärztin oder Zahnarzt in den übrigen Sprachen der Patientenansicht (en, tr, pl, ru, uk, ar). */
export const ZAHN_BEGRIFFE_FREMD = /dentist|dental|tooth|teeth|diş|stomatolog|стоматолог|зуб|أسنان/i;
