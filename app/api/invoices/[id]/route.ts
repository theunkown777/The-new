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
  return NextResponse.json({ ok: true });
}
