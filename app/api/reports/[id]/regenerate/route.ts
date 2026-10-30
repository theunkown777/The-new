import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoGuard } from "@/lib/demoGuard";
import { generateReportText, ReportType } from "@/lib/anthropic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const blocked = await demoGuard(session.user.practiceId, "report");
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const additionalContext: string | undefined = body?.additionalContext;

  const existing = await prisma.report.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: { patient: true },
  });
  if (!existing) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  let generatedText: string;
  try {
    generatedText = await generateReportText({
      reportType: existing.type as ReportType,
      practiceName: session.user.practiceName,
      authorName: session.user.name ?? "",
      patient: {
        firstName: existing.patient.firstName,
        lastName: existing.patient.lastName,
        birthDate: existing.patient.birthDate
          ? existing.patient.birthDate.toLocaleDateString("de-DE")
          : null,
        insuranceName: existing.patient.insuranceName,
        insuranceNumber: existing.patient.insuranceNumber,
      },
      treatmentDate: existing.treatmentDate
        ? existing.treatmentDate.toLocaleDateString("de-DE")
        : null,
      serviceSummary: existing.serviceSummary,
      additionalContext: additionalContext ?? existing.additionalContext,
    });
  } catch (err) {
    console.error("Fehler bei der Berichtsgenerierung:", err);
    return NextResponse.json(
      { error: "Der Bericht konnte nicht neu generiert werden. Bitte versuchen Sie es erneut." },
      { status: 502 }
    );
  }

  const report = await prisma.report.update({
    where: { id: params.id },
    data: {
      generatedText,
      editedText: null,
      additionalContext: additionalContext ?? existing.additionalContext,
    },
  });

  return NextResponse.json({ report });
}
