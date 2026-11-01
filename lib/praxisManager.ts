// Praxismanager: beantwortet die Fragen, die Praxisleitung und Rezeption
// täglich stellen, aus den eigenen Daten der Praxis. Regelbasiert, ohne KI
// und ohne dass Daten die Praxis verlassen. Er führt nichts selbst aus:
// Jede Antwort endet in einem Vorschlag mit Link auf die Seite, auf der ein
// Mensch die Aktion prüft und auslöst.

import { formatCent, invoiceView } from "@/lib/invoices";

export type ThemaId = "rechnungen" | "berichte" | "vorsorge" | "umsatz" | "engpaesse" | "termine";

export interface Snapshot {
  now: Date;
  invoices: { id: string; status: string; dueDate: Date; amountCent: number; paidAt: Date | null; reminderLevel: number; remindedAt: Date | null }[];
  reports: { id: string; status: string; createdAt: Date }[];
  proposals: { id: string; status: string; createdAt: Date; patientViewedAt: Date | null; eigenanteilCent: number }[];
  anamnesis: { createdAt: Date; submittedAt: Date | null; expiresAt: Date }[];
  recallDue: number;
  recallNeverReminded: number;
}

export interface Antwort {
  thema: ThemaId;
  frage: string;
  /** Ein Satz, der die Frage beantwortet. */
  kurz: string;
  /** Belegende Zahlen oder Einzelheiten. */
  punkte: string[];
  /** Was Sorrida vorschlägt. Ausgeführt wird es erst auf der verlinkten Seite. */
  vorschlag?: { text: string; href: string };
  stufe: "ok" | "beachten" | "dringend";
}

const DAY = 864e5;
const tage = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / DAY);
const n = (x: number, eins: string, viele: string) => `${x} ${x === 1 ? eins : viele}`;

export const FRAGEN: Record<ThemaId, string> = {
  rechnungen: "Welche Rechnungen sind offen?",
  berichte: "Welche Berichte warten auf Freigabe?",
  vorsorge: "Wer ist zur Vorsorge fällig?",
  umsatz: "Wie läuft der Umsatz?",
  engpaesse: "Wo hakt es gerade?",
  termine: "Wie voll ist der Kalender?",
};

function rechnungen(s: Snapshot): Antwort {
  const offen = s.invoices.filter((i) => i.status === "OFFEN" || i.status === "GEMELDET");
  const ueber = offen.filter((i) => invoiceView(i, s.now).key === "ueberfaellig");
  const gemeldet = offen.filter((i) => i.status === "GEMELDET");
  const faelligeErinnerung = ueber.filter((i) => i.reminderLevel < 3 && (!i.remindedAt || tage(s.now, i.remindedAt) >= 7));
  const sum = (l: typeof offen) => formatCent(l.reduce((a, i) => a + i.amountCent, 0));
  if (offen.length === 0) {
    return { thema: "rechnungen", frage: FRAGEN.rechnungen, kurz: "Keine Rechnung ist offen.", punkte: [], stufe: "ok" };
  }
  const punkte = [`${n(offen.length, "Rechnung", "Rechnungen")} offen, zusammen ${sum(offen)}.`];
  if (ueber.length) {
    const aelteste = Math.max(...ueber.map((i) => -invoiceView(i, s.now).days));
    punkte.push(`${n(ueber.length, "ist", "sind")} überfällig (${sum(ueber)}), die älteste seit ${n(aelteste, "Tag", "Tagen")}.`);
  }
  if (gemeldet.length) punkte.push(`${n(gemeldet.length, "Zahlung wurde", "Zahlungen wurden")} vom Patienten gemeldet und warten auf Ihren Abgleich mit dem Konto.`);
  const vorschlag = faelligeErinnerung.length
    ? { text: `${n(faelligeErinnerung.length, "Erinnerung", "Erinnerungen")} vorbereiten. Sie sehen jeden Text vor dem Versand.`, href: "/zahlungen?f=ueberfaellig" }
    : gemeldet.length
      ? { text: "Gemeldete Zahlungen mit dem Kontoauszug abgleichen und als bezahlt markieren.", href: "/zahlungen" }
      : undefined;
  return {
    thema: "rechnungen",
    frage: FRAGEN.rechnungen,
    kurz: ueber.length ? `${sum(ueber)} sind überfällig.` : `${sum(offen)} stehen aus, nichts davon ist überfällig.`,
    punkte,
    vorschlag,
    stufe: ueber.some((i) => -invoiceView(i, s.now).days > 30) ? "dringend" : ueber.length ? "beachten" : "ok",
  };
}

