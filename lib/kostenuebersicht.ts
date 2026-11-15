import { ABGEWAEHLT, formatEuro, istFreiwillig, money, typeLabelOf, type PatientFactors, type ProposalItem, type ProposalOption } from "@/lib/proposals";
import { UI, empfehlungJe } from "@/lib/patientI18n";
import type { Stammdaten } from "@/lib/praxisStammdaten";

// Kostenübersicht als PDF für die Patientin oder den Patienten (Knopf „Als PDF speichern“ in der Patientenansicht).
// Der Inhalt entspricht dem, was die Ansicht zeigt: alle Möglichkeiten je Position mit Art, Kassenanteil und Eigenanteil.
// Bewusst NICHT enthalten: Geburtsdatum, Versichertennummer, Nachname, Nachricht des Patienten, Zahlen der Praxis
// (Mehrumsatz, Volumen) und Raten. Die Software hebt nichts hervor: markiert ist nur, was der Patient gesendet
// oder die Praxis ausdrücklich vorgemerkt hat; ohne beides rechnet die Summe mit der Kassen- bzw. Regelleistung.

export const KOSTEN_EINREICHEN = "Zum Einreichen bei Zusatzversicherung oder Beihilfe geeignet; maßgeblich sind Heil- und Kostenplan bzw. Rechnung.";

export interface KostenOption {
  name: string;
  art: string;
  /** Gesamtbetrag der Leistung; leer, wenn kein Preis hinterlegt ist (Kassenleistung auf Verordnung). */
  gesamt: string;
  /** „Kasse ca. 120 €“ bzw. „Versicherung ca. …“; leer, wenn nichts übernommen wird. */
  kasse: string;
  /** Erstattung der Zusatzversicherung (geschätzt); leer ohne Zusatzversicherung. */
  zusatz: string;
  eigen: string;
  /** „Ihre Wahl“, „von Ihrer Praxis vorgemerkt“ oder leer. */
  markierung: string;
}
export interface KostenPosition {
  wo: string;
  titel: string;
  optionen: KostenOption[];
  /** Freiwillige Leistung, die der Patient ausdrücklich nicht möchte. */
  abgewaehlt: boolean;
}
export interface Kostenuebersicht {
  praxis: string;
  /** Anschrift und Telefon der Praxis, soweit hinterlegt. */
  praxisZeilen: string[];
  datum: string;
  /** Woher die Markierungen und die Summe stammen. */
  grundlage: "patient" | "praxis" | "kasse";
  positionen: KostenPosition[];
  summeText: string;
  summe: string;
  kasseText: string;
  kasseSumme: string;
  hinweis: string;
  einreichen: string;
}

const TZ = "Europe/Berlin";

/** Der Hinweistext der Ansicht ohne den Satz zur Laufzeit des Links (im gespeicherten PDF ohne Bedeutung). */
export function hinweisText(o: { gkv: boolean; dental: boolean; therapie: boolean }): string {
  const t = UI.de;
  const roh = !o.dental ? (o.therapie ? t.fineTherapie("x") : t.fineMed("x")) : t.fine(o.gkv, "x");
  return roh.replace(/\s*Dieser Link ist gültig bis x\./, "").trim();
}

export function kostenuebersicht(a: {
  praxis: string;
  stammdaten?: Stammdaten | null;
  items: ProposalItem[];
  patient: PatientFactors;
  /** Was die Praxis im Editor gespeichert hat (TreatmentProposal.choices). */
  praxisWahl: Record<string, string>;
  /** Gesendete Auswahl des Patienten; null, solange nichts gesendet wurde. */
  patientWahl: Record<string, string> | null;
  dental: boolean;
  therapie: boolean;
  now?: Date;
}): Kostenuebersicht {
  const items = a.items.filter((i) => i.options.length > 0);
  const gkv = a.patient.insurance === "GKV";
  const vorgemerkt = empfehlungJe(items, a.praxisWahl);
  const gesendet = a.patientWahl && Object.keys(a.patientWahl).length > 0 ? a.patientWahl : null;
  const grundlage: Kostenuebersicht["grundlage"] = gesendet ? "patient" : Object.keys(vorgemerkt).length ? "praxis" : "kasse";

  // Womit die Summe rechnet: Wahl des Patienten; sonst Vormerkung der Praxis; sonst die erste Option (Kassen- bzw. Regelleistung).
  // Freiwillige Selbstzahlerleistungen zählen nur, wenn sie ausdrücklich gewählt oder vorgemerkt sind.
  const gerechnet = (i: ProposalItem): ProposalOption | null => {
    if (gesendet) return i.options.find((o) => o.id === gesendet[i.key]) ?? null;
    const v = i.options.find((o) => o.id === vorgemerkt[i.key]);
    if (v) return v;
    return istFreiwillig(i) ? null : i.options[0];
  };

  let summe = 0, kasseSumme = 0;
  const positionen = items.map((i) => {
    const g = gerechnet(i);
    if (g) {
      const m = money(g, a.patient);
      summe += m.netto;
      kasseSumme += m.kasse + m.erstattet;
    }
    return {
      wo: i.where,
      titel: i.title,
      abgewaehlt: gesendet?.[i.key] === ABGEWAEHLT,
      optionen: i.options.map((o) => {
        const m = money(o, a.patient);
        const ohnePreis = o.type === "kasse" && o.total === 0 && !!o.zuzahlung;
        return {
          name: o.name,
          art: typeLabelOf(o, a.patient.insurance),
          gesamt: ohnePreis ? "" : formatEuro(m.total),
          kasse: !ohnePreis && m.kasse > 0 ? `${gkv ? "Kasse" : "Versicherung"} ca. ${formatEuro(m.kasse)}` : "",
          zusatz: !ohnePreis && m.erstattet > 0 ? `Zusatzversicherung ca. ${formatEuro(m.erstattet)}` : "",
          eigen: ohnePreis ? "gesetzliche Zuzahlung" : `ca. ${formatEuro(m.netto)}`,
          markierung: gesendet ? (gesendet[i.key] === o.id ? "Ihre Wahl" : "") : vorgemerkt[i.key] === o.id ? "von Ihrer Praxis vorgemerkt" : "",
        };
      }),
    };
  });

  return {
    praxis: a.praxis,
    praxisZeilen: a.stammdaten ? [a.stammdaten.strasse, a.stammdaten.plzOrt, a.stammdaten.telefon ? `Telefon ${a.stammdaten.telefon}` : ""].map((x) => x.trim()).filter(Boolean) : [],
    datum: (a.now ?? new Date()).toLocaleDateString("de-DE", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }),
    grundlage,
    positionen,
    summeText:
      grundlage === "patient"
        ? "Ihr Eigenanteil für Ihre gesendete Wahl"
        : grundlage === "praxis"
          ? "Ihr Eigenanteil nach Vormerkung Ihrer Praxis; wo nichts vorgemerkt ist, mit der Kassen- bzw. Regelleistung gerechnet"
          : `Ihr Eigenanteil mit der ${gkv ? "Kassen- bzw. Regelleistung" : "jeweils ersten Möglichkeit"} gerechnet (noch keine Wahl gesendet)`,
    summe: `ca. ${formatEuro(summe)}`,
    kasseText: gkv ? "Das übernimmt Ihre Kasse voraussichtlich" : "Das erstattet Ihre Versicherung voraussichtlich",
    kasseSumme: `ca. ${formatEuro(kasseSumme)}`,
    hinweis: hinweisText({ gkv, dental: a.dental, therapie: a.therapie }),
    einreichen: KOSTEN_EINREICHEN,
  };
}
