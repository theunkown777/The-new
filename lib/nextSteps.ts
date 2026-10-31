// Was nach dem Abschluss einer Behandlung noch zu tun ist, abgeleitet aus
// dem Behandlungsvorschlag. Ziel: Behandler und Rezeption müssen nicht selbst
// überlegen, welche Formulare, Anträge und Termine aus dem Befund folgen -
// die Liste entsteht automatisch und wird nur noch abgehakt.
//
// Die Wahl des Patienten ist beim Abschluss meist noch offen; Schritte zu
// Vereinbarungen beziehen sich deshalb auf die empfohlene bzw. bereits
// gewählte Option und sagen das auch.

import {
  chosenOption,
  formatEuro,
  isZahnersatz,
  money,
  showsJahresvergleich,
  tageBisStichtag,
  type PatientFactors,
  type ProposalItem,
} from "@/lib/proposals";
import { isTherapie, specialty } from "@/lib/specialties";

export type StepOwner = "Rezeption" | "Behandler";

export interface NextStep {
  id: string;
  owner: StepOwner;
  text: string;
  /** Zusatzinfo, z. B. Frist oder Betrag. */
  detail?: string;
  /** Hervorheben (Frist, Geld). */
  urgent?: boolean;
}

export function buildNextSteps(args: {
  items: ProposalItem[];
  choices: Record<string, string>;
  patient: PatientFactors;
  reportFinal: boolean;
  hasProposal: boolean;
  today?: Date;
  /** Fachgebiet: Therapiepraxen vereinbaren Selbstzahlerleistungen privat, nicht als IGeL. */
  fach?: string;
}): NextStep[] {
  const { items, choices, patient, reportFinal, hasProposal } = args;
  const today = args.today ?? new Date();
  const steps: NextStep[] = [];
  const gkv = patient.insurance === "GKV";

  if (!reportFinal) {
    steps.push({ id: "bericht", owner: "Behandler", text: "KI-Bericht lesen und freigeben" });
  }
  if (hasProposal && items.some((i) => i.options.length > 0)) {
    steps.push({
      id: "schreiben",
      owner: "Rezeption",
      text: "Patienten-Link per QR-Code oder SMS mitgeben, alternativ Patientenschreiben ausdrucken",
      detail: "Wirtschaftliche Aufklärung in Textform nach § 630c Abs. 3 BGB",
    });
  }

  const zeWhere: string[] = [];
  let zeMehrkosten2027 = 0;
  const mehrkosten: string[] = [];
  const privat: string[] = [];
  const igel: string[] = [];
  const termine: string[] = [];

  for (const item of items) {
    const o = chosenOption(item, choices);
    if (!o) continue;
    const label = `${item.where}: ${o.name}`;
    if (isZahnersatz(o)) {
      zeWhere.push(label);
      if (gkv && !patient.haertefall) {
        zeMehrkosten2027 += money(o, patient, 2027).netto - money(o, patient, 2026).netto;
      }
    } else if (o.type === "mehrkosten") {
      mehrkosten.push(label);
    } else if (o.type === "privat" || o.type === "privatzusatz") {
      privat.push(label);
    } else if (o.type === "igel") {
      igel.push(label);
    }

    if (o.id === "par") {
      steps.push({ id: "par", owner: "Rezeption", text: "PAR-Antrag bei der Krankenkasse stellen", detail: "Vorbehandlung und Termine für die Parodontitis-Therapie planen" });
    } else if (o.id === "pzr") {
      termine.push("Professionelle Zahnreinigung");
    } else if (o.id === "schiene") {
      termine.push("Abdruck für Aufbissschiene");
    } else if (o.id === "fv") {
      termine.push(`Fissurenversiegelung (${item.where})`);
    } else if (!isZahnersatz(o) && item.where !== "Allgemein") {
      termine.push(`${item.where}: ${o.name}`);
    }
  }

  if (zeWhere.length) {
    const frist = gkv && showsJahresvergleich(today) && !patient.haertefall;
    steps.push({
      id: "hkp",
      owner: "Rezeption",
      text: gkv
        ? "Heil- und Kostenplan in der Praxissoftware anlegen und bei der Kasse einreichen"
        : "Kostenvoranschlag für die private Versicherung erstellen",
      detail: zeWhere.join(" · "),
      urgent: frist,
    });
    if (frist && zeMehrkosten2027 > 0.5) {
      const tage = tageBisStichtag(today);
      steps.push({
        id: "frist2027",
        owner: "Rezeption",
        text: `HKP bis 31.12.2026 bewilligen lassen (noch ${tage} ${tage === 1 ? "Tag" : "Tage"})`,
        detail: `Bei Bewilligung ab 1.1.2027 zahlt der Patient ca. ${formatEuro(zeMehrkosten2027)} mehr.`,
        urgent: true,
      });
    }
  }
  if (mehrkosten.length) {
    steps.push({
      id: "mkv",
      owner: "Rezeption",
      text: "Mehrkostenvereinbarung (§ 28 Abs. 2 SGB V) vor der Behandlung unterschreiben lassen",
      detail: mehrkosten.join(" · ") + " – falls der Patient diese Option wählt",
    });
  }
  if (privat.length) {
    steps.push({
      id: "privat",
      owner: "Rezeption",
      text: "Private Vereinbarung bzw. Kostenvoranschlag vor der Behandlung unterschreiben lassen",
      detail: privat.join(" · ") + " – falls der Patient diese Option wählt",
    });
  }
  if (igel.length) {
    const therapie = isTherapie(specialty(args.fach));
    steps.push({
      id: "igel",
      owner: "Rezeption",
      text: therapie
        ? "Privatvereinbarung über Selbstzahlerleistungen vor der Behandlung unterschreiben lassen"
        : "Schriftliche Vereinbarung über Selbstzahlerleistungen (IGeL) vor der Leistung unterschreiben lassen",
      detail: therapie
        ? igel.join(" · ") + " – falls der Patient diese Leistung wählt; Preis nach Praxispreisliste, Bedenkzeit lassen"
        : igel.join(" · ") + " – falls der Patient diese Leistung wählt; Kosten nach GOÄ, ausreichende Bedenkzeit (§ 18 Abs. 8 BMV-Ä)",
    });
  }
  if (items.some((i) => chosenOption(i, choices)?.zuzahlung) && gkv && (patient.age == null || patient.age >= 18)) {
    steps.push({ id: "zuzahlung", owner: "Rezeption", text: "Gesetzliche Zuzahlung kassieren oder Befreiungsbescheid prüfen", detail: "10 % der Kosten plus 10 € je Verordnung" });
  }
  if (termine.length) {
    steps.push({ id: "termine", owner: "Rezeption", text: "Folgetermine vereinbaren", detail: termine.join(" · ") });
  }
  return steps;
}
