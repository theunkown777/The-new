import { z } from "zod";
import { PRAXIS_GRUPPEN } from "@/lib/praxisGruppe";

// „Meine Praxen auf diesem Gerät“: Der Patient merkt sich die Portal-Links, die ihm jede Praxis gibt, auf dem
// eigenen Gerät. Die Brücke zwischen Hausarzt und Zahnarzt ist das Gerät des Patienten, nicht der Server:
//   - Gespeichert wird nur im Browser (localStorage), nur nach einem Klick, nur was die Portalseite ohnehin zeigt.
//   - Sorrida erfährt davon nichts. Keine Praxis sieht die Liste, keine erfährt von der anderen.
//   - Jeder Eintrag öffnet genau ein Portal mit genau einem Token. Es gibt keinen Abruf für mehrere Praxen.
//   - Keine gemischte Liste, kein Vergleich: Jede Praxis bleibt eine eigene Karte.
// Diese Datei ist rein (kein Browser, keine Datenbank). Den Speicher fasst nur lib/geraeteSpeicher.ts an.

export const SPEICHER_SCHLUESSEL = "sorrida:meine-praxen:v1";
/** Mehr Praxen merkt sich das Gerät nicht. */
export const MAX_PRAXEN = 20;
/** Form eines Portal-Tokens (wie lib/portalAuth.ts). */
export const TOKEN_FORM = /^[A-Za-z0-9_-]{20,128}$/;

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s), "Datum ungültig");
const text = (max: number, min = 0) => z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().min(min).max(max));

/** Erlaubte Felder eines Eintrags. Unbekannte Felder fallen beim Lesen und Schreiben weg. */
export const eintragSchema = z.object({
  token: z.string().regex(TOKEN_FORM),
  vorname: text(60),
  praxisName: text(160, 1),
  fachKurz: text(60),
  gruppe: z.enum(PRAXIS_GRUPPEN),
  ort: text(60),
  gueltigBis: iso,
  gemerktAm: iso,
  eigenerName: text(60).optional(),
});
export type GemerktePraxis = z.infer<typeof eintragSchema>;
/** Was die Portalseite beim Klick auf „merken“ übergibt. */
export type NeuePraxis = Omit<GemerktePraxis, "gemerktAm" | "eigenerName">;

const speicherSchema = z.object({ v: z.literal(1), praxen: z.array(z.unknown()) });

/**
 * Inhalt des Speichers lesen. Kaputtes (kein JSON, andere Version, falsche Form) wird verworfen. Einzelne kaputte
 * Einträge fallen weg, der Rest bleibt. `kaputt` ist wahr, sobald etwas verworfen wurde: Der Aufrufer schreibt dann
 * die gültigen Einträge zurück oder löscht den Wert, wenn keiner übrig ist.
 */
export function listeLesen(roh: string | null | undefined): { praxen: GemerktePraxis[]; kaputt: boolean } {
  if (roh == null || roh === "") return { praxen: [], kaputt: false };
  let json: unknown;
  try {
    json = JSON.parse(roh);
  } catch {
    return { praxen: [], kaputt: true };
  }
  const r = speicherSchema.safeParse(json);
  if (!r.success) return { praxen: [], kaputt: true };
  const praxen: GemerktePraxis[] = [];
  for (const e of r.data.praxen) {
    const p = eintragSchema.safeParse(e);
    if (p.success && !praxen.some((x) => x.token === p.data.token)) praxen.push(sauber(p.data));
  }
  return { praxen: praxen.slice(0, MAX_PRAXEN), kaputt: praxen.length !== r.data.praxen.length };
}

/** Nur die erlaubten Felder, in fester Reihenfolge. */
function sauber(e: GemerktePraxis): GemerktePraxis {
  const { token, vorname, praxisName, fachKurz, gruppe, ort, gueltigBis, gemerktAm, eigenerName } = e;
  return { token, vorname, praxisName, fachKurz, gruppe, ort, gueltigBis, gemerktAm, ...(eigenerName ? { eigenerName } : {}) };
}

export function listeSchreiben(praxen: GemerktePraxis[]): string {
  return JSON.stringify({ v: 1, praxen: praxen.slice(0, MAX_PRAXEN).map(sauber) });
}

export type MerkErgebnis = { art: "neu" | "erneuert"; praxen: GemerktePraxis[] } | { art: "voll" | "ungueltig"; praxen: GemerktePraxis[] };

const gleichePraxis = (a: Pick<GemerktePraxis, "praxisName" | "fachKurz" | "ort" | "vorname">, b: typeof a) =>
  [a.praxisName, a.fachKurz, a.ort, a.vorname].join("\n").toLocaleLowerCase("de-DE") === [b.praxisName, b.fachKurz, b.ort, b.vorname].join("\n").toLocaleLowerCase("de-DE");

/**
 * Eine Praxis merken. Derselbe Link ersetzt seinen Eintrag. Ein neuer Link derselben Praxis für dieselbe Person
 * (die Praxis hat den Link erneuert) ersetzt den alten Eintrag; der eigene Name der Karte bleibt.
 * Verglichen wird dabei nur innerhalb dieser einen Praxis, nie zwischen Praxen.
 */
export function merken(liste: GemerktePraxis[], neu: NeuePraxis, jetzt = new Date()): MerkErgebnis {
  const p = eintragSchema.safeParse({ ...neu, gemerktAm: jetzt.toISOString() });
  if (!p.success) return { art: "ungueltig", praxen: liste };
  const eintrag = sauber({ ...p.data, eigenerName: undefined });
  const i = liste.findIndex((x) => x.token === eintrag.token || gleichePraxis(x, eintrag));
  if (i >= 0) {
    const praxen = [...liste];
    praxen[i] = sauber({ ...eintrag, eigenerName: liste[i].eigenerName });
    return { art: "erneuert", praxen };
  }
  if (liste.length >= MAX_PRAXEN) return { art: "voll", praxen: liste };
  return { art: "neu", praxen: [...liste, eintrag] };
}

/** Eigener Name für eine Karte. Leer setzt den Praxisnamen wieder ein. */
export function umbenennen(liste: GemerktePraxis[], token: string, name: string): GemerktePraxis[] {
  const neu = name.replace(/\s+/g, " ").trim().slice(0, 60);
  return liste.map((x) => (x.token === token ? sauber({ ...x, eigenerName: neu || undefined }) : x));
}

export function entfernen(liste: GemerktePraxis[], token: string): GemerktePraxis[] {
  return liste.filter((x) => x.token !== token);
}

/** Abgelaufen? Verglichen wird auf dem Gerät, ohne Abruf beim Server. */
export const abgelaufen = (e: Pick<GemerktePraxis, "gueltigBis">, jetzt = new Date()) => Date.parse(e.gueltigBis) <= jetzt.getTime();

/** Adresse genau eines Portals. Ein Eintrag mit falscher Form ergibt null, nie eine fremde Adresse. */
export function portalPfad(token: string): string | null {
  return TOKEN_FORM.test(token) ? `/portal/${token}` : null;
}

/** Titel der Karte: der eigene Name, sonst der Praxisname. */
export const kartenTitel = (e: Pick<GemerktePraxis, "praxisName" | "eigenerName">) => e.eigenerName || e.praxisName;
