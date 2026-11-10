import { prisma } from "@/lib/prisma";

// Eingang: Alles, was Patienten von sich aus auslösen, landet hier gesammelt, damit in der Praxis
// nichts untergeht. Jeder Eintrag sagt, was passiert ist, was zu tun ist und wohin der Klick führt.
// hinweis enthält nur Kennungen (z. B. Rechnungsnummer), keine Gesundheitsangaben.

export const EINGANG_ARTEN = {
  ZAHLUNG_GEMELDET: { titel: "Zahlung gemeldet", tun: "Kontoeingang prüfen und unter Zahlungen bestätigen.", gruppe: "Geld" },
  ZAHLUNG_ONLINE: { titel: "Online bezahlt", tun: "Nichts zu tun: die Rechnung ist als bezahlt verbucht.", gruppe: "Geld" },
  RATEN: { titel: "Ratenzahlung gewünscht", tun: "Patient anrufen und Raten vereinbaren.", gruppe: "Geld" },
  LASTSCHRIFT: { titel: "Lastschriftmandat erteilt", tun: "Unter Zahlungen in die nächste Lastschrift-Datei übernehmen.", gruppe: "Geld" },
  ANAMNESE: { titel: "Anamnesebogen abgeschickt", tun: "Vor dem Termin in der Akte ansehen.", gruppe: "Unterlagen" },
  KURZCHECK: { titel: "Kurz-Fragebogen ausgefüllt", tun: "Vor dem Termin in der Akte ansehen: wo, wie stark, seit wann.", gruppe: "Unterlagen" },
  VORSCHLAG_INTERESSE: { titel: "Interesse am Vorschlag", tun: "Termin anbieten oder den Vorschlag als angenommen eintragen.", gruppe: "Vorschläge" },
  VORSCHLAG_RUECKRUF: { titel: "Rückruf zum Vorschlag gewünscht", tun: "Patient anrufen.", gruppe: "Vorschläge" },
  VEREINBARUNG: { titel: "Vereinbarung unterschrieben", tun: "Vorschlag als angenommen eintragen und Termin planen.", gruppe: "Vorschläge" },
  ZWEITMEINUNG: { titel: "Zweitmeinung geteilt", tun: "Im Vorschlag ansehen und im Gespräch darauf eingehen.", gruppe: "Vorschläge" },
  TERMIN_GEBUCHT: { titel: "Termin online gebucht", tun: "Im Kalender ansehen, bei Bedarf bestätigen.", gruppe: "Termine" },
  TERMIN_ABGESAGT: { titel: "Termin online abgesagt", tun: "Die Zeit ist wieder frei; bei Bedarf neu vergeben.", gruppe: "Termine" },
} as const;

export type EingangArt = keyof typeof EINGANG_ARTEN;
export const istEingangArt = (a: string): a is EingangArt => Object.prototype.hasOwnProperty.call(EINGANG_ARTEN, a);

/** Wohin der Klick aus dem Eingang führt. */
export function eingangZiel(e: { art: string; entityId: string | null; patientId: string; tag?: string | null }): string {
  switch (e.art) {
    case "ZAHLUNG_GEMELDET": return "/zahlungen?f=gemeldet";
    case "ZAHLUNG_ONLINE": case "RATEN": case "LASTSCHRIFT": return "/zahlungen";
    case "ANAMNESE": return `/patients/${e.patientId}#anamnese`;
    case "KURZCHECK": return `/patients/${e.patientId}#kurzcheck`;
    case "VORSCHLAG_INTERESSE": case "VORSCHLAG_RUECKRUF": case "VEREINBARUNG": case "ZWEITMEINUNG":
      return e.entityId ? `/proposals/${e.entityId}` : `/patients/${e.patientId}`;
    case "TERMIN_GEBUCHT": case "TERMIN_ABGESAGT": return e.tag ? `/termine?tag=${e.tag}` : "/termine";
    default: return `/patients/${e.patientId}`;
  }
}

