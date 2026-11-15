// Angaben zum Betreiber von Sorrida an einer Stelle. Impressum, Datenschutzerklärung, AVV-Muster und der Fuß der
// Sorrida-E-Mails lesen sie von hier. Leere Felder erscheinen nirgends; es gibt keinen Platzhaltertext.

export interface Betreiber {
  name: string;
  strasse: string;
  plzOrt: string;
  land: string;
  email: string;
  /** Leer, bis der Inhaber eine Nummer nennt. Solange sie fehlt, ist das Impressum nicht vollständig. */
  telefon: string;
  /** Wirtschafts-Identifikationsnummer oder Umsatzsteuer-Identifikationsnummer, falls vorhanden (§ 5 Abs. 1 Nr. 6 DDG). */
  wirtschaftsId: string;
}

export const BETREIBER: Betreiber = {
  name: "Luca Kolhoff",
  strasse: "Pastorskamp 19",
  plzOrt: "48485 Neuenkirchen",
  land: "Deutschland",
  email: "lucakolhoff1@gmail.com",
  telefon: "",
  wirtschaftsId: "",
};

/** „Name, Straße, PLZ Ort“ in einer Zeile, für Fließtext und E-Mail-Fuß. */
export const betreiberAnschrift = (b: Betreiber = BETREIBER) => [b.name, b.strasse, b.plzOrt].filter(Boolean).join(", ");

/**
 * Hat das Impressum alle Angaben, die § 5 DDG verlangt? Neben der E-Mail-Adresse braucht es einen zweiten,
 * schnellen Kontaktweg. Solange die Telefonnummer fehlt: nein.
 */
export function impressumVollstaendig(b: Betreiber = BETREIBER): boolean {
  return [b.name, b.strasse, b.plzOrt, b.email, b.telefon].every((x) => x.trim().length > 0);
}

/** Adresse der Website für Links in E-Mails (ohne Schrägstrich am Ende). */
export const websiteBasis = (env: Record<string, string | undefined> = process.env) => (env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Fuß der E-Mails, die Sorrida selbst verschickt (Bestätigung, Einladung, Passwort): wer schreibt und wo das Impressum steht. */
export function betreiberMailFuss(b: Betreiber = BETREIBER, env: Record<string, string | undefined> = process.env): string {
  return [`Sorrida · ${betreiberAnschrift(b)}`, b.telefon ? `Telefon ${b.telefon}` : "", b.email, `Impressum: ${websiteBasis(env)}/impressum`].filter(Boolean).join(" · ");
}
