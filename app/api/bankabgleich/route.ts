import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abgleichen, parseKontoauszug } from "@/lib/bankabgleich";

// Schritt 1: Kontoauszug hochladen, Zuordnung vorschlagen. Es wird nichts
// gespeichert, weder Datei noch Buchungen; erst die Bestätigung bucht.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Die Datei ist größer als 5 MB." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  // Banken liefern CSV oft in Windows-1252; UTF-8 erkennen, sonst latin1.
  const utf8 = buf.toString("utf8");
  const text = utf8.includes("�") ? buf.toString("latin1") : utf8;
  const buchungen = parseKontoauszug(text);
  if (!buchungen.length) return NextResponse.json({ error: "Keine Buchungen erkannt. Unterstützt: CAMT.053 (XML) und CSV-Export mit Spalten Buchungstag, Verwendungszweck, Betrag." }, { status: 422 });
  const offen = await prisma.invoice.findMany({
    where: { practiceId: session.user.practiceId, status: { in: ["OFFEN", "GEMELDET"] } },
    select: { id: true, number: true, amountCent: true, patient: { select: { firstName: true, lastName: true } } },
  });
  const { treffer, ohneZuordnung } = abgleichen(buchungen, offen.map((r) => ({ id: r.id, number: r.number, amountCent: r.amountCent, firstName: r.patient.firstName, lastName: r.patient.lastName })));
  return NextResponse.json({
    eingaenge: buchungen.filter((b) => b.eingang).length,
    treffer: treffer.map((t) => ({ rechnungId: t.rechnung.id, nummer: t.rechnung.number, patient: `${t.rechnung.firstName} ${t.rechnung.lastName}`, sollCent: t.rechnung.amountCent, istCent: t.buchung.betragCent, datum: t.buchung.datum, zweck: t.buchung.zweck, guete: t.guete })),
    ohneZuordnung: ohneZuordnung.slice(0, 50).map((b) => ({ datum: b.datum, betragCent: b.betragCent, zweck: b.zweck, name: b.name })),
  });
}
