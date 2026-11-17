import { anamnesePruefen, type Anamnese } from "@/lib/anamnesis";
import { ANAMNESE_FRAGEN, ANAMNESE_JE_FACH, ZAHN, anamneseFach, anamneseFuer, type Person } from "@/lib/anamneseProfile";

// Anamnesebögen für den Gastzugang (lib/demo.ts, lib/demoBulk.ts). Ohne Datenbank, damit
// lib/demoAnamnese.test.ts für jedes Fach prüfen kann, dass keine zahnärztlichen Angaben auftauchen.
// Jeder Bogen geht durch dieselbe Prüfung wie ein echter (anamnesePruefen), also nur Fragen und Anliegen des Fachs.

/** Beispielangaben zu Fragen, bei denen die Praxis eine Rückfrage stellt. */
const DETAIL: Record<string, string> = {
  medikamente: "ASS 100, Ramipril",
  blutverduenner: "ASS 100",
  allergien: "Penicillin",
};

function pruefen(body: unknown, fach: string | null | undefined, person: Person): Anamnese {
  const p = anamnesePruefen(body, anamneseFuer(fach, person));
  if (!p.ok) throw new Error(`Demo-Anamnese passt nicht zum Bogen (${fach ?? "ohne Fach"}): ${p.fehler}`);
  return p.daten;
}

/**
 * Ausgefüllter Beispielbogen mit Hinweisen (Blutverdünner, Allergie) und einer Angabe aus dem eigenen Teil des Fachs.
 * Zahnmedizin wie bisher mit Knirschen und dem Wunsch nach helleren Zähnen (Übernahme in den Vorschlag).
 */
export function demoAnamneseBeispiel(fach: string | null | undefined, person: Person, name: string): Anamnese {
  const profil = anamneseFuer(fach, person);
  const eigene = ANAMNESE_JE_FACH[anamneseFach(fach)];
  const keys = new Set(profil.fragen.map((f) => f.key));
  // Erste eigene Frage des Fachs mit Hinweis an die Praxis, damit der Hinweis in der Akte zu sehen ist.
  // Zahnmedizin: Knirschen, weil es in den Behandlungsvorschlag übernommen wird.
  const fachJa = profil.fach === ZAHN ? "knirschen" : eigene.fragen.find((k) => keys.has(k) && ANAMNESE_FRAGEN[k].hinweis);
  const ja = new Set(["medikamente", "blutverduenner", "allergien", ...(fachJa ? [fachJa] : [])]);
  const q = Object.fromEntries(profil.fragen.map((f) => [f.key, ja.has(f.key) ? { yes: true, ...(DETAIL[f.key] ? { detail: DETAIL[f.key] } : {}) } : { yes: false }]));
  const angeboten = new Set(profil.anliegen.map((a) => a.key));
  const wunsch = eigene.anliegen.find((k) => angeboten.has(k)) ?? "kasse";
  return pruefen({ q, wishes: [wunsch], confirmName: name }, fach, person);
}

/** Zufällige Rückfrage-Angaben; andere Fragen bleiben ohne Angabe, damit nichts Unpassendes erscheint. */
const DETAILS: Record<string, string[]> = {
  medikamente: ["laut Medikamentenplan", "L-Thyroxin", "Ramipril"],
  blutverduenner: ["ASS 100"],
  allergien: ["Penicillin", "Pflaster"],
};

/** Zufällig ausgefüllter Bogen für den großen Demo-Stamm. `r` liefert Zahlen zwischen 0 und 1. */
export function demoAnamneseZufall(fach: string | null | undefined, person: Person, r: () => number, name: string): Anamnese {
  const profil = anamneseFuer(fach, person);
  const q = Object.fromEntries(
    profil.fragen.map((f) => {
      const yes = r() < (f.key === "medikamente" ? 0.45 : f.key === "rauchen" ? 0.18 : f.key === "blutdruck" ? 0.22 : 0.06);
      const auswahl = DETAILS[f.key];
      return [f.key, yes && auswahl ? { yes, detail: auswahl[Math.floor(r() * auswahl.length)] } : { yes }];
    }),
  );
  const wishes = r() < 0.1 ? [profil.anliegen[Math.floor(r() * profil.anliegen.length)].key] : [];
  return pruefen({ q, wishes, confirmName: name }, fach, person);
}
