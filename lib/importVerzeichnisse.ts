import { systemGruppe } from "@/lib/fachprofile";
import { rechnetUeberKv } from "@/lib/abrechnungsarten";

// Verzeichnisse, in die eine Praxis eine eigene Leistungsliste (CSV) importieren kann: nur die, nach denen ihr Fach
// abrechnet. Erster Eintrag ist die Vorauswahl. Die Kennungen entsprechen dem Schema von /api/catalog-items/import.

const NAMEN: Record<string, string> = {
  EBM: "Kasse (EBM, regionale KV-Ziffern)",
  SONSTIGES: "Sonder- und Selektivverträge",
  GOAE: "GOÄ (privat)",
  UVGOAE: "UV-GOÄ (Berufsgenossenschaft)",
  BEMA: "BEMA",
  GOZ: "GOZ",
  HEILMITTEL: "Heilmittel",
  HEBAMME: "Hebammenhilfe",
  PFLEGE: "Pflege",
  HILFSMITTEL: "Hilfsmittel",
  APO: "Apotheke",
  SELBST: "Selbstzahler",
};

const JE_GRUPPE: Record<string, string[]> = {
  zahn: ["BEMA", "GOZ", "SONSTIGES", "SELBST"],
  therapie: ["HEILMITTEL", "SONSTIGES", "SELBST"],
  hebamme: ["HEBAMME", "SONSTIGES", "SELBST"],
  pflege: ["PFLEGE", "SONSTIGES", "SELBST"],
  versorgung: ["HILFSMITTEL", "SONSTIGES", "SELBST"],
  apotheke: ["APO", "HILFSMITTEL", "SONSTIGES", "SELBST"],
  selbst: ["SELBST", "SONSTIGES"],
  arzt: ["EBM", "SONSTIGES", "GOAE", "UVGOAE", "SELBST"],
};

export interface ImportVorgaben {
  verzeichnisse: [string, string][];
  /** Regionale KV-Ziffern sind ein Thema (Vertragsarzt mit EBM). */
  kv: boolean;
  kategorie: string;
}

export function importVorgaben(fach: string | null | undefined): ImportVorgaben {
  const kv = rechnetUeberKv(fach);
  const ids = (JE_GRUPPE[systemGruppe(fach)] ?? JE_GRUPPE.arzt).filter((id) => kv || id !== "EBM");
  return { verzeichnisse: ids.map((id) => [id, kv && id === "SONSTIGES" ? `${NAMEN[id]} (HZV, DMP …)` : NAMEN[id]]), kv, kategorie: kv ? "Regionale KV-Ziffern" : "Eigene Liste" };
}
