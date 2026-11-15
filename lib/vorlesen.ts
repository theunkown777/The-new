import { money, typeLabelOf, type PatientFactors, type ProposalItem } from "@/lib/proposals";
import { euro, uebersetzung, type PatientLang, type Ui } from "@/lib/patientI18n";

// Vorlesen in der Patientenansicht: Der Text entsteht hier als reine Funktion, gesprochen wird im Browser mit
// window.speechSynthesis (auf dem Gerät des Patienten; es wird nichts übertragen). Vorgelesen werden Überschrift,
// je Position Titel und Möglichkeiten mit Eigenanteil und am Ende die Summe der aktuellen Auswahl.

/** Sprachkennung für die Stimme des Browsers. */
export const SPRECH_SPRACHE: Record<PatientLang, string> = { de: "de-DE", en: "en-GB", tr: "tr-TR", uk: "uk-UA", ru: "ru-RU", pl: "pl-PL", ar: "ar-SA" };

export type VorleseTeil = { text: string; lang: PatientLang };

/** Unsichtbare Zeichen für die Schreibrichtung stören manche Stimmen. */
const sauber = (s: string) => s.replace(/[⁦-⁩‎‏]/g, "").replace(/\s+/g, " ").trim();
const satz = (s: string) => (/[.!?:]$/.test(s) ? s : `${s}.`);

export function vorleseTeile(a: {
  ueberschrift: string;
  items: ProposalItem[];
  patient: PatientFactors;
  /** Aktuelle Auswahl in der Ansicht (Position → Option). */
  choices: Record<string, string>;
  summe: number;
  lang: PatientLang;
  t: Pick<Ui, "yourShare" | "yourChoice" | "coPayment" | "barLabel">;
}): VorleseTeil[] {
  const out: VorleseTeil[] = [];
  const sag = (text: string, lang: PatientLang) => {
    const s = sauber(text);
    if (s) out.push({ text: satz(s), lang });
  };
  // Was es nur auf Deutsch gibt, wird mit deutscher Stimme gelesen.
  const regel = (text: string) => {
    const u = uebersetzung(text, a.lang);
    sag(u.text, u.stand === "deutsch" ? "de" : a.lang);
  };
  sag(a.ueberschrift, a.lang);
  for (const item of a.items) {
    if (!item.options.length) continue;
    regel(item.title);
    for (const o of item.options) {
      regel(o.name);
      regel(typeLabelOf(o, a.patient.insurance));
      const ohnePreis = o.type === "kasse" && o.total === 0 && !!o.zuzahlung;
      sag(ohnePreis ? a.t.coPayment : `${a.t.yourShare}: ${euro(money(o, a.patient).netto, a.lang)}`, a.lang);
      if (a.choices[item.key] === o.id) sag(a.t.yourChoice, a.lang);
    }
  }
  sag(`${a.t.barLabel}: ${euro(a.summe, a.lang)}`, a.lang);
  return out;
}

/** Der ganze Vorlesetext als ein Stück (für Tests und zum Nachlesen). */
export const vorleseText = (a: Parameters<typeof vorleseTeile>[0]) => vorleseTeile(a).map((x) => x.text).join(" ");
