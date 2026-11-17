// Zahnärztliche Begriffe, die außerhalb der Zahnmedizin in keinem Patiententext stehen dürfen.
// Genutzt von den Prüfungen lib/anamneseProfile.test.ts, lib/demoAnamnese.test.ts, lib/einleitungFach.test.ts,
// lib/katalogBeispiele.test.ts und lib/fachneutralQuelltext.test.ts.

/** Deutsch. „Prothese“ und „Wurzel“ allein stehen nicht darin: Sie kommen auch außerhalb der Zahnmedizin vor (Hüftprothese, Haarwurzel). */
export const ZAHN_BEGRIFFE =
  /zahn|zähne|zahnärzt|gebiss|zahnfleisch|kiefer|prophylaxe|\bPZR\b|füllung|krone|implantat|\bBEMA\b|\bGOZ\b|bonusheft|festzuschuss|bleaching|knirsch|bruxismus|zahnersatz|karies|parodont|lücke schließen|brücke|aligner|veneer|wurzelkanal|wurzelbehandlung|teilprothese|vollprothese|\bKFO\b/i;

/** Zahnärztin oder Zahnarzt in den übrigen Sprachen der Patientenansicht (en, tr, pl, ru, uk, ar). */
export const ZAHN_BEGRIFFE_FREMD = /dentist|dental|tooth|teeth|diş|stomatolog|стоматолог|зуб|أسنان/i;
