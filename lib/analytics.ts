import { chosenOption, money, typeLabelOf, type PatientFactors, type ProposalItem, type ProposalOption } from "@/lib/proposals";

// Praxis-Analyse: Womit verdient die Praxis ihr Geld, warum nehmen Patienten
// an oder lehnen ab, und wo liegen Risiken? Reine Funktionen ohne
// Datenbank, damit sie testbar bleiben. Grundlage sind die Vorschläge der
// Praxis (gewählte Option je Befund/Anlass) und ihre Rechnungen.

export const MIN_GROUP = 5;
const DAY = 24 * 60 * 60 * 1000;

/** Eine gewählte Leistung in einem Vorschlag. */
export interface Row {
  proposalId: string;
  status: string;
  createdAt: Date;
  leistung: string;
  thema: string;
  art: string;
  type: ProposalOption["type"];
  /** Euro, die die Kasse trägt (GKV). */
  kasse: number;
  /** Euro, die die Praxis privat abrechnet (Eigenanteil, IGeL, PKV). */
  privat: number;
  unbelegt: boolean;
}

export interface ProposalFacts {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  patient: PatientFactors;
  linked: boolean;
  viewed: boolean;
  responded: boolean;
  wantsInstallments: boolean;
  shareCreatedAt: Date | null;
  patientRespondedAt: Date | null;
  dental: boolean;
}

export interface InvoiceFacts {
  status: string;
  amountCent: number;
  dueDate: Date;
}

const UNBELEGT = /nicht (sicher )?belegt|kein (zusatz)?nutzen belegt|nicht geklärt|umstritten|kein medizinischer nutzen|nicht notwendig/i;

/** Gewählte Optionen eines Vorschlags in Analysezeilen umwandeln. */
export function rowsOf(p: Pick<ProposalFacts, "id" | "status" | "createdAt" | "patient">, items: ProposalItem[], choices: Record<string, string>): Row[] {
  return items.flatMap((item) => {
    const o = chosenOption(item, choices);
    if (!o) return [];
    const m = money(o, p.patient);
    const privat = p.patient.insurance === "PKV" ? o.total : m.eigen;
    return [
      {
        proposalId: p.id,
        status: p.status,
        createdAt: p.createdAt,
        leistung: o.name,
        thema: item.title,
        art: typeLabelOf(o, p.patient.insurance),
        type: o.type,
        kasse: Math.max(0, o.total - privat),
        privat,
        unbelegt: !!o.nutzen && UNBELEGT.test(o.nutzen),
      },
    ];
  });
}

export interface Group {
  name: string;
  umsatz: number;
  privat: number;
  kasse: number;
  angenommen: number;
  entschieden: number;
  /** Annahmequote in Prozent, null bei zu wenigen Entscheidungen. */
  quote: number | null;
  anteil: number;
}

const rate = (acc: number, dec: number) => (dec >= MIN_GROUP ? Math.round((acc / dec) * 100) : null);
const decided = (s: string) => s === "ANGENOMMEN" || s === "ABGELEHNT";

function groupBy(rows: Row[], key: (r: Row) => string): Group[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
  const accepted = rows.filter((r) => r.status === "ANGENOMMEN");
  const totalPrivat = accepted.reduce((s, r) => s + r.privat, 0);
  const totalUmsatz = accepted.reduce((s, r) => s + r.privat + r.kasse, 0);
  return [...map.entries()]
    .map(([name, list]) => {
      const acc = list.filter((r) => r.status === "ANGENOMMEN");
      const privat = acc.reduce((s, r) => s + r.privat, 0);
      const kasse = acc.reduce((s, r) => s + r.kasse, 0);
      const dec = list.filter((r) => decided(r.status)).length;
      return {
        name,
        umsatz: privat + kasse,
        privat,
        kasse,
        angenommen: acc.length,
        entschieden: dec,
        quote: rate(acc.length, dec),
        anteil: totalPrivat > 0 ? privat / totalPrivat : totalUmsatz > 0 ? (privat + kasse) / totalUmsatz : 0,
      };
    })
    .sort((a, b) => b.privat - a.privat || b.umsatz - a.umsatz);
}

