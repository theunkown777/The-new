import { systemGruppe } from "@/lib/fachprofile";

// Verzeichnisse und Beispieltexte für den eigenen Katalog (components/CatalogSettings.tsx) und das
// Leistungsverzeichnis (app/(app)/leistungsverzeichnis/page.tsx), je Gruppe aus systemGruppe(fach).
// Zahnärztliches (GOZ, BEMA, Prophylaxe, Füllung, Krone) nur bei Zahnmedizin; geprüft in lib/katalogBeispiele.test.ts.

/** Gebührenverzeichnisse, aus denen eine Praxis dieser Gruppe eigene Positionen anlegt. */
export const SYSTEME_JE_GRUPPE: Record<string, string[]> = {
  zahn: ["GOZ", "BEMA", "GOAE", "BEL_II", "SONSTIGES"],
  therapie: ["HEILMITTEL", "SELBST", "SONSTIGES"],
  apotheke: ["APO", "HILFSMITTEL", "SELBST", "SONSTIGES"],
  versorgung: ["HILFSMITTEL", "SELBST", "SONSTIGES"],
  pflege: ["PFLEGE", "SELBST", "SONSTIGES"],
  hebamme: ["HEBAMME", "SELBST", "SONSTIGES"],
  selbst: ["SELBST", "SONSTIGES"],
  arzt: ["EBM", "GOAE", "UVGOAE", "SELBST", "SONSTIGES"],
};

export const SYSTEM_LABEL: Record<string, string> = { GOAE: "GOÄ", UVGOAE: "UV-GOÄ", HEILMITTEL: "Heilmittel", PFLEGE: "Pflege", HEBAMME: "Hebammenhilfe", APO: "Apotheke", HILFSMITTEL: "Hilfsmittel", SELBST: "Selbstzahler", SONSTIGES: "Sonstiges", BEL_II: "BEL II" };

/** Verzeichnisse einer Gruppe; unbekannte Gruppe wie „arzt“ (nie still zahnärztlich). */
export const systemeFuer = (gruppe: string): string[] => SYSTEME_JE_GRUPPE[gruppe] ?? SYSTEME_JE_GRUPPE.arzt;

/** Beispiel für das Feld „Kategorie“ je Gruppe. */
const KATEGORIE_BEISPIEL: Record<string, string> = { zahn: "Prophylaxe", arzt: "Vorsorge", therapie: "Behandlung", apotheke: "Beratung", versorgung: "Versorgung", pflege: "Pflege", hebamme: "Wochenbett", selbst: "Behandlung" };
export const kategorieBeispiel = (gruppe: string): string => KATEGORIE_BEISPIEL[gruppe] ?? "Vorsorge";

/**
 * Verzeichnisse mit Steigerungsfaktor (GOZ, GOÄ) in dieser Gruppe, z. B. "GOZ/GOÄ" oder "GOÄ".
 * Leer, wenn die Gruppe keines hat (Heilmittel, Pflege, Apotheke …): Dann gibt es kein Faktor-Feld.
 */
export function faktorVerzeichnisse(gruppe: string): string {
  return systemeFuer(gruppe)
    .filter((s) => s === "GOZ" || s === "GOAE")
    .map((s) => SYSTEM_LABEL[s] ?? s)
    .join("/");
}

/** Verzeichnisse, die Leistungen in Punkten bewerten (Punktzahl × Punktwert). Alle anderen kennen nur Beträge. */
const MIT_PUNKTEN = ["EBM", "BEMA", "GOZ", "GOAE"];
export const hatPunkte = (system: string): boolean => MIT_PUNKTEN.includes(system);
/** Hat die Gruppe ein Verzeichnis mit Punkten? Heilmittel, Hebammenhilfe, Pflege, Hilfsmittel, Apotheke und Heilpraktik nicht. */
export const gruppeHatPunkte = (gruppe: string): boolean => systemeFuer(gruppe).some(hatPunkte);

/** Beispiele im Suchfeld des Leistungsverzeichnisses. Ohne Fach kein Beispiel. */
const SUCH_BEISPIEL: Record<string, string> = { zahn: "Füllung oder Krone", arzt: "Sonographie oder 03000", therapie: "Hausbesuch" };
export function suchBeispiel(fach: string | null | undefined): string {
  if (!fach) return "";
  const b = SUCH_BEISPIEL[systemGruppe(fach)];
  return b ? `, z. B. ${b}` : "";
}
