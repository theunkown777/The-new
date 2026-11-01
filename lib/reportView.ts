import { prisma } from "@/lib/prisma";

// Daten für den ReportEditor, gemeinsam genutzt von der Berichtsseite der App
// und vom Praxissoftware-Fenster (/embed/report/[id]).
export async function loadReportEditorProps(id: string, practiceId: string) {
  const [report, practice] = await Promise.all([
    prisma.report.findFirst({
      where: { id, practiceId },
      include: {
        patient: true,
        author: { select: { name: true } },
        serviceTemplate: { select: { name: true } },
        serviceEntries: {
          orderBy: { position: "asc" },
          include: { catalogItem: true },
        },
      },
    }),
    prisma.practice.findUnique({
      where: { id: practiceId },
      select: { gozPunktwertCent: true, bemaPunktwertCent: true },
    }),
  ]);

  if (!report) return null;

  return {
    report: {
      id: report.id,
      type: report.type,
      status: report.status as "ENTWURF" | "FINAL",
      generatedText: report.generatedText,
      editedText: report.editedText,
      serviceSummary: report.serviceSummary,
      serviceTemplateName: report.serviceTemplate?.name ?? null,
      reviewConfirmed: report.reviewConfirmed,
      serviceEntries: report.serviceEntries.map((entry) => ({
        id: entry.id,
        performed: entry.performed,
        toothNumbers: entry.toothNumbers,
        quantity: entry.quantity,
        note: entry.note,
        faktor: entry.faktor,
        catalogItem: {
          system: entry.catalogItem.system,
          code: entry.catalogItem.code,
          title: entry.catalogItem.title,
          category: entry.catalogItem.category,
          punktzahl: entry.catalogItem.punktzahl,
          festbetragCent: entry.catalogItem.festbetragCent,
        },
      })),
      additionalContext: report.additionalContext,
      patient: { firstName: report.patient.firstName, lastName: report.patient.lastName },
      author: { name: report.author.name },
      createdAt: report.createdAt.toLocaleDateString("de-DE"),
      approval: report.approvedAt
        ? { name: report.approvedByName ?? "Unbekannt", at: report.approvedAt.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) }
        : null,
    },
    practicePunktwerte: {
      gozPunktwertCent: practice?.gozPunktwertCent ?? null,
      bemaPunktwertCent: practice?.bemaPunktwertCent ?? null,
    },
  };
}
