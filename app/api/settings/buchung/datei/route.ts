import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { belegungenErsetzen } from "@/lib/kalenderSync";

// Kalenderdatei (.ics) hochladen: Export aus dem Praxisprogramm oder Kalender. Übernommen werden
// nur die belegten Zeiten; die Datei selbst wird nicht gespeichert.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Geschäftsführung kann den Kalender übertragen." }, { status: 403 });
  const text = await req.text();
  if (text.length > 3 * 1024 * 1024) return NextResponse.json({ error: "Die Datei ist zu groß (über 3 MB)." }, { status: 413 });
  if (!/BEGIN:VCALENDAR/i.test(text)) return NextResponse.json({ error: "Das ist keine Kalenderdatei (.ics). Bitte aus dem Kalender als iCalendar exportieren." }, { status: 400 });
  const anzahl = await belegungenErsetzen(session.user.practiceId, "datei", text);
  return NextResponse.json({ ok: true, anzahl });
}
