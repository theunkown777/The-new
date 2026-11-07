import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/permissions";
import { uebernehme } from "@/lib/amtlich/uebernahme";

// Amtliche Leistung in den eigenen Abrechnungskatalog übernehmen (nur Admins).
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const parsed = z.object({ ids: z.array(z.string().max(40)).min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });
  const r = await uebernehme(session.user.practiceId, parsed.data.ids);
  return NextResponse.json({ uebernommen: r.neu, schonVorhanden: r.schonVorhanden });
}
