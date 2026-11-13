// Ratgeber-Artikel der öffentlichen Website. Inhalte stehen in den Seiten
// unter app/ratgeber/*; hier nur die Liste für Übersicht, Sitemap und Links.

/** Gruppen der Übersicht, in der Reihenfolge der Anzeige. */
export const RATGEBER_GRUPPEN = [
  {
    id: "alle",
    titel: "Für alle Praxen",
    text: "Kosten ankündigen, Zuzahlungen, Befreiung, versäumte Termine, Privatversicherte: Fragen, die in jeder Praxis am Empfang ankommen.",
    // Abschluss-Kasten und Fußnote im Artikelrahmen (components/ArticlePage.tsx).
    kasten:
      "Sorrida zeigt zuerst die Kassenleistung und dann jede Alternative mit dem Betrag, den der Patient selbst trägt. Die Kosteninformation entsteht in Textform, der Patient bekommt alles als Link aufs Handy.",
    massgeblich:
      "die Gesetze in der aktuellen Fassung, die Vorgaben Ihrer Kammer und Ihrer Kassenärztlichen oder Kassenzahnärztlichen Vereinigung beziehungsweise Ihres Berufsverbands sowie die Krankenkasse",
  },
  {
    id: "arzt",
    titel: "Für Arzt- und Psychotherapiepraxen",
    text: "Selbstzahlerleistungen vereinbaren, GOÄ-Rechnung erklären, Vorsorge auf Kasse, Kostenerstattung, Hilfsmittel.",
    kasten:
      "Anlass auswählen, Sorrida stellt die Kassenleistung und die Selbstzahlerleistung nebeneinander: mit Preis, mit dem Hinweis, wann die Kasse zahlt, und mit einer ehrlichen Angabe zum Nutzen. Der Patient bekommt alles als Link aufs Handy.",
    massgeblich:
      "Gesetz, Bundesmantelvertrag und Gebührenordnung in der aktuellen Fassung, die Richtlinien des Gemeinsamen Bundesausschusses sowie die Vorgaben von KBV, Kassenärztlicher Vereinigung, Kammer und Krankenkasse",
  },
  {
    id: "therapie",
    titel: "Für Therapiepraxen",
    text: "Physiotherapie, Ergotherapie, Logopädie, Podologie: Zuzahlung auf Verordnung und Leistungen für Selbstzahler.",
    kasten:
      "Sorrida zeigt die Behandlung auf Verordnung mit der gesetzlichen Zuzahlung und daneben Ihre Selbstzahlerleistungen nach Ihrer Preisliste. Der Patient bekommt alles als Link aufs Handy.",
    massgeblich:
      "das Gesetz in der aktuellen Fassung, die Heilmittel-Richtlinie des Gemeinsamen Bundesausschusses, die Verträge Ihres Heilmittelbereichs mit dem GKV-Spitzenverband und die Vorgaben der Krankenkasse",
  },
  {
    id: "zahn",
    titel: "Für Zahnarztpraxen",
    text: "Festzuschuss, Heil- und Kostenplan, Mehrkosten, Bonusheft, Härtefall, Zahnreinigung.",
    kasten:
      "Befund anklicken oder diktieren, Sorrida zeigt jede sinnvolle Option mit Eigenanteil, auch im Vergleich 2026 und 2027. Der Patient bekommt alles als Link aufs Handy.",
    massgeblich: "die aktuellen Vorgaben von KZBV, KZV und Krankenkasse",
  },
] as const;

export type RatgeberGruppeId = (typeof RATGEBER_GRUPPEN)[number]["id"];

interface RatgeberArtikel {
  slug: string;
  title: string;
  description: string;
  updated: string;
  gruppe: RatgeberGruppeId;
  /**
   * Fach-Kennungen aus lib/specialties.ts, für die der Artikel besonders passt.
   * Ohne Angabe gilt er für alle Fächer seiner Gruppe.
   */
  faecher?: readonly string[];
}

