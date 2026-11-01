import { prisma } from "@/lib/prisma";
import { buildBriefing, type Briefing } from "@/lib/akte";
import { loadAnamnesis } from "@/lib/anamnesisView";
import { ageFromBirthDate } from "@/lib/proposals";
import { invoiceView } from "@/lib/invoices";

/** Lädt alles für den Überblick vor dem Termin, praxisgebunden. */
export async function loadBriefing(practiceId: string, patientId: string, anlass: string | null = null): Promise<Briefing | null> {
  const now = new Date();
  const p = await prisma.patient.findFirst({
    where: { id: patientId, practiceId },
    select: {
      birthDate: true,
      insuranceType: true,
      insuranceName: true,
      entries: { select: { art: true, text: true, code: true, datum: true, inaktiv: true, createdAt: true } },
      reports: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, treatmentDate: true, serviceSummary: true } },
      proposals: { where: { status: { in: ["ENTWURF", "BESPROCHEN"] } }, select: { createdAt: true, eigenanteilCent: true } },
      invoices: { where: { status: { in: ["OFFEN", "GEMELDET"] } }, select: { status: true, dueDate: true, amountCent: true } },
      _count: { select: { documents: true } },
    },
  });
  if (!p) return null;
  const anamnese = await loadAnamnesis(practiceId, patientId);
  const r = p.reports[0];
  return buildBriefing({
    now,
    alter: ageFromBirthDate(p.birthDate),
    versicherung: [p.insuranceType === "PKV" ? "privat" : p.insuranceType === "GKV" ? "gesetzlich" : null, p.insuranceName].filter(Boolean).join(", ") || null,
    entries: p.entries,
    anamneseWarnungen: anamnese.flags.filter((f) => f.level === "warn").map((f) => (f.detail ? `${f.text} (${f.detail})` : f.text)),
    letzteBehandlung: r ? { datum: r.treatmentDate ?? r.createdAt, text: r.serviceSummary.split("\n").slice(0, 3).join("; ").slice(0, 200) } : null,
    offeneVorschlaege: p.proposals.map((v) => ({ titel: `Eigenanteil ${(v.eigenanteilCent / 100).toLocaleString("de-DE")} €`, seit: v.createdAt })),
    offeneRechnungenCent: p.invoices.reduce((a, i) => a + i.amountCent, 0),
    ueberfaellig: p.invoices.some((i) => invoiceView(i, now).key === "ueberfaellig"),
    dokumente: p._count.documents,
    anlass,
  });
}
