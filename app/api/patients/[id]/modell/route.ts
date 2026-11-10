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
  const { modell, teile, notiz, befund, befundGesetzt } = parsed.data;
  const vorhanden = await prisma.modellMarkierung.findMany({ where: { patientId: patient.id, modell }, select: { teil: true } });
  const schon = new Set(vorhanden.map((v) => v.teil));
  const neu = teile.filter((t) => !schon.has(t)).length;
  if (vorhanden.length + neu > 40) return NextResponse.json({ error: "Höchstens 40 Markierungen je Patient." }, { status: 409 });
  const von = session.user.name ?? null;
  const markierungen = await prisma.$transaction(
    teile.map((teil) =>
      prisma.modellMarkierung.upsert({
        where: { patientId_modell_teil: { patientId: patient.id, modell, teil } },
        create: { practiceId: session.user.practiceId, patientId: patient.id, modell, teil, notiz, befund, erstelltVon: von },
        // Ohne Angabe bleibt ein früher gewählter Befund stehen.
        update: { notiz, erstelltVon: von, ...(befundGesetzt ? { befund } : {}) },
        select: { teil: true, notiz: true, befund: true },
      }),
    ),
  );
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `Im Modell markiert: ${teile.slice(0, 6).map((t) => teilBezeichnung(modell, t)).join(", ")}${teile.length > 6 ? ` und ${teile.length - 6} weitere` : ""}` });
  return NextResponse.json({ markierung: markierungen[0], markierungen }, { status: neu ? 201 : 200 });
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