function berichte(s: Snapshot): Antwort {
  const entwuerfe = s.reports.filter((r) => r.status === "ENTWURF");
  if (!entwuerfe.length) return { thema: "berichte", frage: FRAGEN.berichte, kurz: "Alle Berichte sind freigegeben.", punkte: [], stufe: "ok" };
  const alt = entwuerfe.filter((r) => tage(s.now, r.createdAt) >= 3);
  return {
    thema: "berichte",
    frage: FRAGEN.berichte,
    kurz: `${n(entwuerfe.length, "Bericht wartet", "Berichte warten")} auf ärztliche Prüfung.`,
    punkte: [
      alt.length ? `${n(alt.length, "davon liegt", "davon liegen")} seit drei Tagen oder länger.` : "Alle sind jünger als drei Tage.",
      "Ein Entwurf verlässt die Praxis erst nach Freigabe.",
    ],
    vorschlag: { text: "Entwürfe prüfen und freigeben.", href: "/reports?status=ENTWURF" },
    stufe: alt.length ? "beachten" : "ok",
  };
}

function vorsorge(s: Snapshot): Antwort {
  if (!s.recallDue) return { thema: "vorsorge", frage: FRAGEN.vorsorge, kurz: "Gerade ist niemand fällig.", punkte: [], stufe: "ok" };
  return {
    thema: "vorsorge",
    frage: FRAGEN.vorsorge,
    kurz: `${n(s.recallDue, "Patient ist", "Patienten sind")} zur Vorsorge fällig.`,
    punkte: [s.recallNeverReminded ? `${s.recallNeverReminded} davon wurden noch nie erinnert.` : "Alle wurden schon einmal erinnert."],
    vorschlag: { text: "Erinnerungen vorbereiten. Den Text sehen und verschicken Sie selbst.", href: "/vorsorge" },
    stufe: s.recallNeverReminded > 10 ? "beachten" : "ok",
  };
}

function umsatz(s: Snapshot): Antwort {
  const monat = new Date(s.now.getFullYear(), s.now.getMonth(), 1);
  const vormonat = new Date(s.now.getFullYear(), s.now.getMonth() - 1, 1);
  // Vergleich mit dem gleichen Zeitraum des Vormonats, sonst wirkt jeder Monatsanfang wie ein Einbruch.
  const vergleichBis = new Date(vormonat.getTime() + (s.now.getTime() - monat.getTime()));
  const paid = (von: Date, bis: Date) =>
    s.invoices.filter((i) => i.status === "BEZAHLT" && i.paidAt && i.paidAt >= von && i.paidAt < bis).reduce((a, i) => a + i.amountCent, 0);
  const jetzt = paid(monat, new Date(s.now.getTime() + 1));
  const vorher = paid(vormonat, vergleichBis);
  const angenommen = s.proposals.filter((p) => p.status === "ANGENOMMEN" && p.createdAt >= monat).reduce((a, p) => a + p.eigenanteilCent, 0);
  const diff = vorher ? Math.round(((jetzt - vorher) / vorher) * 100) : null;
  return {
    thema: "umsatz",
    frage: FRAGEN.umsatz,
    kurz: `Diesen Monat eingegangen: ${formatCent(jetzt)}${diff == null ? "." : `, ${diff >= 0 ? "+" : ""}${diff} % zum gleichen Zeitraum im Vormonat.`}`,
    punkte: [
      `Angenommene Vorschläge diesen Monat: ${formatCent(angenommen)} Eigenanteil.`,
      "Gezählt werden nur Rechnungen, die in Sorrida als bezahlt markiert sind. Die Abrechnung über Ihre Praxissoftware ist nicht enthalten.",
    ],
    vorschlag: { text: "Muster und Annahmequoten ansehen.", href: "/analyse" },
    stufe: diff != null && diff < -30 ? "beachten" : "ok",
  };
}

