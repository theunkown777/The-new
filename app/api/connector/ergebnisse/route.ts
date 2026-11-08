import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorAnmelden, connectorInfoAus } from "@/lib/connectorAuth";
import { lieferungBestaetigen, offeneErgebnisseReservieren } from "@/lib/gdtErgebnis";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Rückweg in die Praxis: Der Connector ("--abholen", alle 2 Minuten und nach jedem
// Aufruf) holt freigegebene Ergebnisse als GDT-Dateien (6310), legt sie in den GDT-Importordner
// und bestätigt sie. Zahnarztpraxen (VDDS) bekommen freigegebene Berichte als PDF in einen Ablageordner. Antwort bewusst als einfacher Text, damit der Connector ohne Zusatzbibliothek
// auskommt: erste Zeile "SORRIDA-ERGEBNISSE 1", danach je Datei "art<TAB>id<TAB>dateiname<TAB>base64".
export async function GET(req: Request) {
  const a = await connectorAnmelden(req);
  if ("fehler" in a) return a.fehler;
  const info = connectorInfoAus(req);
  await prisma.connectorKey.update({ where: { id: a.key.id }, data: { lastUsedAt: new Date(), ...(info ? { connectorInfo: info } : {}) } });
  // Welche Wege der Connector eingerichtet hat: gdt=1 (GDT-Importordner), pdf=1 (Ablageordner). Ohne Angabe nur GDT.
  const q = new URL(req.url).searchParams;
  const wege = q.has("gdt") || q.has("pdf") ? { gdt: q.get("gdt") === "1", pdf: q.get("pdf") === "1" } : { gdt: true, pdf: false };
  const liste = await offeneErgebnisseReservieren(a.key.practiceId, a.key.id, wege);
  const zeilen = ["SORRIDA-ERGEBNISSE 1", ...liste.map((e) => [e.art, e.refId, e.dateiname, e.bytes.toString("base64")].join("\t"))];
  return new NextResponse(zeilen.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

// Bestätigung: Body je Zeile "art<TAB>id" der Dateien, die im Importordner liegen.
export async function POST(req: Request) {
  const a = await connectorAnmelden(req);
  if ("fehler" in a) return a.fehler;
  const text = (await req.text()).slice(0, 8000);
  const eintraege = text.split(/\r?\n/).map((z) => z.split("\t")).filter((t) => (t[0] === "bericht" || t[0] === "vorschlag" || t[0] === "bericht-pdf") && /^[\w-]{5,40}$/.test(t[1] ?? "")).map((t) => ({ art: t[0], refId: t[1] }));
  const n = await lieferungBestaetigen(a.key.practiceId, a.key.id, eintraege);
  if (n > 0) await audit({ practiceId: a.key.practiceId, userName: `Connector ${a.key.name}`, action: "schnittstelle.export", summary: `${n} Ergebnis(se) automatisch an die Praxis-PCs übergeben` });
  return NextResponse.json({ ok: true, bestaetigt: n });
}
