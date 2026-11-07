import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { alsWindows1252, datevBuchungen, datevDateiname, datevSchema, datevStapel } from "@/lib/datev";

// DATEV-Buchungsstapel für die Steuerberatung. Nur für Admins: enthält
// Umsätze der Praxis. Buchungstexte ohne Namen, Diagnosen oder Behandlungen.

const tag = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export async function GET(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const vonS = tag(url.searchParams.get("von"));
  const bisS = tag(url.searchParams.get("bis"));
  if (!vonS || !bisS) return NextResponse.json({ error: "Bitte Zeitraum angeben (von, bis)." }, { status: 400 });
  const von = new Date(`${vonS}T00:00:00`);
  const bis = new Date(`${bisS}T23:59:59.999`);
  if (bis < von || von.getFullYear() !== bis.getFullYear())
    return NextResponse.json({ error: "Der Zeitraum muss im selben Wirtschaftsjahr liegen." }, { status: 400 });

  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { datev: true } });
  const e = datevSchema.safeParse(practice?.datev ?? {});
  if (!e.success)
    return NextResponse.json(
      { error: practice?.datev ? `DATEV-Einstellungen prüfen: ${e.error.issues[0]?.message ?? "ungültig"}` : "Bitte zuerst Berater- und Mandantennummer hinterlegen." },
      { status: 409 },
    );

  const rechnungen = await prisma.invoice.findMany({
    where: { practiceId: session.user.practiceId, OR: [{ createdAt: { gte: von, lte: bis } }, { paidAt: { gte: von, lte: bis } }] },
    select: { number: true, amountCent: true, status: true, createdAt: true, paidAt: true, paidVia: true },
  });
  const buchungen = datevBuchungen(rechnungen, e.data, von, bis);
  await auditFromSession(session, "datev.export", { summary: `${vonS} bis ${bisS}, ${buchungen.length} Buchungen` });
  return new NextResponse(Buffer.from(alsWindows1252(datevStapel(buchungen, e.data, von, bis))), {
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${datevDateiname(von, bis)}"`,
      "Cache-Control": "no-store",
      "X-Buchungen": String(buchungen.length),
    },
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = datevSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { datev: parsed.data } });
  return NextResponse.json({ ok: true });
}
