import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportPdf } from "@/lib/pdf";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: { patient: true, author: { select: { name: true } } },
  });
  if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  const text = report.editedText ?? report.generatedText ?? "";

  const pdfBuffer = await buildReportPdf({
    practiceName: session.user.practiceName,
    authorName: report.author.name,
    patientName: `${report.patient.firstName} ${report.patient.lastName}`,
    patientBirthDate: report.patient.birthDate
      ? report.patient.birthDate.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })
      : null,
    reportType: report.type,
    treatmentDate: report.treatmentDate ? report.treatmentDate.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : null,
    createdAt: report.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
    text,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bericht-${report.patient.lastName}-${report.id.slice(0, 6)}.pdf"`,
    },
  });
}