/**
 * Eintrag in den Eingang schreiben. Wirft nie: die Aktion des Patienten darf daran nicht scheitern.
 * Ein noch offener Eintrag gleicher Art zum selben Vorgang wird aufgefrischt statt verdoppelt.
 */
export async function eingangMelden(e: { practiceId: string; patientId: string; art: EingangArt; entityId?: string | null; hinweis?: string | null }): Promise<void> {
  try {
    const hinweis = e.hinweis?.replace(/\s+/g, " ").trim().slice(0, 120) || null;
    const offen = e.entityId ? await prisma.eingang.findFirst({ where: { practiceId: e.practiceId, art: e.art, entityId: e.entityId, erledigtAt: null }, select: { id: true } }) : null;
    if (offen) await prisma.eingang.update({ where: { id: offen.id }, data: { createdAt: new Date(), hinweis } });
    else await prisma.eingang.create({ data: { practiceId: e.practiceId, patientId: e.patientId, art: e.art, entityId: e.entityId ?? null, hinweis } });
  } catch (err) {
    console.error("Eingang konnte nicht geschrieben werden", e.art, err);
  }
}

/** Offene Einträge zu einem Vorgang abhaken, wenn die Praxis ihn an anderer Stelle erledigt hat. */
export async function eingangErledigen(practiceId: string, arten: EingangArt[], entityId: string, von: string): Promise<void> {
  try {
    await prisma.eingang.updateMany({ where: { practiceId, art: { in: arten }, entityId, erledigtAt: null }, data: { erledigtAt: new Date(), erledigtVon: von } });
  } catch (err) {
    console.error("Eingang konnte nicht abgehakt werden", err);
  }
}

export const eingangOffen = (practiceId: string) => prisma.eingang.count({ where: { practiceId, erledigtAt: null } });

/** Für die Demo-Praxis: aus dem Bestand ein paar offene Einträge ableiten, damit der Eingang nicht leer ist. */
export async function eingangAusBestand(practiceId: string, now = new Date()): Promise<number> {
  const seit = new Date(now.getTime() - 14 * 864e5);
  const [gemeldet, anamnesen, antworten] = await Promise.all([
    prisma.invoice.findMany({ where: { practiceId, status: "GEMELDET" }, orderBy: { reportedPaidAt: "desc" }, take: 3, select: { id: true, patientId: true, number: true, reportedPaidAt: true } }),
    prisma.anamnesisForm.findMany({ where: { practiceId, submittedAt: { gte: seit } }, orderBy: { submittedAt: "desc" }, take: 2, select: { id: true, patientId: true, submittedAt: true } }),
    prisma.treatmentProposal.findMany({ where: { practiceId, patientRespondedAt: { gte: seit }, status: { in: ["ENTWURF", "BESPROCHEN"] } }, orderBy: { patientRespondedAt: "desc" }, take: 3, select: { id: true, patientId: true, patientResponse: true, patientRespondedAt: true } }),
  ]);
  const data = [
    ...gemeldet.map((i) => ({ practiceId, patientId: i.patientId, art: "ZAHLUNG_GEMELDET", entityId: i.id, hinweis: `Rechnung ${i.number}`, createdAt: i.reportedPaidAt ?? now })),
    ...anamnesen.map((a) => ({ practiceId, patientId: a.patientId, art: "ANAMNESE", entityId: a.id, hinweis: null, createdAt: a.submittedAt ?? now })),
    ...antworten.map((p) => ({ practiceId, patientId: p.patientId, art: p.patientResponse === "RUECKRUF" ? "VORSCHLAG_RUECKRUF" : "VORSCHLAG_INTERESSE", entityId: p.id, hinweis: null, createdAt: p.patientRespondedAt ?? now })),
  ];
  if (data.length) await prisma.eingang.createMany({ data });
  return data.length;
}
