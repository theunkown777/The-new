import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAgreementPdf } from "@/lib/pdf";
import { agreementContext } from "@/lib/agreementContext";

// Digitales Einverständnis als PDF für die Akte und zum Gegenzeichnen.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const p = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId, agreedAt: { not: null } },
    include: { patient: true, practice: { select: { name: true, proposalPrices: true } } },
  });
  if (!p || !p.agreedAt) return NextResponse.json({ error: "Kein Einverständnis vorhanden" }, { status: 404 });
  const ctx = agreementContext(p);
  const png = p.agreedSignature?.startsWith("data:image/png;base64,") ? Buffer.from(p.agreedSignature.split(",")[1], "base64") : null;
  const pdf = await buildAgreementPdf({
    practiceName: p.practice.name,
    patientName: `${p.patient.firstName} ${p.patient.lastName}`,
    patientBirthDate: p.patient.birthDate ? p.patient.birthDate.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : null,
    proposalDate: p.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }),
    text: p.agreedText ?? ctx?.text ?? "",
    kasse: ctx?.kasse ?? 0,
    eigen: ctx?.eigen ?? 0,
    signedAt: p.agreedAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }),
    signedName: p.agreedName ?? "",
    signaturePng: png,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="einverstaendnis-${p.patient.lastName}-${p.id.slice(0, 6)}.pdf"`, "Cache-Control": "no-store" },
  });
}
