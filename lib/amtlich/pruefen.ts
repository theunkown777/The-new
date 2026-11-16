// Prüfung, ob es neuere amtliche Stände gibt als im Repo (scripts/amtlich-pruefen.ts).
// Hier steht nur die reine Auswertung der abgerufenen Seiten; der Netzabruf liegt im Skript.
// Eine Seite, aus der sich nichts sicher ablesen lässt, ergibt „nicht prüfbar“, nie „aktuell“.

export type PruefStatus = "aktuell" | "neuer Stand verfügbar" | "nicht prüfbar";
export interface PruefErgebnis { name: string; status: PruefStatus; imRepo: string; gefunden?: string; info?: string }

/** "1.61" gegen "1.7": größer 0, wenn a neuer ist. Vergleicht Teil für Teil als Zahl. */
export function versionVergleich(a: string, b: string): number {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Version aus dem Namen der KBV-Stammdatei: "…/SDEBM_V1.61.zip" → "1.61". */
export function sdebmVersion(text: string): string | null {
  return /SDEBM_V(\d+(?:\.\d+)+)\.zip/i.exec(text)?.[1] ?? null;
}

/** Höchste Version, die im Verzeichnis der KBV aufgeführt ist. */
export function neuesteSdebm(html: string): string | null {
  const alle = Array.from(html.matchAll(/SDEBM_V(\d+(?:\.\d+)+)\.zip/gi), (m) => m[1]);
  return alle.length ? alle.sort(versionVergleich).at(-1)! : null;
}

/** Seite als Text: ohne Skripte, Stile und Tags, Umlaute aus HTML-Schreibweise zurückgewandelt. */
export function klartext(html: string): string {
  const zeichen: Record<string, string> = { nbsp: " ", Auml: "Ä", auml: "ä", Ouml: "Ö", ouml: "ö", Uuml: "Ü", uuml: "ü", szlig: "ß", amp: "&" };
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([A-Za-z]+);/g, (ganz, name: string) => zeichen[name] ?? ganz)
    .replace(/\s+/g, " ");
}

/** Höchste Jahreszahl, die kurz nach dem Stichwort steht ("OPS Version 2027", "OPS 2027"). */
export function neuestesJahr(html: string, stichwort: string): number | null {
  const text = klartext(html);
  const muster = new RegExp(`${stichwort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.0-9]{0,30}?(20\\d{2})(?!\\d)`, "gi");
  const jahre = Array.from(text.matchAll(muster), (m) => Number(m[1])).filter((j) => j >= 2000 && j <= 2100);
  return jahre.length ? Math.max(...jahre) : null;
}

