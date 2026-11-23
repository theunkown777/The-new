import { systemGruppe } from "@/lib/fachprofile";
import { hatEbm, hatKvZiffern, reihenfolge } from "@/lib/amtlich/gliederung";
import { systemeFuer } from "@/lib/katalogBeispiele";

// Verzeichnisse, in die eine Praxis eine eigene Leistungsliste (CSV) importieren kann: dieselben wie im eigenen
// Katalog des Fachs (SYSTEME_JE_GRUPPE in lib/katalogBeispiele.ts), EBM nur, wo das Fach den EBM hat
// (lib/amtlich/gliederung.ts). Erster Eintrag ist die Vorauswahl. Die Kennungen entsprechen dem Schema von
// /api/catalog-items/import.

const NAMEN: Record<string, string> = {
  EBM: "Kasse (EBM, regionale KV-Ziffern)",
  GOAE: "GOÄ (privat)",
  UVGOAE: "UV-GOÄ (Berufsgenossenschaft)",
  BEMA: "BEMA",
  GOZ: "GOZ",
  BEL_II: "BEL II",
  HEILMITTEL: "Heilmittel",
  HEBAMME: "Hebammenhilfe",
  PFLEGE: "Pflege",
  HILFSMITTEL: "Hilfsmittel",
  APO: "Apotheke",
  SELBST: "Selbstzahler",
};

/** Gruppen mit Verträgen der Kassen, in denen es Sonder- und Selektivverträge gibt. Sonst heißt der Eintrag „Eigene Liste“. */
const MIT_KASSENVERTRAG = new Set(["zahn", "arzt", "therapie", "hebamme", "pflege"]);

export interface ImportVorgaben {
  verzeichnisse: [string, string][];
  /** Regionale KV-Ziffern sind ein Thema (das Fach hat KV-Ziffern, lib/amtlich/gliederung.ts). */
  kv: boolean;
  /** Vorgabe für das Feld „Kategorie“ der importierten Positionen. */
  kategorie: string;
  /** Gibt es Verträge mit Kassen (Sonder- und Selektivverträge)? Sonst nur „Eigene Liste“. */
  vertraege: boolean;
  /** Beispielzeile im Eingabefeld; „Impfleistung“ nur hausärztlich und in der Kinderheilkunde. */
  beispiel: string;
}

const mitVertraegen = (fach: string | null | undefined, gruppe: string) => MIT_KASSENVERTRAG.has(gruppe) && (gruppe !== "arzt" || hatEbm(fach));

function sonstigesName(fach: string | null | undefined, gruppe: string): string {
  if (!mitVertraegen(fach, gruppe)) return "Eigene Liste";
  return fach === "hausarzt" ? "Sonder- und Selektivverträge (HZV, DMP …)" : "Sonder- und Selektivverträge";
}

export function importVorgaben(fach: string | null | undefined): ImportVorgaben {
  const gruppe = systemGruppe(fach);
  const kv = hatKvZiffern(fach);
  const ebm = hatEbm(fach);
  // Vorauswahl wie im Leistungsverzeichnis: das wichtigste Verzeichnis des Fachs zuerst (Zahn BEMA, Ärzte EBM).
  const rang = (id: string) => { const i = reihenfolge(fach || "andere").indexOf(id); return i < 0 ? 99 : i; };
  const ids = systemeFuer(gruppe).filter((id) => ebm || id !== "EBM").sort((a, b) => rang(a) - rang(b));
  return {
    verzeichnisse: ids.map((id) => [id, id === "SONSTIGES" ? sonstigesName(fach, gruppe) : NAMEN[id] ?? id]),
    kv,
    kategorie: kv ? "Regionale KV-Ziffern" : "Eigene Liste",
    vertraege: mitVertraegen(fach, gruppe),
    beispiel: kv
      ? `99001;Beispiel: regionale ${fach === "hausarzt" || fach === "kinder" ? "Impfleistung" : "Leistung"};10,50`
      : "1001;Beispiel: eigene Leistung;10,50",
  };
}
