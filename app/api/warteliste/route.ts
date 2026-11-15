import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tagAlsDatum, wartelisteSchema } from "@/lib/warteliste";

const MAX_OFFEN = 300;

// Warteliste: Patienten eintragen, die früher kommen möchten.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = wartelisteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  const patient = await prisma.patient.findFirst({ where: { id: d.patientId, practiceId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  const offen = await prisma.warteliste.count({ where: { practiceId, erledigtAt: null } });
  if (offen >= MAX_OFFEN) return NextResponse.json({ error: "Die Warteliste ist voll. Bitte entfernen Sie zuerst erledigte Einträge." }, { status: 409 });
  const eintrag = await prisma.warteliste.create({
    data: {
      practiceId, patientId: patient.id, anlass: d.anlass.replace(/\s+/g, " "),
      vonTag: tagAlsDatum(d.vonTag), bisTag: tagAlsDatum(d.bisTag), zeit: d.zeit || null, notiz: d.notiz?.replace(/\s+/g, " ") || null,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: eintrag.id }, { status: 201 });
}
