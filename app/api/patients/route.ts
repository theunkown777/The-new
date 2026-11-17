import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { mitPatientenGrenze } from "@/lib/patientenImportSperre";

// Geburtsdatum als Tag (JJJJ-MM-TT, auch mit Uhrzeit); leer erlaubt. Ein ungültiges Datum wäre sonst ein Serverfehler.
const datum = z.string().trim().max(40).refine((s) => s === "" || (/^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(new Date(s).getTime())), "Das Geburtsdatum ist ungültig.");
// Neue Patienten je Praxis und Stunde: Bremse gegen Massenanlage (Gastzugang und gestohlene Sitzungen).
const ANLAGEN_PRO_STUNDE = { demo: 60, echt: 600 };

const patientSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100),
  birthDate: datum.optional().nullable(),
  insuranceType: z.enum(["GKV", "PKV"]).optional().nullable(),
  insuranceName: z.string().max(120).optional().nullable(),
  insuranceNumber: z.string().max(40).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  email: z.string().trim().email("Die E-Mail-Adresse ist ungültig.").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  einwilligung: z.boolean().optional(),
  geschlecht: z.enum(["W", "M", "D"]).optional().nullable().or(z.literal("")),
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

  const body = await req.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { firstName, lastName, birthDate, insuranceType, insuranceName, insuranceNumber, notes } = parsed.data;
  const practiceId = session.user.practiceId;
  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } });
  if (!praxis) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await consumeAttempt(`patient-neu:${practiceId}`, praxis.isDemo ? ANLAGEN_PRO_STUNDE.demo : ANLAGEN_PRO_STUNDE.echt, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Zu viele neue Patienten in kurzer Zeit. Bitte später noch einmal versuchen." }, { status: 429 });
  }

  // Gastzugang: höchstens DEMO_PATIENTEN_MAX Patienten, auch bei vielen gleichzeitigen Anfragen (lib/patientenImportSperre.ts).
  const r = await mitPatientenGrenze({ practiceId, demo: praxis.isDemo }, (tx) => tx.patient.create({
    data: {
      practiceId,
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
      geschlecht: parsed.data.geschlecht || null,
    },
  }));
  if (!r.ok) return NextResponse.json({ error: r.grund, code: r.belegt ? "BELEGT" : "GRENZE" }, { status: 409 });

  return NextResponse.json({ patient: r.wert });
}