function engpaesse(s: Snapshot): Antwort {
  const punkte: string[] = [];
  let vorschlag: Antwort["vorschlag"];
  const liegen = s.proposals.filter((p) => (p.status === "ENTWURF" || p.status === "BESPROCHEN") && tage(s.now, p.createdAt) >= 14);
  const ungesehen = liegen.filter((p) => !p.patientViewedAt);
  if (liegen.length) {
    punkte.push(`${n(liegen.length, "Vorschlag ist", "Vorschläge sind")} seit über zwei Wochen nicht entschieden${ungesehen.length ? `, ${ungesehen.length} davon hat der Patient nie geöffnet` : ""}.`);
    vorschlag = { text: "Offene Vorschläge durchgehen und bei Bedarf nachfassen.", href: "/proposals" };
  }
  const anamOffen = s.anamnesis.filter((a) => !a.submittedAt && a.expiresAt > s.now && tage(s.now, a.createdAt) >= 2);
  if (anamOffen.length) punkte.push(`${n(anamOffen.length, "Anamnesebogen ist", "Anamnesebögen sind")} verschickt, aber nach zwei Tagen noch nicht ausgefüllt.`);
  const entwuerfe = s.reports.filter((r) => r.status === "ENTWURF" && tage(s.now, r.createdAt) >= 3).length;
  if (entwuerfe) punkte.push(`${n(entwuerfe, "Bericht wartet", "Berichte warten")} seit drei Tagen oder länger auf Freigabe.`);
  const ueber30 = s.invoices.filter((i) => (i.status === "OFFEN" || i.status === "GEMELDET") && invoiceView(i, s.now).days < -30).length;
  if (ueber30) {
    punkte.push(`${n(ueber30, "Rechnung ist", "Rechnungen sind")} über 30 Tage überfällig.`);
    vorschlag ??= { text: "Überfällige Rechnungen ansehen.", href: "/zahlungen?f=ueberfaellig" };
  }
  return {
    thema: "engpaesse",
    frage: FRAGEN.engpaesse,
    kurz: punkte.length ? `${n(punkte.length, "Stelle braucht", "Stellen brauchen")} Aufmerksamkeit.` : "Gerade hakt nichts.",
    punkte,
    vorschlag,
    stufe: punkte.length >= 3 ? "dringend" : punkte.length ? "beachten" : "ok",
  };
}

function termine(): Antwort {
  return {
    thema: "termine",
    frage: FRAGEN.termine,
    kurz: "Termine kennt Sorrida nicht. Der Kalender liegt in Ihrer Praxissoftware.",
    punkte: ["Eine Terminanbindung an die Praxissoftware ist geplant, aber noch nicht gebaut. Bis dahin zeigt Sorrida hier keine erfundenen Zahlen."],
    stufe: "ok",
  };
}

export function praxisManager(s: Snapshot): Antwort[] {
  return [rechnungen(s), berichte(s), vorsorge(s), umsatz(s), engpaesse(s), termine()];
}

// Freie Frage einem Thema zuordnen. Bewusst einfach: Stichwörter statt
// Sprachmodell, damit nachvollziehbar bleibt, warum welche Antwort kommt.
const STICHWORTE: [ThemaId, RegExp][] = [
  ["termine", /termin|kalender|auslastung|frei(e|er)? (slot|platz)|morgen|woche/i],
  ["berichte", /bericht|freigab|entwurf|befund|arztbrief|dokumentation/i],
  ["vorsorge", /vorsorge|recall|prophylaxe|kontrolle|check|erinner(n|ung) an/i],
  ["umsatz", /umsatz|einnahm|verdien|geld (rein|eingegangen)|monat|vormonat/i],
  ["rechnungen", /rechnung|offen|zahl|mahn|überfällig|ueberfaellig|schuld|bezahlt/i],
  ["engpaesse", /engpass|engpässe|hakt|problem|liegen|stau|wo klemmt|was fehlt|aufgabe|zu tun/i],
];

export function themaFuerFrage(frage: string): ThemaId | null {
  for (const [t, re] of STICHWORTE) if (re.test(frage)) return t;
  return null;
}
