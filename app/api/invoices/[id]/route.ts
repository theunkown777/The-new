import { auditFromSession, audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoiceActionSchema } from "@/lib/invoices";

// Status einer Rechnung ändern: bezahlt, storniert, wieder offen oder Erinnerung vermerken.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = invoiceActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  const now = new Date();
  if (parsed.data.action === "erinnert") {
    const inv = await prisma.invoice.findFirst({ where: { id: params.id, practiceId: session.user.practiceId }, select: { reminderLevel: true } });
    if (!inv) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
    // Gewünschte Stufe setzen (nie zurück), damit doppelte Klicks nicht zwei Stufen überspringen.
    const level = Math.max(inv.reminderLevel, parsed.data.level ?? Math.min(3, inv.reminderLevel + 1));
    await prisma.invoice.update({ where: { id: params.id }, data: { remindedAt: now, reminderLevel: level } });
    await auditFromSession(session, "rechnung.status", { entityType: "Rechnung", entityId: params.id, summary: `Erinnerung Stufe ${level}` });
    return NextResponse.json({ ok: true });
  }
  const data =
    parsed.data.action === "bezahlt"
      ? { status: "BEZAHLT", paidAt: now }
      : parsed.data.action === "storniert"
        ? { status: "STORNIERT", paidAt: null }
        : parsed.data.action === "offen"
          ? { status: "OFFEN", paidAt: null, reportedPaidAt: null }
          : { remindedAt: now };
  const res = await prisma.invoice.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data });
  if (res.count === 0) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  await auditFromSession(session, "rechnung.status", { entityType: "Rechnung", entityId: params.id, summary: parsed.data.action });
  return NextResponse.json({ ok: true });
}
