// Öffentliche Rechner der Website. Sie rechnen mit denselben Regeln wie die Vorschläge in der App.
// Alle Ergebnisse sind unverbindliche Orientierung; verbindlich sind Heil- und Kostenplan, Verordnung und Bescheid der Kasse.
import { FESTZUSCHUSS_BEFUNDE, FESTZUSCHUSS_SAETZE, heilmittelZuzahlung, hilfsmittelZuzahlung } from "@/lib/proposals";
import { SPANNEN, WERKE, betragCent, pruefeFaktor, type GoaeGruppe } from "@/lib/gebuehren";

const cent = (n: number) => Math.round(n * 100) / 100;
const VOR = new Date("2026-12-01T12:00:00Z");
const NACH = new Date("2027-01-15T12:00:00Z");

export type ZuzahlungArt = "heilmittel" | "hilfsmittel" | "arznei";
export const ZUZAHLUNG_ARTEN: Record<ZuzahlungArt, { name: string; beispiel: string; regel2026: string; regel2027: string }> = {
  heilmittel: { name: "Heilmittel", beispiel: "z. B. Krankengymnastik, Ergotherapie, Logopädie", regel2026: "10 % der Kosten plus 10 € je Verordnung", regel2027: "10 % der Kosten plus 15 € je Verordnung" },
  hilfsmittel: { name: "Hilfsmittel", beispiel: "z. B. Bandage, Einlagen, Gehhilfe", regel2026: "10 % des Preises, mindestens 5 €, höchstens 10 €", regel2027: "10 % des Preises, mindestens 7,50 €, höchstens 15 €" },
  arznei: { name: "Arzneimittel auf Rezept", beispiel: "je Packung", regel2026: "10 % des Preises, mindestens 5 €, höchstens 10 €", regel2027: "10 % des Preises, mindestens 7,50 €, höchstens 15 €" },
};

/** Gesetzliche Zuzahlung bis 31.12.2026 und ab 1.1.2027 (§ 61 SGB V in alter und neuer Fassung). */
export function zuzahlungVergleich(art: ZuzahlungArt, kosten: number): { bis2026: number; ab2027: number; mehr: number } {
  const k = Number.isFinite(kosten) && kosten > 0 ? kosten : 0;
  const f = art === "heilmittel" ? heilmittelZuzahlung : hilfsmittelZuzahlung;
  const bis2026 = k ? cent(f(k, VOR)) : 0;
  const ab2027 = k ? cent(f(k, NACH)) : 0;
  return { bis2026, ab2027, mehr: cent(ab2027 - bis2026) };
}

/** Belastungsgrenze nach § 62 SGB V: 2 % der jährlichen Bruttoeinnahmen, 1 % bei schwerwiegender chronischer Erkrankung. Ohne Freibeträge für Angehörige. */
export function belastungsgrenze(jahresbrutto: number, chronisch: boolean): number {
  const b = Number.isFinite(jahresbrutto) && jahresbrutto > 0 ? jahresbrutto : 0;
  return cent(b * (chronisch ? 0.01 : 0.02));
}

export type Bonus = 0 | 5 | 10;
/** Befunde, die der Rechner anbietet (häufige Fälle). */
export const RECHNER_BEFUNDE = ["1.1", "1.2", "2.1", "2.2", "2.3"].filter((b) => b in FESTZUSCHUSS_BEFUNDE);

/**
 * Festzuschuss der Kasse für Zahnersatz bei Bewilligung bis 31.12.2026 und ab 1.1.2027.
 * Die Euro-Beträge je Befund für 2027 sind noch nicht veröffentlicht; gerechnet wird mit den Beträgen 2026
 * und den neuen Sätzen. Das Ergebnis für 2027 ist deshalb „voraussichtlich“.
 */
export function festzuschussVergleich(befund: string, bonus: Bonus, haertefall: boolean, kosten?: number) {
  const basis = FESTZUSCHUSS_BEFUNDE[befund]?.euro ?? 0;
  const zuschuss = (jahr: 2026 | 2027) => cent(basis * (haertefall ? 1 : FESTZUSCHUSS_SAETZE[jahr][bonus]));
  const z26 = zuschuss(2026);
  const z27 = zuschuss(2027);
  // Ohne Angabe der Kosten: Regelversorgung, deren Durchschnittskosten dem 100-%-Betrag entsprechen.
  const gesamt = Number.isFinite(kosten) && (kosten as number) > 0 ? (kosten as number) : basis;
  const eigen = (z: number) => cent(Math.max(0, gesamt - z));
  return { regelversorgung: basis, gesamt: cent(gesamt), zuschuss2026: z26, zuschuss2027: z27, eigen2026: eigen(z26), eigen2027: eigen(z27), mehr: cent(eigen(z27) - eigen(z26)), satz2026: haertefall ? 1 : FESTZUSCHUSS_SAETZE[2026][bonus], satz2027: haertefall ? 1 : FESTZUSCHUSS_SAETZE[2027][bonus] };
}

/** Betrag einer Rechnungsposition nach GOÄ oder GOZ mit Einordnung des Faktors. */
export function gebuehrPosition(werk: "GOAE" | "GOZ", punkte: number, faktor: number, gruppe: GoaeGruppe = "persoenlich") {
  const p = Number.isFinite(punkte) && punkte > 0 ? punkte : 0;
  const f = Number.isFinite(faktor) && faktor > 0 ? faktor : 0;
  const s = werk === "GOZ" ? SPANNEN.GOZ : SPANNEN[`GOAE_${gruppe}` as const];
  return {
    einfach: betragCent({ werk, punkte: p, faktor: 1 }) / 100,
    betrag: betragCent({ werk, punkte: p, faktor: f }) / 100,
    schwelle: s.schwelle,
    hoechst: s.hoechst,
    beiSchwelle: betragCent({ werk, punkte: p, faktor: s.schwelle }) / 100,
    pruefung: pruefeFaktor(werk, f, gruppe),
    punktwertCent: WERKE[werk].punktwertCent ?? 0,
  };
}
