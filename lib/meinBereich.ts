import type { Prisma } from "@prisma/client";
import { invoiceTotals } from "@/lib/invoices";

// "Mein Bereich": die persönliche Seite jeder Behandlerin und jedes Behandlers.
// Gezeigt wird nur, was dieser Person zugeordnet ist:
// - Patientenstamm: Patienten mit ihr als Stammbehandler/in. Ist niemand
//   eingetragen, zählt der Patient zu der Person, die Vorschläge oder Berichte
//   für ihn geschrieben hat.
// - Umsatz: Rechnungen zu eigenen Vorschlägen; Rechnungen ohne Vorschlag
//   zählen zur Stammbehandlung des Patienten.
// Zahlen der Kolleginnen und Kollegen tauchen hier nie auf.

/** Bedingung "gehört zu meinem Patientenstamm" für Prisma. */
export function meinePatientenWhere(practiceId: string, userId: string): Prisma.PatientWhereInput {
  return {
    practiceId,
    OR: [
      { behandlerId: userId },
      { behandlerId: null, OR: [{ proposals: { some: { authorId: userId } } }, { reports: { some: { authorId: userId } } }] },
    ],
  };
}

/** Bedingung "Rechnung zählt zu meinem Umsatz" für Prisma. */
export function meineRechnungenWhere(practiceId: string, userId: string): Prisma.InvoiceWhereInput {
  return {
    practiceId,
    OR: [{ proposal: { authorId: userId } }, { proposalId: null, patient: { behandlerId: userId } }],
  };
}

type Rechnung = { status: string; dueDate: Date; amountCent: number; paidAt: Date | null };
type Vorschlag = { status: string; eigenanteilCent: number; createdAt: Date };

export type MeineKennzahlen = {
  bezahltMonatCent: number;
  bezahltJahrCent: number;
  offenCent: number;
  ueberfaelligCent: number;
  vorschlaege: number;
  angenommen: number;
  abgelehnt: number;
  /** Annahmequote der entschiedenen Vorschläge in Prozent; null bei weniger als 3 Entscheidungen */
  quote: number | null;
  angenommenCent: number;
  monate: { label: string; cent: number }[];
};

/** Kennzahlen aus den eigenen Rechnungen und Vorschlägen (Vorschläge: letzte `tage` Tage). */
export function meineKennzahlen(rechnungen: Rechnung[], vorschlaege: Vorschlag[], now = new Date(), tage = 90): MeineKennzahlen {
  const t = invoiceTotals(rechnungen, now);
  const jahr = new Date(now.getFullYear(), 0, 1);
  const bezahltJahrCent = rechnungen
    .filter((r) => r.status === "BEZAHLT" && r.paidAt && r.paidAt >= jahr)
    .reduce((a, r) => a + r.amountCent, 0);

  const seit = new Date(now.getTime() - tage * 864e5);
  const v = vorschlaege.filter((p) => p.createdAt >= seit);
  const angenommen = v.filter((p) => p.status === "ANGENOMMEN");
  const abgelehnt = v.filter((p) => p.status === "ABGELEHNT").length;
  const entschieden = angenommen.length + abgelehnt;

  const monate: { label: string; cent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const von = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bis = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monate.push({
      label: von.toLocaleDateString("de-DE", { month: "short" }),
      cent: rechnungen
        .filter((r) => r.status === "BEZAHLT" && r.paidAt && r.paidAt >= von && r.paidAt < bis)
        .reduce((a, r) => a + r.amountCent, 0),
    });
  }

  return {
    bezahltMonatCent: t.bezahltMonatCent,
    bezahltJahrCent,
    offenCent: t.offenCent,
    ueberfaelligCent: t.ueberfaelligCent,
    vorschlaege: v.length,
    angenommen: angenommen.length,
    abgelehnt,
    quote: entschieden >= 3 ? Math.round((angenommen.length / entschieden) * 100) : null,
    angenommenCent: angenommen.reduce((a, p) => a + p.eigenanteilCent, 0),
    monate,
  };
}
