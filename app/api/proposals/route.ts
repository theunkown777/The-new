import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { choicesSchema, computeProposal, proposalInputSchema, proposalStatusSchema } from "@/lib/proposalSchema";

const createSchema = z.object({
  patientId: z.string().min(1),
  input: proposalInputSchema,
  choices: choicesSchema.default({}),
  status: proposalStatusSchema.default("ENTWURF"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const proposals = await prisma.treatmentProposal.findMany({
    where: { practiceId: session.user.practiceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      baseTotalCent: true,
      planTotalCent: true,
      eigenanteilCent: true,
      createdAt: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json({ proposals });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }
  const { patientId, input, choices, status } = parsed.data;

  const [patient, practice] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, practiceId: session.user.practiceId } }),
    prisma.practice.findUnique({
      where: { id: session.user.practiceId },
      select: { name: true, proposalPrices: true },
    }),
  ]);
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  const computed = computeProposal({
    input,
    choices,
    prices: resolvePrices(practice?.proposalPrices),
    patientName: `${patient.firstName} ${patient.lastName}`,
    practiceName: practice?.name ?? "Ihre Zahnarztpraxis",
    date: new Date(),
  });

  const proposal = await prisma.treatmentProposal.create({
    data: {
      practiceId: session.user.practiceId,
      patientId,
      authorId: session.user.id,
      status,
      input,
      ...computed,
    },
    select: { id: true },
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
