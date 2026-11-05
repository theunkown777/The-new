import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patientSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  birthDate: z.string().optional().nullable(),
  insuranceType: z.enum(["GKV", "PKV"]).optional().nullable(),
  insuranceName: z.string().optional().nullable(),
  insuranceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  email: z.string().trim().email("Die E-Mail-Adresse ist ungültig.").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  einwilligung: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const patients = await prisma.patient.findMany({
    where: {
      practiceId: session.user.practiceId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ patients });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { firstName, lastName, birthDate, insuranceType, insuranceName, insuranceNumber, notes } = parsed.data;

  const patient = await prisma.patient.create({
    data: {
      practiceId: session.user.practiceId,
      firstName,
      lastName,
      birthDate: birthDate ? new Date(birthDate) : null,
      insuranceType: insuranceType || null,
      insuranceName: insuranceName || null,
      insuranceNumber: insuranceNumber || null,
      notes: notes || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      contactConsentAt: parsed.data.einwilligung && parsed.data.email ? new Date() : null,
    },
  });

  return NextResponse.json({ patient });
}
