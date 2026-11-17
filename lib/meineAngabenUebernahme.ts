import { BASIS_FRAGEN, ZAHN, type AnamneseProfil } from "@/lib/anamneseProfile";
import type { AngabenInhalt, Antwort } from "@/lib/meineAngaben";

// Welche Antworten in eine Kopie auf dem Gerät gehen und welche davon in den Bogen einer anderen Praxis
// (lib/meineAngaben.ts). Rein, ohne Browser und ohne Datenbank.
//
// Regeln:
//   1. Gespeichert und übernommen werden nur Fragen mit festen Schlüsseln aus lib/anamneseProfile.ts.
//   2. In den Bogen kommt nur, was es in DIESEM Bogen gibt. Das Profil der Zielpraxis ist schon nach Fach, Alter,
//      Geschlecht und Ansprache gefiltert (anamneseFuer): Fragen nur ab einem Alter, nur für Eltern oder nur für die
//      Person selbst (nurSelbst) fallen damit von selbst weg.
//   3. Zwischen Zahnmedizin und anderen Fächern gehen nur die Grundfragen (BASIS_FRAGEN) über. Zahnärztliche Fragen
//      kommen nie in einen ärztlichen Bogen und umgekehrt.
//   4. Eine Kopie für ein Kind (Eltern-Fassung) füllt nie einen Bogen der Person selbst und umgekehrt. Sonst landeten
//      Angaben über eine Person im Bogen einer anderen, oder vertrauliche Angaben eines Jugendlichen im Bogen der Eltern.
//   5. Angaben, die nur für einen Termin gelten oder sich schnell ändern, werden nie gespeichert und nie übernommen.

/** Angaben zum Anlass oder zum Augenblick: nie gespeichert, nie übernommen. */
export const NIE_MITNEHMEN: readonly string[] = [
  "schwanger", // kann sich jederzeit ändern
  "gewicht", // „in letzter Zeit“
  "op_unfall_jahr", // „in den letzten zwölf Monaten“
  "sturz", // „in den letzten zwölf Monaten“
  "verordnung", // Verordnung für diesen Termin
  "physio_frueher", // „wegen dieser Beschwerden“
  "aerztliche_behandlung", // „wegen Ihrer Beschwerden zurzeit“
  "salben", // „zurzeit … verschrieben“
  "verhuetung", // „zurzeit“
  "impfpass", // „zur Hand“
  "u_heft", // „zur Hand“
  "mutterpass", // Schwangerschaft
];

const BASIS = new Set<string>(BASIS_FRAGEN);
const DETAIL_MAX = 300;

/** Die Antworten eines ausgefüllten Bogens, die in eine Kopie auf dem Gerät gehen. */
export function angabenAusBogen(profil: Pick<AnamneseProfil, "fragen">, antworten: Record<string, { yes?: boolean; detail?: string }>): Record<string, Antwort> {
  const q: Record<string, Antwort> = {};
  for (const f of profil.fragen) {
    const a = antworten[f.key];
    if (NIE_MITNEHMEN.includes(f.key) || typeof a?.yes !== "boolean") continue;
    const detail = a.yes && f.detail ? (a.detail ?? "").replace(/\s+/g, " ").trim().slice(0, DETAIL_MAX) : "";
    q[f.key] = detail ? { yes: a.yes, detail } : { yes: a.yes };
  }
  return q;
}

export type Uebernahme =
  | { ok: true; werte: Record<string, Antwort> }
  /** "ansprache": Kopie für ein Kind und Bogen für die Person selbst (oder umgekehrt). "nichts": keine passende Frage. */
  | { ok: false; grund: "ansprache" | "nichts" };

/** Welche Antworten einer Kopie in diesen Bogen passen. */
export function uebernahmeFuer(inhalt: Pick<AngabenInhalt, "fach" | "ansprache" | "q">, ziel: Pick<AnamneseProfil, "fach" | "ansprache" | "fragen">): Uebernahme {
  if (inhalt.ansprache !== ziel.ansprache) return { ok: false, grund: "ansprache" };
  const nurBasis = (inhalt.fach === ZAHN) !== (ziel.fach === ZAHN);
  const werte: Record<string, Antwort> = {};
  for (const f of ziel.fragen) {
    const a = inhalt.q[f.key];
    if (!a || NIE_MITNEHMEN.includes(f.key) || (nurBasis && !BASIS.has(f.key))) continue;
    const detail = a.yes && f.detail ? (a.detail ?? "").slice(0, DETAIL_MAX) : "";
    werte[f.key] = detail ? { yes: a.yes, detail } : { yes: a.yes };
  }
  return Object.keys(werte).length ? { ok: true, werte } : { ok: false, grund: "nichts" };
}
