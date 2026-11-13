import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ aktion: z.enum(["nachgefasst", "hkp", "hkp-zurueck"]) });

// Nachfass-Liste: festhalten, dass erinnert wurde bzw. dass der Heil- und Kostenplan bei der Kasse liegt.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const jetzt = new Date();
  const data =
    parsed.data.aktion === "nachgefasst" ? { nachgefasstAt: jetzt } : { hkpEingereichtAt: parsed.data.aktion === "hkp" ? jetzt : null };
  // updateMany mit practiceId: fremde Vorschläge bleiben unberührt.
  const r = await prisma.treatmentProposal.updateMany({ where: { id: params.id, practiceId: session.user.practiceId }, data });
  if (r.count === 0) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