/** "01.07.2026" → "2026-07-01"; null, wenn es kein Datum ist. */
export function datumIso(de: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(de.trim());
  if (!m) return null;
  const tag = Number(m[1]), monat = Number(m[2]);
  if (tag < 1 || tag > 31 || monat < 1 || monat > 12) return null;
  return `${m[3]}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/**
 * Spätestes Datum (TT.MM.JJJJ), das höchstens `abstand` Zeichen nach dem Stichwort steht.
 * Für Seiten, die einen Stand nennen: „UV-GOÄ, Stand 01.01.2027“.
 */
export function neuestesDatum(html: string, stichwort: string, abstand = 40): string | null {
  const text = klartext(html);
  const esc = stichwort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const funde: string[] = [];
  for (const m of text.matchAll(new RegExp(esc, "gi"))) {
    const stueck = text.slice(m.index!, m.index! + m[0].length + abstand);
    for (const d of stueck.matchAll(/\b(\d{1,2}\.\d{1,2}\.\d{4})\b/g)) {
      const iso = datumIso(d[1]);
      if (iso) funde.push(iso);
    }
  }
  return funde.length ? funde.sort().at(-1)! : null;
}

/** EBM: Version im Repo gegen die höchste Version im Verzeichnis der KBV. */
export function ebmBewerten(imRepo: string | null, html: string | null): PruefErgebnis {
  const name = "EBM (KBV-Stammdatei SDEBM)";
  if (!imRepo) return { name, status: "nicht prüfbar", imRepo: "unbekannt", info: "Version im Repo nicht lesbar (lib/amtlich/ebm.ts)" };
  if (html === null) return { name, status: "nicht prüfbar", imRepo: `V${imRepo}`, info: "Abruf fehlgeschlagen" };
  const neu = neuesteSdebm(html);
  if (!neu) return { name, status: "nicht prüfbar", imRepo: `V${imRepo}`, info: "keine Stammdatei im Verzeichnis gefunden" };
  return versionVergleich(neu, imRepo) > 0
    ? { name, status: "neuer Stand verfügbar", imRepo: `V${imRepo}`, gefunden: `V${neu}`, info: "SDEBM_URL in lib/amtlich/ebm.ts anpassen und neu einlesen" }
    : { name, status: "aktuell", imRepo: `V${imRepo}`, gefunden: `V${neu}` };
}

/** Jahresfassung (OPS): Jahr im Repo gegen das höchste Jahr auf der Seite des Herausgebers. */
export function jahrBewerten(name: string, imRepo: number | null, html: string | null, stichwort: string): PruefErgebnis {
  if (!imRepo) return { name, status: "nicht prüfbar", imRepo: "unbekannt", info: "Jahr im Repo nicht lesbar" };
  if (html === null) return { name, status: "nicht prüfbar", imRepo: String(imRepo), info: "Abruf fehlgeschlagen" };
  const neu = neuestesJahr(html, stichwort);
  if (!neu) return { name, status: "nicht prüfbar", imRepo: String(imRepo), info: `„${stichwort}“ mit Jahr auf der Seite nicht gefunden` };
  return neu > imRepo
    ? { name, status: "neuer Stand verfügbar", imRepo: String(imRepo), gefunden: String(neu) }
    : { name, status: "aktuell", imRepo: String(imRepo), gefunden: String(neu) };
}

/** Stand mit Datum (UV-GOÄ, BEMA): Datum im Repo gegen das späteste Datum beim Stichwort. */
export function datumBewerten(name: string, imRepoDe: string | null, html: string | null, stichwort: string): PruefErgebnis {
  const imRepo = imRepoDe ? datumIso(imRepoDe) : null;
  if (!imRepo) return { name, status: "nicht prüfbar", imRepo: imRepoDe ?? "unbekannt", info: "Stand im Repo ist kein Datum" };
  if (html === null) return { name, status: "nicht prüfbar", imRepo: imRepoDe!, info: "Abruf fehlgeschlagen" };
  const neu = neuestesDatum(html, stichwort);
  if (!neu) return { name, status: "nicht prüfbar", imRepo: imRepoDe!, info: `kein Datum bei „${stichwort}“ gefunden` };
  const de = neu.split("-").reverse().join(".");
  return neu > imRepo
    ? { name, status: "neuer Stand verfügbar", imRepo: imRepoDe!, gefunden: de }
    : { name, status: "aktuell", imRepo: imRepoDe!, gefunden: de };
}

/** Ende des Skripts: 3, wenn es mindestens einen neuen Stand gibt, sonst 0. „Nicht prüfbar“ ist kein Fehler. */
export function exitCode(ergebnisse: PruefErgebnis[]): 0 | 3 {
  return ergebnisse.some((e) => e.status === "neuer Stand verfügbar") ? 3 : 0;
}

/** Eine Zeile je Quelle für die Ausgabe und das Issue. */
export function zeile(e: PruefErgebnis): string {
  const zeichen = e.status === "aktuell" ? "[aktuell]" : e.status === "neuer Stand verfügbar" ? "[NEU]" : "[nicht prüfbar]";
  return `${zeichen} ${e.name}: im Repo ${e.imRepo}${e.gefunden ? `, gefunden ${e.gefunden}` : ""}${e.info ? ` (${e.info})` : ""}`;
}
