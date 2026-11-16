// Registrierung neuer Praxen. Standard: geschlossen. Solange Nutzungsvertrag und Vertrag zur Auftragsverarbeitung
// nicht mit jeder Praxis geschlossen werden können, nimmt Sorrida nur Pilotpraxen auf (Anfrage über /hilfe).
// Geöffnet wird ausdrücklich mit REGISTRIERUNG_OFFEN=1, z. B. lokal für die Browser-Prüfungen.

export function registrierungOffen(env: Record<string, string | undefined> = process.env): boolean {
  return env.REGISTRIERUNG_OFFEN === "1";
}

/** Antwort der Schnittstelle, solange die Registrierung geschlossen ist. */
export const REGISTRIERUNG_GESCHLOSSEN =
  "Sorrida nimmt zurzeit nur Pilotpraxen auf. Ein eigenes Konto können Sie noch nicht selbst anlegen. Bitte fragen Sie auf der Seite Hilfe einen Pilotplatz an.";

/** Stand der Texte, die bei der Registrierung bestätigt werden (AVV-Muster, Zweckbestimmung). Wird mit dem Zeitpunkt gespeichert. */
export const VERTRAGSTEXTE_FASSUNG = "2026-11-16";

export const BESTAETIGUNG_UNTERNEHMER = "Ich handle für eine Praxis oder ein anderes Unternehmen (§ 14 BGB) und bin berechtigt, für sie Verträge zu schließen.";
export const BESTAETIGUNG_VERTRAGSTEXTE =
  "Ich habe das Muster des Vertrags zur Auftragsverarbeitung und die Angaben dazu gelesen, wofür Sorrida bestimmt ist. Echte Patientendaten gebe ich erst ein, wenn der Nutzungsvertrag und der Vertrag zur Auftragsverarbeitung mit Sorrida unterschrieben sind.";