export interface Factor {
  frage: string;
  a: { label: string; quote: number | null; n: number };
  b: { label: string; quote: number | null; n: number };
  /** Unterschied a − b in Prozentpunkten, nur bei genug Fällen. */
  punkte: number | null;
  erklaerung: string;
}

function factor(frage: string, list: ProposalFacts[], test: (p: ProposalFacts) => boolean, la: string, lb: string, erklaerung: string): Factor {
  const dec = list.filter((p) => decided(p.status));
  const ga = dec.filter(test);
  const gb = dec.filter((p) => !test(p));
  const qa = rate(ga.filter((p) => p.status === "ANGENOMMEN").length, ga.length);
  const qb = rate(gb.filter((p) => p.status === "ANGENOMMEN").length, gb.length);
  return {
    frage,
    a: { label: la, quote: qa, n: ga.length },
    b: { label: lb, quote: qb, n: gb.length },
    punkte: qa != null && qb != null ? qa - qb : null,
    erklaerung,
  };
}

export interface Risk {
  id: string;
  stufe: "hoch" | "mittel" | "info";
  titel: string;
  warum: string;
  tun: string;
}

export interface Analysis {
  zeitraumTage: number;
  vorschlaege: number;
  entschieden: number;
  angenommen: number;
  quote: number | null;
  umsatz: number;
  privat: number;
  kasse: number;
  /** Selbstzahler-Umsatz, der in offenen (noch nicht entschiedenen) Vorschlägen steckt. */
  offenPotenzial: number;
  leistungen: Group[];
  themen: Group[];
  arten: Group[];
  monate: { monat: string; privat: number; kasse: number }[];
  faktoren: Factor[];
  risiken: Risk[];
  staerken: string[];
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

export function analyze(args: {
  proposals: ProposalFacts[];
  rows: Row[];
  invoices: InvoiceFacts[];
  now?: Date;
  zeitraumTage: number;
  /** Tage bis zum Festzuschuss-Stichtag, wenn der Jahresvergleich gerade relevant ist (Zahnmedizin). */
  tageBisStichtag?: number | null;
}): Analysis {
  const now = args.now ?? new Date();
  const from = new Date(now.getTime() - args.zeitraumTage * DAY);
  const proposals = args.proposals.filter((p) => p.createdAt >= from);
  const ids = new Set(proposals.map((p) => p.id));
  const rows = args.rows.filter((r) => ids.has(r.proposalId));
  const acc = rows.filter((r) => r.status === "ANGENOMMEN");
  const privat = acc.reduce((s, r) => s + r.privat, 0);
  const kasse = acc.reduce((s, r) => s + r.kasse, 0);
  const dec = proposals.filter((p) => decided(p.status));
  const angenommen = proposals.filter((p) => p.status === "ANGENOMMEN").length;
  const leistungen = groupBy(rows, (r) => r.leistung);
  const themen = groupBy(rows, (r) => r.thema);
  const arten = groupBy(rows, (r) => r.art);

  // Verlauf der letzten sechs Monate (unabhängig vom Zeitraum).
  const monate: Analysis["monate"] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = args.rows.filter((r) => r.status === "ANGENOMMEN" && r.createdAt >= start && r.createdAt < end);
    monate.push({
      monat: start.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      privat: inMonth.reduce((s, r) => s + r.privat, 0),
      kasse: inMonth.reduce((s, r) => s + r.kasse, 0),
    });
  }

  const faktoren: Factor[] = [
    factor("Hilft der Patienten-Link?", proposals, (p) => p.linked, "mit Link", "ohne Link", "Wer zu Hause in Ruhe vergleichen kann, entscheidet sich öfter. Der Link wirkt nur, wenn er auch geöffnet wird."),
    factor("Macht eine Rückmeldung den Unterschied?", proposals.filter((p) => p.linked), (p) => p.responded, "mit Rückmeldung", "ohne Rückmeldung", "Patienten, die sich melden, haben Fragen geklärt. Ohne Rückmeldung lohnt ein kurzer Anruf."),
    factor("Wie entscheiden Privatversicherte?", proposals, (p) => p.patient.insurance === "PKV", "privat versichert", "gesetzlich versichert", "Bei Privatversicherten übernimmt der Tarif meist einen großen Teil, der Eigenanteil fällt kleiner aus."),
    factor("Wirkt der Wunsch nach Ratenzahlung?", proposals.filter((p) => p.responded), (p) => p.wantsInstallments, "Raten gewünscht", "keine Raten", "Wer nach Raten fragt, will meist behandeln, aber nicht alles auf einmal zahlen. Das Angebot entscheidet oft."),
    factor("Entscheiden Ältere anders?", proposals, (p) => (p.patient.age ?? 0) >= 65, "ab 65 Jahren", "unter 65 Jahren", "Ältere Patienten wägen Kosten und Nutzen oft anders ab und brauchen häufiger ein zweites Gespräch."),
  ];

