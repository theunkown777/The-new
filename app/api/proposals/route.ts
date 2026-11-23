import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mitPatientenGrenze } from "@/lib/patientenImportSperre";
import { resolvePrices } from "@/lib/proposals";
import { choicesSchema, computeProposal, leererVorschlag, mitPraxisFach, proposalInputSchema, proposalStatusSchema } from "@/lib/proposalSchema";
import { OHNE_AKTE, kuerzelSchema, nameFuerSchreiben } from "@/lib/ohneAkte";

const createSchema = z.object({
  /** Entweder ein vorhandener Patient … */
  patientId: z.string().min(1).optional(),
  /** … oder ein Schnellvorschlag ohne Akte: nur ein Kürzel, kein Name, kein Geburtsdatum. */
  schnell: z.object({ kuerzel: kuerzelSchema }).optional(),
  input: proposalInputSchema,
  choices: choicesSchema.default({}),
  status: proposalStatusSchema.default("ENTWURF"),
  /** Abschluss-Schritt: Bericht derselben Behandlung. */
  reportId: z.string().min(1).optional(),
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

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }
  const { choices, status, reportId, schnell } = parsed.data;
  if (!parsed.data.patientId === !schnell) return NextResponse.json({ error: "Bitte einen Patienten wählen oder ein Kürzel eingeben." }, { status: 400 });

  const practice = await prisma.practice.findUnique({
    where: { id: session.user.practiceId },
    select: { name: true, proposalPrices: true, isDemo: true, specialty: true },
  });
  // Das Fach des Vorschlags ist das Fach der Praxis, nicht was der Browser schickt (lib/proposalSchema.ts).
  const input = mitPraxisFach(parsed.data.input, practice?.specialty);
  const leer = leererVorschlag(input, resolvePrices(practice?.proposalPrices));
  if (leer) return NextResponse.json({ error: leer }, { status: 400 });
  // Schnellvorschlag: Der Datensatz trägt nur das Kürzel; die Versicherungsart kommt aus dem Vorschlag.
  // Gastzugang: dieselbe Obergrenze für Patienten wie bei Neuanlage und Import (lib/patientenImportSperre.ts).
  let patient;
  if (schnell) {
    const r = await mitPatientenGrenze({ practiceId: session.user.practiceId, demo: practice?.isDemo === true }, (tx) => tx.patient.create({
      data: { practiceId: session.user.practiceId, firstName: OHNE_AKTE, lastName: schnell.kuerzel, ohneAkte: true, insuranceType: input.patient.insurance === "PKV" ? "PKV" : "GKV" },
    }));
    if (!r.ok) return NextResponse.json({ error: r.grund, code: r.belegt ? "BELEGT" : "GRENZE" }, { status: 409 });
    patient = r.wert;
  } else {
    patient = await prisma.patient.findFirst({ where: { id: parsed.data.patientId, practiceId: session.user.practiceId } });
  }
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  const patientId = patient.id;
  if (reportId) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, practiceId: session.user.practiceId, patientId },
      select: { id: true },
    });
    if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });
  }

  const computed = computeProposal({
    input,
    choices,
    prices: resolvePrices(practice?.proposalPrices),
    patientName: nameFuerSchreiben(patient),
    practiceName: practice?.name ?? "Ihre Praxis",
    date: new Date(),
  });

  const proposal = await prisma.treatmentProposal.create({
    data: {
      practiceId: session.user.practiceId,
      patientId,
      authorId: session.user.id,
      status,
      input,
      reportId: reportId ?? null,
      ...computed,
    },
    select: { id: true },
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
