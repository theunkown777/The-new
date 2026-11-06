// GOZ-Punktwert ist bundeseinheitlich gesetzlich fixiert (§5 GOZ-Anlage) und
// gilt seit der GOZ-Reform 2012 unverändert: 5,62421 Cent je Punkt. Wird bei
// Neuanlage einer Praxis vorbelegt (siehe app/api/register/route.ts).
export const STANDARD_GOZ_PUNKTWERT_CENT = 5.62421;

export interface BillingRules {
  system: string;
  punktzahl: number | null;
  festbetragCent: number | null;
}

export interface PracticePunktwerte {
  gozPunktwertCent: number | null;
  bemaPunktwertCent: number | null;
}

/**
 * Schätzt den Rechnungsbetrag (in Cent) einer Position aus Punktzahl ×
 * Punktwert × Faktor (GOZ/GOÄ) bzw. Punktzahl × Punktwert (BEMA, kein
 * Steigerungsfaktor vorgesehen) bzw. dem hinterlegten Festbetrag
 * (BEMA/BEL-II-Pauschale). Gibt null zurück, wenn die nötigen Werte (noch)
 * nicht hinterlegt sind - es wird nichts geraten.
 *
 * Das ist eine Schätzung zur Orientierung, keine verbindliche Rechnung.
 */
export function estimateAmountCent(
  item: BillingRules,
  faktor: number | null | undefined,
  quantity: number,
  practice: PracticePunktwerte
): number | null {
  if (item.festbetragCent != null) {
    return item.festbetragCent * quantity;
  }

  if (item.punktzahl == null) return null;

  if ((item.system === "GOZ" || item.system === "GOAE") && practice.gozPunktwertCent != null) {
    const effectiveFaktor = faktor ?? 1;
    return Math.round(item.punktzahl * practice.gozPunktwertCent * effectiveFaktor * quantity);
  }

  if (item.system === "BEMA" && practice.bemaPunktwertCent != null) {
    return Math.round(item.punktzahl * practice.bemaPunktwertCent * quantity);
  }

  return null;
}

export type KassenLabel = {
  text: string;
  tone: "gkv" | "privat" | "labor" | "neutral";
};

/**
 * Rein informative Einordnung, unter welches Abrechnungssystem eine
 * Position fällt - keine Empfehlung und keine Optimierung, nur Transparenz
 * darüber, was GKV-Kassenleistung vs. privat zusatzberechenbar ist. Die
 * fachliche Entscheidung, ob/was angeboten wird, bleibt beim Behandler.
 */
export function kassenLabel(system: string): KassenLabel {
  switch (system) {
    case "BEMA":
    case "EBM":
      return { text: "GKV-Leistung", tone: "gkv" };
    case "HEILMITTEL":
      return { text: "Heilmittel auf Verordnung", tone: "gkv" };
    case "PFLEGE":
      return { text: "Pflegekasse / Krankenkasse", tone: "gkv" };
    case "HEBAMME":
      return { text: "Hebammenhilfe (Kasse)", tone: "gkv" };
    case "APO":
      return { text: "Apothekenleistung", tone: "neutral" };
    case "HILFSMITTEL":
      return { text: "Hilfsmittel (Kasse mit Zuzahlung/Mehrkosten)", tone: "gkv" };
    case "UVGOAE":
      return { text: "Berufsgenossenschaft", tone: "gkv" };
    case "SELBST":
      return { text: "Selbstzahler", tone: "privat" };
    case "GOZ":
    case "GOAE":
      return { text: "Privatleistung / IGEL", tone: "privat" };
    case "BEL_II":
      return { text: "Laborkosten (Festzuschuss-System)", tone: "labor" };
    default:
      return { text: "Keine separate Abrechnung", tone: "neutral" };
  }
}