  // ------------------------------------------------------------ Risiken --
  const risiken: Risk[] = [];
  const top = leistungen[0];
  if (top && privat > 0 && top.anteil > 0.5 && acc.length >= MIN_GROUP) {
    risiken.push({
      id: "konzentration",
      stufe: "mittel",
      titel: `${Math.round(top.anteil * 100)} % des Selbstzahler-Umsatzes hängen an einer Leistung`,
      warum: `„${top.name}“ bringt den Großteil der privaten Einnahmen. Ändern sich Nachfrage, Kassenregeln oder Preise, fehlt das Geld sofort.`,
      tun: "Weitere Leistungen aktiv anbieten, die zu Ihren Patienten passen, und die Preise der Hauptleistung jährlich prüfen.",
    });
  }
  const unbelegtPrivat = acc.filter((r) => r.unbelegt).reduce((s, r) => s + r.privat, 0);
  if (privat > 0 && unbelegtPrivat / privat > 0.3) {
    risiken.push({
      id: "unbelegt",
      stufe: "mittel",
      titel: `${Math.round((unbelegtPrivat / privat) * 100)} % der Selbstzahler-Einnahmen ohne belegten Nutzen`,
      warum: "Leistungen, deren Nutzen wissenschaftlich nicht belegt ist, geraten bei Verbraucherschützern, Kassen und Bewertungsportalen schnell in die Kritik. Das kostet Vertrauen.",
      tun: "Die Nutzenangabe im Vorschlag stehen lassen, schriftlich aufklären und die Einwilligung vor der Behandlung einholen. Leistungen mit belegtem Nutzen stärker anbieten.",
    });
  }
  for (const g of leistungen) {
    if (g.quote != null && g.quote < 40 && g.entschieden >= MIN_GROUP * 2) {
      risiken.push({
        id: `ablehnung-${g.name}`,
        stufe: "mittel",
        titel: `„${g.name}“ wird meist abgelehnt (${g.quote} % Annahme)`,
        warum: "Wenn eine Leistung oft abgelehnt wird, passen Preis, Erklärung oder Zielgruppe nicht. Jedes Gespräch dazu kostet Zeit.",
        tun: "Preis und Nutzen im Vorschlag prüfen, die Leistung nur bei passendem Anlass anbieten und Ratenzahlung anbieten, falls der Betrag hoch ist.",
      });
      if (risiken.filter((r) => r.id.startsWith("ablehnung")).length >= 2) break;
    }
  }
  const unopened = args.proposals.filter((p) => p.linked && !p.viewed && p.shareCreatedAt && now.getTime() - p.shareCreatedAt.getTime() > 3 * DAY && !decided(p.status));
  if (unopened.length >= 3) {
    risiken.push({
      id: "ungeoeffnet",
      stufe: "mittel",
      titel: `${unopened.length} Patienten-Links seit über drei Tagen ungeöffnet`,
      warum: "Ein Link, der nicht geöffnet wird, bringt keine Entscheidung. Oft ist die SMS untergegangen oder die Nummer falsch.",
      tun: "Kurz anrufen oder den Link erneut senden. In der Patientenliste mit dem Filter „Offen“ finden Sie die Fälle.",
    });
  }
  const unanswered = args.proposals.filter((p) => p.responded && p.patientRespondedAt && !decided(p.status) && now.getTime() - p.patientRespondedAt.getTime() > 2 * DAY);
  if (unanswered.length) {
    risiken.push({
      id: "rueckmeldung",
      stufe: unanswered.length >= 5 ? "hoch" : "mittel",
      titel: `${unanswered.length} Rückmeldungen warten seit über zwei Tagen`,
      warum: "Patienten, die sich zurückgemeldet haben, sind entscheidungsbereit. Wer nicht zeitnah zurückgerufen wird, geht häufig woanders hin.",
      tun: "Heute zurückrufen. Die Fälle stehen in der Patientenliste unter „Rückmeldung“.",
    });
  }
  const stale = args.proposals.filter((p) => !decided(p.status) && now.getTime() - p.createdAt.getTime() > 30 * DAY);
  if (stale.length >= 3) {
    risiken.push({
      id: "alt",
      stufe: "info",
      titel: `${stale.length} Vorschläge seit über 30 Tagen ohne Entscheidung`,
      warum: "Alte offene Vorschläge verfälschen die Planung und sind meist vergessen, nicht abgelehnt.",
      tun: "Einmal durchgehen: nachfassen oder als abgelehnt markieren, damit die Zahlen stimmen.",
    });
  }
  const overdue = args.invoices.filter((i) => i.status === "OFFEN" && i.dueDate < now);
  if (overdue.length) {
    const sum = overdue.reduce((s, i) => s + i.amountCent, 0) / 100;
    risiken.push({
      id: "ueberfaellig",
      stufe: sum > 1000 || overdue.length >= 5 ? "hoch" : "mittel",
      titel: `${overdue.length} überfällige ${overdue.length === 1 ? "Rechnung" : "Rechnungen"} über ${fmt(sum)}`,
      warum: "Offene Forderungen fehlen in der Liquidität, und je älter sie werden, desto seltener werden sie bezahlt.",
      tun: "Unter „Zahlungen“ mit einem Klick erinnern. Der Patient sieht die Rechnung im Portal und zahlt per GiroCode.",
    });
  }
  const openDental = args.proposals.some((p) => p.dental && !decided(p.status));
  if (args.tageBisStichtag != null && args.tageBisStichtag > 0 && openDental) {
    risiken.push({
      id: "stichtag",
      stufe: "info",
      titel: `Festzuschuss-Stichtag in ${args.tageBisStichtag} Tagen`,
      warum: "Für die Höhe des Festzuschusses zählt das Datum, an dem die Kasse den Heil- und Kostenplan genehmigt. Danach gelten neue Sätze.",
      tun: "Offene Zahnersatz-Vorschläge ansprechen und Heil- und Kostenpläne rechtzeitig einreichen.",
    });
  }

