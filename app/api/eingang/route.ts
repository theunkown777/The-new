import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Eingang abhaken: einzelner Eintrag (erledigt / wieder offen) oder alle offenen auf einmal.
const schema = z.union([z.object({ id: z.string().min(1).max(40), erledigt: z.boolean() }), z.object({ alle: z.literal(true) })]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const practiceId = session.user.practiceId;
  const von = session.user.name ?? "Praxis";
  if ("alle" in parsed.data) {
    const r = await prisma.eingang.updateMany({ where: { practiceId, erledigtAt: null }, data: { erledigtAt: new Date(), erledigtVon: von } });
    return NextResponse.json({ ok: true, anzahl: r.count });
  }
  const r = await prisma.eingang.updateMany({
    where: { id: parsed.data.id, practiceId },
    data: parsed.data.erledigt ? { erledigtAt: new Date(), erledigtVon: von } : { erledigtAt: null, erledigtVon: null },
  });
  if (r.count === 0) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
