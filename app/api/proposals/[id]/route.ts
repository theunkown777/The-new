import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { choicesSchema, computeProposal, proposalInputSchema, proposalStatusSchema } from "@/lib/proposalSchema";

const updateSchema = z.object({
  input: proposalInputSchema.optional(),
  choices: choicesSchema.optional(),
  status: proposalStatusSchema.optional(),
});

async function findOwn(id: string, practiceId: string) {
  return prisma.treatmentProposal.findFirst({
    where: { id, practiceId },
    include: { patient: true, practice: { select: { name: true, proposalPrices: true } } },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: { patient: true, author: { select: { name: true } } },
  });
  if (!proposal) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ proposal });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const existing = await findOwn(params.id, session.user.practiceId);
  if (!existing) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });

  // Ein angenommener oder abgelehnter Vorschlag ist der Aufklärungsnachweis
  // - Befund und Wahl bleiben dann unverändert, nur der Status darf sich
  // noch ändern (z. B. Patient entscheidet sich später doch anders).
  const locked = existing.status === "ANGENOMMEN" || existing.status === "ABGELEHNT";
  if (locked && (parsed.data.input || parsed.data.choices)) {
    return NextResponse.json(
      { error: "Abgeschlossene Vorschläge können nicht mehr bearbeitet werden. Legen Sie einen neuen Vorschlag an." },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.input || parsed.data.choices) {
    const input = parsed.data.input ?? proposalInputSchema.parse(existing.input);
    const computed = computeProposal({
      input,
      choices: parsed.data.choices ?? choicesSchema.parse(existing.choices),
      prices: resolvePrices(existing.practice.proposalPrices),
      patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
      practiceName: existing.practice.name,
      date: new Date(),
    });
    Object.assign(data, { input, ...computed });
  }

  const proposal = await prisma.treatmentProposal.update({
    where: { id: existing.id },
    data,
    select: { id: true, status: true },
  });
  return NextResponse.json({ proposal });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const existing = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!existing) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  if (existing.status !== "ENTWURF") {
    return NextResponse.json(
      { error: "Nur Entwürfe können gelöscht werden. Besprochene Vorschläge bleiben als Nachweis erhalten." },
      { status: 409 }
    );
  }
  await prisma.treatmentProposal.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
