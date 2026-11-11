// Sammelt alle deutschen Texte der Anatomie-Modelle (Daten und Oberfläche): Grundlage für
// lib/modelle/i18n/quelle.json und für den Test, der prüft, dass jede Sprache vollständig ist.
import { readFileSync } from "node:fs";
import { STRUKTUREN, EBENEN } from "../koerper";
import { SCHNITTMODELLE } from "../schnitt";
import { ZAEHNE, MILCHZAEHNE, ZAHNARTEN, SCHICHTEN, INSTRUMENTE, MILCHZAHN_HINWEIS } from "../gebiss";
import { MODELL_NAMEN } from "../fach";
import { ERKLAERPUNKTE, FOKUS } from "../fokus";
import { STUFEN } from "../drei/anatomie";
import { MUND_HINWEIS, MUND_TEILE } from "../mund";
import { textSchluessel } from "./schluessel";

export function sammleModellTexte(): { alle: Record<string, string>; teile: Record<string, Record<string, string>> } {
  const gruppen: Record<string, string[]> = { oberflaeche: [], koerper1: [], koerper2: [], schnitt: [], gebiss: [] };
  const add = (g: string, ...t: (string | null | undefined)[]) => { for (const x of t) if (x && x.trim()) gruppen[g].push(x); };

  // Oberfläche: alle t("…")- und uebersetze(x, "…")-Aufrufe mit festem Text
  const DATEIEN = ["components/modelle/KoerperModell.tsx", "components/modelle/GebissModell.tsx", "components/modelle/SchnittModellAnsicht.tsx", "components/modelle/ModellTeile.tsx", "components/modelle/ModellWahl.tsx", "components/modelle/drei/Modell3D.tsx", "components/modelle/drei/Schalter.tsx", "app/portal/[token]/modell/page.tsx"];
  for (const d of DATEIEN) {
    const q = readFileSync(d, "utf8");
    for (const m of q.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)+)"/g)) add("oberflaeche", JSON.parse(`"${m[1]}"`));
  }
  add("oberflaeche", "Mit dem Finger oder der Maus drehen, mit zwei Fingern oder dem Mausrad vergrößern. Antippen für die Erklärung.", "Schema");
  add("oberflaeche", "Vereinfachte Darstellung zur Erklärung. Sie ersetzt keine Untersuchung und ist keine Diagnose.", "rechts", "links", "weiblich", "männlich", "Alle Zähne", "Aufbau eines Zahns", "Instrumente", "Bleibende Zähne (32)", "Milchzähne (20)", ...Object.values(MODELL_NAMEN));
  for (const e of EBENEN) add("oberflaeche", e.name, e.kurz);
  // Echte 3D-Daten: Stufen, Organe allein, Erklärpunkte, Teile des Mundes
  for (const s of STUFEN) add("oberflaeche", s.name);
  for (const f of Object.values(FOKUS)) add("oberflaeche", f.name, f.hinweis);
  for (const p of ERKLAERPUNKTE) add("oberflaeche", p.name);
  for (const m of MUND_TEILE) add("gebiss", m.name, m.was);
  add("gebiss", MUND_HINWEIS);

  STRUKTUREN.forEach((s, i) => add(i < STRUKTUREN.length / 2 ? "koerper1" : "koerper2", s.name, s.was, s.beschwerden));
  for (const m of Object.values(SCHNITTMODELLE)) {
    add("schnitt", m.titel, m.ansicht, ...m.hinweise.map((h) => h.text));
    for (const t of m.teile) add("schnitt", t.name, t.was, t.beschwerden);
  }
  for (const z of [...ZAEHNE, ...MILCHZAEHNE]) add("gebiss", z.name, z.durchbruch, z.wurzeln);
  for (const a of Object.values(ZAHNARTEN)) add("gebiss", a.name, a.aufgabe, a.typisch);
  for (const s of SCHICHTEN) add("gebiss", s.name, s.was, s.wennKrank);
  for (const i of INSTRUMENTE) add("gebiss", i.name, i.wofuer, i.gefuehl);
  add("gebiss", MILCHZAHN_HINWEIS);

  const alle: Record<string, string> = {};
  const teile: Record<string, Record<string, string>> = {};
  for (const [g, liste] of Object.entries(gruppen)) {
    teile[g] = {};
    for (const de of liste) {
      const k = textSchluessel(de);
      if (alle[k] !== undefined && alle[k] !== de) throw new Error(`Schlüssel doppelt: ${k} für „${alle[k]}“ und „${de}“`);
      if (alle[k] === undefined) { alle[k] = de; teile[g][k] = de; }
    }
  }
  return { alle, teile };
}
