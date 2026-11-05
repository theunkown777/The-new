import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";

// Schritt 2: bestätigte Zuordnungen als bezahlt buchen, mit Buchungsdatum.
const schema = z.object({ zahlungen: z.array(z.object({ rechnungId: z.string().min(1).max(40), datum: z.string() })).min(1).max(500) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  let gebucht = 0;
  for (const z of parsed.data.zahlungen) {
    const d = new Date(z.datum);
    const r = await prisma.invoice.updateMany({
      where: { id: z.rechnungId, practiceId: session.user.practiceId, status: { in: ["OFFEN", "GEMELDET"] } },
      data: { status: "BEZAHLT", paidAt: Number.isNaN(d.getTime()) ? new Date() : d },
    });
    gebucht += r.count;
  }
  await auditFromSession(session, "rechnung.status", { entityType: "Bankabgleich", summary: `${gebucht} Rechnungen per Kontoauszug als bezahlt gebucht` });
  return NextResponse.json({ gebucht });
}
