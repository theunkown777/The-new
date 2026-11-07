import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { uebernehme } from "@/lib/amtlich/uebernahme";
import { parseDependsOn } from "@/lib/serviceDependency";

// Amtliche Leistungen zu einer Sitzung hinzufügen: legt sie bei Bedarf im Praxiskatalog an
// (amtliche Werte, keine Preise der Praxis) und liefert die Katalogpositionen für das Formular.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = z.object({ ids: z.array(z.string().max(40)).min(1).max(50) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Auswahl" }, { status: 400 });
  const { items } = await uebernehme(session.user.practiceId, parsed.data.ids);
  return NextResponse.json({ items: items.map((i) => ({ ...i, ausschlussMit: parseDependsOn(i.ausschlussMit) })) });
}
