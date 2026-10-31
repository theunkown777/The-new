import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceCreateSchema, invoiceNumber } from "@/lib/invoices";

const DAY = 24 * 60 * 60 * 1000;

// Rechnung anlegen, z. B. für den Eigenanteil eines angenommenen Vorschlags.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;
  const parsed = invoiceCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;

  const patient = await prisma.patient.findFirst({ where: { id: d.patientId, practiceId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  if (d.proposalId) {
    const p = await prisma.treatmentProposal.findFirst({ where: { id: d.proposalId, practiceId, patientId: d.patientId }, select: { id: true } });
    if (!p) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  }

  const year = new Date().getFullYear();
  // Fortlaufende Nummer je Jahr; bei gleichzeitiger Anlage einmal neu versuchen.
  for (let attempt = 0; attempt < 3; attempt++) {
    const count = await prisma.invoice.count({ where: { practiceId, number: { startsWith: `${year}-` } } });
    try {
      const invoice = await prisma.invoice.create({
        data: {
          practiceId,
          patientId: d.patientId,
          proposalId: d.proposalId,
          number: invoiceNumber(year, count + 1 + attempt),
          title: d.title,
          amountCent: Math.round(d.amountEur * 100),
          dueDate: new Date(Date.now() + d.dueDays * DAY),
        },
      });
      return NextResponse.json({ invoice }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return NextResponse.json({ error: "Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen." }, { status: 409 });
}
