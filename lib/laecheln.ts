// Texte und Ablauf für das Lächeln-Zitat der Startseite (components/start/LaechelnZitat.tsx).
// Praxis und Patient zeichnen je eine Hälfte des Bogens aus dem Logo; erst zusammen wird daraus ein Lächeln.
// Der Ablauf läuft von selbst, sobald der Abschnitt im Bild ist. Zu klicken gibt es nichts.
//
// Pflegehinweis: Die Seitentexte sind je ein kurzer Satz in eigenen Worten. Sie stützen sich nur auf Aussagen, die schon
// auf der Startseite stehen (components/Entlastung.tsx: ein Klick nach dem Gespräch; components/ZweiAnsichten.tsx:
// ohne App), übernehmen aber nicht deren Wortlaut, weil die Entlastung-Karten direkt darunter folgen.
// Ändert sich dort eine Produktaussage, diese Texte mitpflegen. Keine Zahlen, keine neuen Versprechen.

export type LaechelnSeite = "praxis" | "patient";
/** Stationen des Ablaufs: „wartet“ = noch nicht im Bild, „beide“ = Endzustand mit ganzem Bogen. */
export type LaechelnPhase = "wartet" | "praxis" | "patient" | "beide";

/** Wann welche Station beginnt, in Millisekunden ab dem Start. Die Bewegung selbst steht im CSS (app/globals.css). */
export const LAECHELN_ABLAUF: { phase: Exclude<LaechelnPhase, "wartet">; abMs: number }[] = [
  { phase: "praxis", abMs: 150 },
  { phase: "patient", abMs: 1100 },
  { phase: "beide", abMs: 2100 },
];

/** So lange braucht die letzte Station im CSS: Hälften treffen sich, der Bogen vertieft sich, der Status blendet ein. */
export const LAECHELN_SCHLUSS_MS = 1200;
/** Gesamtdauer vom Start bis zur Ruhe. */
export const LAECHELN_DAUER_MS = LAECHELN_ABLAUF[LAECHELN_ABLAUF.length - 1].abMs + LAECHELN_SCHLUSS_MS;

/** Station zu einem Zeitpunkt nach dem Start. Vor dem ersten Schritt wartet der Bogen, nach dem letzten bleibt er ganz. */
export function laechelnPhase(ms: number): LaechelnPhase {
  let phase: LaechelnPhase = "wartet";
  for (const s of LAECHELN_ABLAUF) if (ms >= s.abMs) phase = s.phase;
  return phase;
}

/** Je Seite: stilles Etikett, ein Satz und die Statuszeile, solange erst diese Hälfte dazugekommen ist. */
export const LAECHELN_SEITEN: Record<LaechelnSeite, { name: string; text: string; status: string }> = {
  praxis: {
    name: "Praxis",
    text: "Weniger Schreibarbeit nach dem Gespräch.",
    status: "Die Praxis lächelt.",
  },
  patient: {
    name: "Patient",
    text: "Kosten in Ruhe zu Hause verstehen, ohne App.",
    status: "Der Patient lächelt.",
  },
};

/** Endzustand. Der Link führt weiter nach unten zum Zeitrechner (id in components/ZeitRechner.tsx). */
export const LAECHELN_SCHLUSS = {
  titel: "Jetzt lächeln beide.",
  text: "Erst mit Praxis und Patient wird aus dem Bogen ein Lächeln.",
  link: { href: "#zeitrechner", text: "Wie viel Zeit Ihr Team zurückbekommt" },
};