  // ------------------------------------------------------------ Stärken --
  const staerken: string[] = [];
  const best = leistungen.filter((g) => g.quote != null).sort((a, b) => b.quote! - a.quote!)[0];
  if (best && best.quote! >= 60) staerken.push(`„${best.name}“ wird von ${best.quote} % der Patienten angenommen.`);
  const link = faktoren[0];
  if (link.punkte != null && link.punkte >= 5) staerken.push(`Mit Patienten-Link nehmen ${link.punkte} Prozentpunkte mehr Patienten an.`);
  const paid = args.invoices.filter((i) => i.status === "BEZAHLT").length;
  const billed = args.invoices.filter((i) => i.status !== "STORNIERT").length;
  if (billed >= MIN_GROUP && paid / billed >= 0.8) staerken.push(`${Math.round((paid / billed) * 100)} % der Rechnungen sind bezahlt.`);

  const offenPotenzial = rows.filter((r) => !decided(r.status)).reduce((s, r) => s + r.privat, 0);

  return {
    zeitraumTage: args.zeitraumTage,
    vorschlaege: proposals.length,
    entschieden: dec.length,
    angenommen,
    quote: dec.length ? Math.round((angenommen / dec.length) * 100) : null,
    umsatz: privat + kasse,
    privat,
    kasse,
    offenPotenzial,
    leistungen,
    themen,
    arten,
    monate,
    faktoren,
    risiken: risiken.sort((a, b) => ["hoch", "mittel", "info"].indexOf(a.stufe) - ["hoch", "mittel", "info"].indexOf(b.stufe)),
    staerken,
  };
}
