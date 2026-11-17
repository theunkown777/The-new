import { SPEICHER_SCHLUESSEL, listeLesen, listeSchreiben, type GemerktePraxis } from "@/lib/meinePraxen";

// Einziger Zugriff auf den Speicher des Browsers für „Meine Praxen auf diesem Gerät“ (Datenschutzerklärung,
// Abschnitt 3; lib/browserSpeicher.test.ts). Gelesen wird nur auf der Seite /meine-praxen, geschrieben nur nach
// einem Klick des Patienten. Nichts davon geht an den Server. Nur im Browser aufrufen (Client-Bausteine).

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
