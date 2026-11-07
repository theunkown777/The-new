import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { katalogEintrag } from "@/lib/amtlich/katalog";

// Amtliche Leistung in den eigenen Abrechnungskatalog übernehmen (nur Admins).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = z.object({ ids: z.array(z.string().max(40)).min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });
  const practiceId = session.user.practiceId;
  const amtlich = await prisma.amtlicheLeistung.findMany({ where: { id: { in: parsed.data.ids } } });
  const vorhanden = await prisma.serviceCatalogItem.findMany({ where: { practiceId, OR: amtlich.map((a) => ({ code: a.code.slice(0, 40), system: katalogEintrag(a).system })) }, select: { code: true, system: true } });
  const schon = new Set(vorhanden.map((v) => `${v.system}|${v.code}`));
  const neu = amtlich.map((a) => katalogEintrag(a)).filter((e) => !schon.has(`${e.system}|${e.code}`));
  if (neu.length) await prisma.serviceCatalogItem.createMany({ data: neu.map((e) => ({ ...e, practiceId })) });
  return NextResponse.json({ uebernommen: neu.length, schonVorhanden: amtlich.length - neu.length });
}
