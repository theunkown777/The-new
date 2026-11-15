import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { standortSchema } from "@/lib/termine";
import { auditFromSession } from "@/lib/audit";
import { verliertEinschraenkung } from "@/lib/standortRechte";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = standortSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const r = await prisma.location.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data: { ...parsed.data, address: parsed.data.address || null } });
  if (!r.count) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "standort", { entityType: "Standort", entityId: params.id, summary: "geändert" });
  return NextResponse.json({ ok: true });
}

// Termine des Standorts bleiben erhalten und verlieren nur die Zuordnung.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, error } = await requireAdmin();
  if (error) return error;
  // Rechte je Standort: Wer nur diesem Standort zugeordnet ist, stünde danach ohne
  // Zuordnung da und sähe plötzlich alle Standorte. Erst die Zuordnung ändern lassen.
  const konten = await prisma.user.findMany({
    where: { practiceId: session.user.practiceId, role: { not: "admin" }, standorte: { some: { locationId: params.id } } },
    select: { name: true, standorte: { select: { locationId: true } } },
  });
  const betroffen = verliertEinschraenkung(konten.map((k) => ({ name: k.name, standortIds: k.standorte.map((s) => s.locationId) })), params.id);
  if (betroffen.length) {
    return NextResponse.json(
      { error: `Diesem Standort ${betroffen.length === 1 ? "ist" : "sind"} ${betroffen.map((k) => k.name).join(", ")} als einzigem Standort zugeordnet. Bitte zuerst unter Einstellungen → Team die Zuordnung ändern – sonst gälten für ${betroffen.length === 1 ? "diese Person" : "diese Personen"} danach alle Standorte.` },
      { status: 409 },
    );
  }
  const r = await prisma.location.deleteMany({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!r.count) return NextResponse.json({ error: "Standort nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "standort", { entityType: "Standort", entityId: params.id, summary: "entfernt" });
  return NextResponse.json({ ok: true });
}
