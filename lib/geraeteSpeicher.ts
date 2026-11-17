import { ANGABEN_SCHLUESSEL, ablageLesen, ablageSchreiben, leereAblage, type Ablage } from "@/lib/meineAngaben";
import { SPEICHER_SCHLUESSEL, listeLesen, listeSchreiben, type GemerktePraxis } from "@/lib/meinePraxen";

// Einziger Zugriff auf den Speicher des Browsers für „Meine Praxen auf diesem Gerät“ und „Meine Angaben auf diesem
// Gerät“ (Datenschutzerklärung, Abschnitt 3; lib/browserSpeicher.test.ts). Die Liste der Praxen wird nur auf der
// Seite /meine-praxen gelesen. Die Kopien der Angaben werden auf /meine-praxen und im offenen Anamnesebogen auf dem
// Gerät des Patienten gelesen (/a/<token>, /portal/<token>/anamnese/<id>), nie in der Praxis-App und nie am Empfang.
// Geschrieben wird nur nach einem Klick des Patienten. Nichts davon geht an den Server. Nur im Browser aufrufen.
//
// Bekanntes Restrisiko (für DSFA und Kanzlei, offen): Die Liste bündelt die Portal-Links aller gemerkten Praxen an
// einer Stelle. Der Speicher gehört zur Adresse, unter der auch Website, Praxis-App und Buchungsseite laufen, und dort
// erlaubt die Inhaltsrichtlinie noch eingebettete Skripte (script-src 'unsafe-inline'). Gelänge irgendwo unter dieser
// Adresse ein eingeschleustes Skript, könnte es auf dem Gerät des Patienten alle gemerkten Links lesen und per
// Navigation hinausschicken (connect-src bremst nur fetch). Ohne die Liste wäre nur der gerade offene Link erreichbar.
// Gegenmittel, mittelfristig: eigene Adresse für Patientenseiten, Nonce-CSP oder Trusted Types, oder die Liste mit
// einer Geräte-PIN verschlüsseln. Bis dahin: Merken nur auf Klick, nur auf Geräten ohne
// Praxis-Sitzung, jeder Link läuft ab, und die Liste lässt sich jederzeit ganz löschen.
//
// Bekanntes Restrisiko 2 (für DSFA und Kanzlei, offen): „Gerät der Praxis“ erkennt die Seite nur an Cookies
// (lib/meinePraxenSchutz.ts: Sitzung, Gastzugang, Empfangsmodus, gesperrter Bereich). Ein Tablet der Praxis, auf dem
// gerade niemand angemeldet ist und kein Empfangsmodus läuft (etwa nach dem Abmelden oder mit gelöschten Cookies),
// sieht aus wie das Gerät eines Patienten. Dort könnte ein Patient eine Liste anlegen oder eine verschlüsselte Kopie
// seiner Angaben behalten; der nächste Patient sähe die Namen der Kopien und das Protokoll, die Antworten nur mit Code.
// Gegenmittel heute: Das Angebot warnt sichtbar vor Tablets der Praxis und geteilten Geräten, der Name der Kopie ist
// als „nicht verschlüsselt“ beschriftet, und der Code muss mindestens 8 Zeichen mit Buchstaben haben. Ein dauerhaftes
// Kennzeichen „Gerät der Praxis“ (ein Cookie, das beim Abmelden bleibt) wäre wirksamer, ist aber ein neues Cookie mit
// eigener Rechtsgrundlage und Datenschutztext; das entscheidet der Inhaber.

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

// --- „Meine Angaben auf diesem Gerät“ (lib/meineAngaben.ts): nur verschlüsselte Kopien, Name, Stand, Art, Protokoll ---

export type AngabenStand = Ablage & { verfuegbar: boolean; abgelaufen: number };

/** Kopien und Protokoll lesen. Kaputtes und Abgelaufenes wird dabei gelöscht (abgelaufen: so viele Kopien). */
export function meineAngabenLesen(): AngabenStand {
  let roh: string | null;
  try {
    roh = localStorage.getItem(ANGABEN_SCHLUESSEL);
  } catch {
    return { verfuegbar: false, kopien: [], protokoll: [], abgelaufen: 0 };
  }
  const { kopien, protokoll, geaendert, abgelaufen } = ablageLesen(roh);
  if (geaendert) meineAngabenSchreiben({ kopien, protokoll });
  return { verfuegbar: true, kopien, protokoll, abgelaufen };
}

/** Schreibt die Ablage. Eine leere Ablage löscht den Wert ganz. Liefert false, wenn der Browser das nicht erlaubt. */
export function meineAngabenSchreiben(ablage: Ablage): boolean {
  try {
    if (leereAblage(ablage)) localStorage.removeItem(ANGABEN_SCHLUESSEL);
    else localStorage.setItem(ANGABEN_SCHLUESSEL, ablageSchreiben(ablage));
    return true;
  } catch {
    return false;
  }
}

/** „Alle Angaben von diesem Gerät löschen“: Kopien und Protokoll. */
export function meineAngabenLoeschen(): boolean {
  return meineAngabenSchreiben({ kopien: [], protokoll: [] });
}
