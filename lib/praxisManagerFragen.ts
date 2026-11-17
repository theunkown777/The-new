// Themen und Fragen des Praxismanagers als reine Daten ohne Abhängigkeiten. lib/praxisManager.ts rechnet mit ihnen,
// Frag Sorrida (auch im Browser) und lib/hilfeAnker.ts lesen sie von hier. So stehen die Fragen nur an einer Stelle.

export const PM_THEMEN = ["rechnungen", "berichte", "vorsorge", "umsatz", "engpaesse", "termine", "abrechnung"] as const;
export type ThemaId = (typeof PM_THEMEN)[number];

export const FRAGEN: Record<ThemaId, string> = {
  rechnungen: "Welche Rechnungen sind offen?",
  berichte: "Welche Berichte warten auf Freigabe?",
  vorsorge: "Wer ist zur Vorsorge fällig?",
  umsatz: "Wie läuft der Umsatz?",
  engpaesse: "Wo hakt es gerade?",
  termine: "Wie voll ist der Kalender?",
  abrechnung: "Was ist nicht abgerechnet?",
};

/** Gültiges Thema aus der Adresse (?thema=…), sonst null. Nur eigene Schlüssel zählen, nicht „toString“ und Co. */
export const themaAusAdresse = (wert: unknown): ThemaId | null => (typeof wert === "string" && Object.hasOwn(FRAGEN, wert) ? (wert as ThemaId) : null);
