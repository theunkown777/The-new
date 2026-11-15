import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Eingang abhaken: einzelner Eintrag (erledigt / wieder offen) oder alle offenen auf einmal.
// Dazu: „Ich übernehme“ (Zuständigkeit) und „Rückgängig“ für mehrere Einträge auf einmal.
const schema = z.union([
  z.object({ id: z.string().min(1).max(40), erledigt: z.boolean() }),
  z.object({ id: z.string().min(1).max(40), uebernehmen: z.boolean() }),
  z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(200), erledigt: z.literal(false) }),
  z.object({ alle: z.literal(true) }),
]);

/** Zahl der offenen Einträge, für den Hinweis im Browser-Tab. Keine Namen. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const offen = await prisma.eingang.count({ where: { practiceId: session.user.practiceId, erledigtAt: null } });
  return NextResponse.json({ offen }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const practiceId = session.user.practiceId;
  const von = session.user.name ?? "Praxis";
  if ("alle" in parsed.data) {
    // Die betroffenen Einträge zurückgeben, damit „Rückgängig“ genau diese wieder öffnet.
    const offen = await prisma.eingang.findMany({ where: { practiceId, erledigtAt: null }, select: { id: true }, take: 200 });
    const ids = offen.map((e) => e.id);
    const r = await prisma.eingang.updateMany({ where: { practiceId, id: { in: ids }, erledigtAt: null }, data: { erledigtAt: new Date(), erledigtVon: von } });
    return NextResponse.json({ ok: true, anzahl: r.count, ids });
  }
  if ("ids" in parsed.data) {
    const r = await prisma.eingang.updateMany({ where: { practiceId, id: { in: parsed.data.ids } }, data: { erledigtAt: null, erledigtVon: null } });
    return NextResponse.json({ ok: true, anzahl: r.count });
  }
  if ("uebernehmen" in parsed.data) {
    const r = await prisma.eingang.updateMany({
      where: { id: parsed.data.id, practiceId },
      data: parsed.data.uebernehmen ? { zustaendigId: session.user.id, zustaendigName: von } : { zustaendigId: null, zustaendigName: null },
    });
    if (r.count === 0) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const r = await prisma.eingang.updateMany({
    where: { id: parsed.data.id, practiceId },
    data: parsed.data.erledigt ? { erledigtAt: new Date(), erledigtVon: von } : { erledigtAt: null, erledigtVon: null },
  });
  if (r.count === 0) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
