import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";
import { MODELLE, markierungSchema, teilBezeichnung, type Modell } from "@/lib/modelle/markierung";

// Anatomie-Modelle: Die Praxis markiert für einen Patienten eine Stelle (Zahn, Knochen, Muskel,
// Sehne) und schreibt einen kurzen Hinweis dazu. Der Patient sieht beides in seinem Patientenlink.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = markierungSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const { modell, teil, notiz } = parsed.data;
  const anzahl = await prisma.modellMarkierung.count({ where: { patientId: patient.id, modell } });
  const vorhanden = await prisma.modellMarkierung.findUnique({ where: { patientId_modell_teil: { patientId: patient.id, modell, teil } }, select: { id: true } });
  if (!vorhanden && anzahl >= 40) return NextResponse.json({ error: "Höchstens 40 Markierungen je Patient." }, { status: 409 });
  const markierung = await prisma.modellMarkierung.upsert({
    where: { patientId_modell_teil: { patientId: patient.id, modell, teil } },
    create: { practiceId: session.user.practiceId, patientId: patient.id, modell, teil, notiz, erstelltVon: session.user.name ?? null },
    update: { notiz, erstelltVon: session.user.name ?? null },
    select: { teil: true, notiz: true },
  });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `Im Modell markiert: ${teilBezeichnung(modell, teil)}` });
  return NextResponse.json({ markierung }, { status: vorhanden ? 200 : 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const url = new URL(req.url);
  const modell = url.searchParams.get("modell") ?? "";
  const teil = url.searchParams.get("teil") ?? "";
  if (!(MODELLE as readonly string[]).includes(modell)) return NextResponse.json({ error: "Unbekanntes Modell" }, { status: 400 });
  const r = await prisma.modellMarkierung.deleteMany({ where: { patientId: patient.id, practiceId: session.user.practiceId, modell, teil } });
  if (r.count) await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `Markierung im Modell entfernt: ${teilBezeichnung(modell as Modell, teil)}` });
  return NextResponse.json({ ok: true });
}
