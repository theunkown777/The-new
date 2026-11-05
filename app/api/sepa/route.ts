import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { buildPain008, fruehestesEinzugsdatum, mandatsReferenz } from "@/lib/sepa";
import { auditFromSession } from "@/lib/audit";

// pain.008-Datei für alle offenen Rechnungen mit Lastschriftmandat, die noch
// nicht exportiert wurden. Die Praxis lädt sie im Online-Banking hoch.
// Nach dem Export sind die Posten markiert, damit nichts doppelt eingezogen wird.
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const practiceId = session.user.practiceId;
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, accountHolder: true, iban: true, bic: true, glaeubigerId: true } });
  if (!practice?.iban || !practice.glaeubigerId) {
    return NextResponse.json({ error: "Bitte zuerst IBAN und Gläubiger-ID der Praxis hinterlegen." }, { status: 409 });
  }
  const posten = await prisma.invoice.findMany({
    where: { practiceId, status: "OFFEN", sepaMandatAt: { not: null }, sepaExportedAt: null, sepaIban: { not: null } },
    orderBy: { number: "asc" },
  });
  if (!posten.length) return NextResponse.json({ error: "Keine neuen Lastschriften." }, { status: 404 });
  const now = new Date();
  const msgId = `SOR-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getTime().toString(36).toUpperCase()}`;
  let xml: string;
  try {
    xml = buildPain008(
      { name: practice.accountHolder || practice.name, iban: practice.iban, bic: practice.bic, glaeubigerId: practice.glaeubigerId },
      posten.map((i) => ({ endToEndId: i.number, betragCent: i.amountCent, mandatsRef: mandatsReferenz(i.number), mandatsDatum: i.sepaMandatAt!, name: i.sepaName ?? "", iban: i.sepaIban!, zweck: `Rechnung ${i.number} ${i.title}` })),
      { msgId, einzug: fruehestesEinzugsdatum(now), now },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
  await prisma.invoice.updateMany({ where: { id: { in: posten.map((p) => p.id) } }, data: { sepaExportedAt: now } });
  await auditFromSession(session, "rechnung.status", { entityType: "SEPA", summary: `${posten.length} Lastschriften als pain.008 exportiert` });
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${msgId}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
