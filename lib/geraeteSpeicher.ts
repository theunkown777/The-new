import { SPEICHER_SCHLUESSEL, listeLesen, listeSchreiben, type GemerktePraxis } from "@/lib/meinePraxen";

// Einziger Zugriff auf den Speicher des Browsers für „Meine Praxen auf diesem Gerät“ (Datenschutzerklärung,
// Abschnitt 3; lib/browserSpeicher.test.ts). Gelesen wird nur auf der Seite /meine-praxen, geschrieben nur nach
// einem Klick des Patienten. Nichts davon geht an den Server. Nur im Browser aufrufen (Client-Bausteine).
//
// Bekanntes Restrisiko (für DSFA und Kanzlei, offen): Die Liste bündelt die Portal-Links aller gemerkten Praxen an
// einer Stelle. Der Speicher gehört zur Adresse, unter der auch Website, Praxis-App und Buchungsseite laufen, und dort
// erlaubt die Inhaltsrichtlinie noch eingebettete Skripte (script-src 'unsafe-inline'). Gelänge irgendwo unter dieser
// Adresse ein eingeschleustes Skript, könnte es auf dem Gerät des Patienten alle gemerkten Links lesen und per
// Navigation hinausschicken (connect-src bremst nur fetch). Ohne die Liste wäre nur der gerade offene Link erreichbar.
// Gegenmittel, mittelfristig: eigene Adresse für Patientenseiten, Nonce-CSP oder Trusted Types, oder die Liste mit
// einer Geräte-PIN verschlüsseln. Bis dahin: Merken nur auf Klick, nur auf Geräten ohne
// Praxis-Sitzung, jeder Link läuft ab, und die Liste lässt sich jederzeit ganz löschen.

export type Lesestand = { verfuegbar: boolean; praxen: GemerktePraxis[] };

export function gemerktePraxenLesen(): Lesestand {
  let roh: string | null;
  try {
    roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
  } catch {
    // Speicher gesperrt (privater Modus, Einstellungen des Browsers)
    return { verfuegbar: false, praxen: [] };
  }
  const { praxen, kaputt } = listeLesen(roh);
  // Kaputtes wird verworfen: gültige Einträge zurückschreiben, sonst den Wert löschen.
  if (kaputt) gemerktePraxenSchreiben(praxen);
  return { verfuegbar: true, praxen };
}

/** Schreibt die Liste. Eine leere Liste löscht den Wert ganz. Liefert false, wenn der Browser das nicht erlaubt. */
export function gemerktePraxenSchreiben(praxen: GemerktePraxis[]): boolean {
  try {
    if (praxen.length === 0) localStorage.removeItem(SPEICHER_SCHLUESSEL);
    else localStorage.setItem(SPEICHER_SCHLUESSEL, listeSchreiben(praxen));
    return true;
  } catch {
    return false;
  }
}

/** „Alles von diesem Gerät löschen“. */
export function gemerktePraxenLoeschen(): boolean {
  return gemerktePraxenSchreiben([]);
}