export const RATGEBER = [
  // Für alle Praxen
  {
    slug: "wirtschaftliche-aufklaerung-630c-bgb",
    title: "Wirtschaftliche Aufklärung nach § 630c Abs. 3 BGB: Kosten vor der Behandlung in Textform nennen",
    description:
      "Wann eine Praxis über Kosten informieren muss, was Textform bedeutet, was in die Information gehört und was passiert, wenn sie fehlt. Mit Formulierung für den Empfang.",
    updated: "2026-11-13",
    gruppe: "alle",
  },
  {
    slug: "zuzahlungen-2027",
    title: "Zuzahlungen 2027: Was sich für Kassenpatienten ab 1. Januar ändert",
    description:
      "Ab 2027 steigen die gesetzlichen Zuzahlungen: Rezept, Heilmittel, Hilfsmittel, Krankenhaus. Die neuen Beträge nach dem Gesetzestext, was gleich bleibt und wie Ihr Team es erklärt.",
    updated: "2026-11-13",
    gruppe: "alle",
  },
  {
    slug: "zuzahlungsbefreiung-belastungsgrenze",
    title: "Zuzahlungsbefreiung: Belastungsgrenze von 2 % und 1 % einfach erklärt",
    description:
      "Wer von Zuzahlungen befreit ist, wie die Belastungsgrenze berechnet wird, was für chronisch Kranke gilt und worauf die Praxis beim Befreiungsausweis achten muss.",
    updated: "2026-11-13",
    gruppe: "alle",
  },
  {
    slug: "ausfallhonorar-versaeumter-termin",
    title: "Ausfallhonorar bei versäumtem Termin: Wann eine Praxis es verlangen kann",
    description:
      "Rechtsgrundlage, Voraussetzungen und Grenzen des Ausfallhonorars für Arzt-, Zahnarzt- und Therapiepraxen. Mit Checkliste für die Terminvereinbarung.",
    updated: "2026-11-13",
    gruppe: "alle",
  },
  {
    slug: "privatpatienten-beihilfe-erstattung",
    title: "Privatpatienten und Beihilfe: Wie Sie die Erstattung am Empfang erklären",
    description:
      "Wer die Rechnung schuldet, wie Beihilfe und private Krankenversicherung zusammenwirken, welche Bemessungssätze der Bund kennt und warum eine Lücke bleiben kann.",
    updated: "2026-11-13",
    gruppe: "alle",
  },

  // Für Arzt- und Psychotherapiepraxen
  {
    slug: "igel-vereinbarung",
    title: "IGeL richtig vereinbaren: schriftliche Vereinbarung vor der Behandlung, Rechnung nach GOÄ",
    description:
      "Was der Bundesmantelvertrag für Selbstzahlerleistungen bei Kassenpatienten verlangt, was in die Vereinbarung gehört und welche Fehler Praxen vermeiden sollten.",
    updated: "2026-11-13",
    gruppe: "arzt",
  },
  {
    slug: "goae-rechnung-erklaeren",
    title: "GOÄ-Rechnung verständlich erklären: Steigerungsfaktor, Begründung, Pflichtangaben",
    description:
      "Wie sich ein Betrag nach GOÄ zusammensetzt, was 2,3-fach bedeutet, wann eine Begründung nötig ist und was auf jeder Rechnung stehen muss.",
    updated: "2026-11-13",
    gruppe: "arzt",
  },
  {
    slug: "vorsorge-kassenleistung-oder-igel",
    title: "Vorsorge: Was die Kasse zahlt und was Selbstzahlerleistung ist",
    description:
      "Check-up, Hautkrebs-Screening und Krebsfrüherkennung auf einen Blick: Alter, Abstände und die häufigsten Selbstzahlerleistungen daneben, mit ehrlicher Einordnung des Nutzens.",
    updated: "2026-11-13",
    gruppe: "arzt",
    faecher: ["hausarzt", "haut", "gyn", "uro", "gastro"],
  },
  {
    slug: "kostenerstattung-psychotherapie",
    title: "Kostenerstattung Psychotherapie nach § 13 Abs. 3 SGB V: Was Privatpraxen Patienten erklären",
    description:
      "Wann die Kasse eine Psychotherapie in der Privatpraxis erstattet, welche Nachweise Patienten brauchen, welche Fristen für die Kasse gelten und was Sie nicht versprechen sollten.",
    updated: "2026-11-13",
    gruppe: "arzt",
    faecher: ["psych"],
  },
  {
    slug: "hilfsmittel-zuzahlung-mehrkosten",
    title: "Hilfsmittel: gesetzliche Zuzahlung und Mehrkosten richtig unterscheiden",
    description:
      "Hörgerät, Einlagen, Brille: was die Kasse zahlt, wie hoch die Zuzahlung 2026 und 2027 ist und warum die Mehrkosten für eine höherwertige Versorgung etwas anderes sind.",
    updated: "2026-11-13",
    gruppe: "arzt",
    faecher: ["hno", "ortho", "augen", "hoerakustik", "optik", "sanitaetshaus"],
  },

  // Für Therapiepraxen
  {
    slug: "heilmittel-zuzahlung",
    title: "Heilmittel-Zuzahlung in Physiotherapie, Ergotherapie, Logopädie und Podologie",
    description:
      "10 % der Kosten plus ein fester Betrag je Verordnung: 10 € bis Ende 2026, 15 € ab 2027. Mit Rechenbeispiel, Befreiung, Quittung und dem Weg, wenn jemand nicht zahlt.",
    updated: "2026-11-13",
    gruppe: "therapie",
  },
  {
    slug: "selbstzahler-physiotherapie",
    title: "Selbstzahlerleistungen in der Physiotherapie: Was ohne Verordnung geht und wie Sie Preise vereinbaren",
    description:
      "Privatrezept, Behandlung ohne Verordnung, Prävention: wo die Grenze zur Heilkunde liegt, wie Preise vereinbart werden und wann Kassen bezuschussen.",
    updated: "2026-11-13",
    gruppe: "therapie",
    faecher: ["physio"],
  },

  // Für Zahnarztpraxen
  {
    slug: "festzuschuss-2027",
    title: "Festzuschuss 2027: Was die Kürzung für Praxis und Patienten bedeutet",
    description:
      "Ab 1. Januar 2027 sinken die Festzuschüsse für Zahnersatz. Was zählt, ist das Bewilligungsdatum des Heil- und Kostenplans. Mit Rechenbeispiel und Checkliste für die Rezeption.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
  {
    slug: "heil-und-kostenplan-verstehen",
    title: "Heil- und Kostenplan verständlich erklären: so finden Patienten ihren Eigenanteil",
    description:
      "Warum Patienten den HKP oft nicht verstehen, welche Zahlen wirklich zählen und wie Sie den Eigenanteil in drei Sätzen erklären.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
  {
    slug: "mehrkostenvereinbarung",
    title: "Mehrkostenvereinbarung bei Füllungen: Regeln nach § 28 SGB V kurz erklärt",
    description:
      "Wann eine Mehrkostenvereinbarung nötig ist, was die Kasse weiter zahlt und welche Fehler Praxen vermeiden sollten.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
  {
    slug: "bonusheft",
    title: "Bonusheft Zahnarzt: Was es beim Zahnersatz bringt und wie Patienten es nicht verlieren",
    description:
      "Wie viel mehr Festzuschuss das Bonusheft bringt, welche Untersuchungen zählen, was bei einer Lücke gilt und wie Ihr Team Patienten daran erinnert.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
  {
    slug: "haertefall-zahnersatz",
    title: "Härtefallregelung beim Zahnersatz: Wer die Regelversorgung ohne Eigenanteil bekommt",
    description:
      "Wer als Härtefall gilt, wie die gleitende Härtefallregelung funktioniert und warum die Kürzung 2027 Härtefälle nicht trifft.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
  {
    slug: "professionelle-zahnreinigung",
    title: "Professionelle Zahnreinigung: Kassenleistung, Privatleistung oder Zuschuss?",
    description:
      "Was die Kasse bei Zahnstein zahlt, was die PZR kostet, welche Kassen bezuschussen und wie Sie es Patienten in zwei Sätzen erklären.",
    updated: "2026-10-31",
    gruppe: "zahn",
  },
] as const satisfies readonly RatgeberArtikel[];

export type RatgeberSlug = (typeof RATGEBER)[number]["slug"];
type Eintrag = (typeof RATGEBER)[number];

export const ratgeber = (slug: RatgeberSlug) => RATGEBER.find((a) => a.slug === slug)!;
export const ratgeberGruppe = (id: RatgeberGruppeId) => RATGEBER_GRUPPEN.find((g) => g.id === id)!;

const faecherVon = (a: Eintrag): readonly string[] | undefined => ("faecher" in a ? a.faecher : undefined);

/** Artikel je Gruppe, in der Reihenfolge der Übersicht. */
export const ratgeberNachGruppen = () =>
  RATGEBER_GRUPPEN.map((g) => ({ gruppe: g, artikel: RATGEBER.filter((a) => a.gruppe === g.id) })).filter((x) => x.artikel.length > 0);

/** „Weitere Ratgeber“ unter einem Artikel: zuerst dieselbe Gruppe, dann „alle Praxen“, dann der Rest. */
export function weitereRatgeber(slug: RatgeberSlug): Eintrag[] {
  const a = ratgeber(slug);
  const rang = (x: Eintrag) => (x.gruppe === a.gruppe ? 0 : x.gruppe === "alle" ? 1 : 2);
  return RATGEBER.filter((x) => x.slug !== slug)
    .map((x, i) => ({ x, i }))
    .sort((p, q) => rang(p.x) - rang(q.x) || p.i - q.i)
    .map((p) => p.x);
}

/**
 * Passende Artikel für eine Fachseite: zuerst die ausdrücklich dem Fach zugeordneten,
 * dann die allgemeinen der Gruppe, dann „alle Praxen“. `gruppe` ist null bei Fächern,
 * die zu keiner Ratgeber-Gruppe gehören (z. B. Versorger).
 */
export function ratgeberFuerFach(fachId: string, gruppe: Exclude<RatgeberGruppeId, "alle"> | null, max = 5): Eintrag[] {
  const rang = (x: Eintrag): number | null => {
    const f = faecherVon(x);
    if (f) return f.includes(fachId) ? 0 : null;
    if (x.gruppe === gruppe) return 1;
    if (x.gruppe === "alle") return 2;
    return null;
  };
  return RATGEBER.map((x, i) => ({ x, i, r: rang(x) }))
    .filter((p): p is { x: Eintrag; i: number; r: number } => p.r !== null)
    .sort((p, q) => p.r - q.r || p.i - q.i)
    .slice(0, max)
    .map((p) => p.x);
}
