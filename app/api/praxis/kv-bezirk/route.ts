import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { KV_BEZIRKE } from "@/lib/amtlich/gliederung";

// KV-Bezirk der Praxis: bestimmt, welche regionalen KV-Ziffern sie sieht.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = z.object({ kvBezirk: z.enum(KV_BEZIRKE.map((k) => k.id) as [string, ...string[]]).nullable() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unbekannter KV-Bezirk" }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { kvBezirk: parsed.data.kvBezirk } });
  return NextResponse.json({ ok: true });
}
