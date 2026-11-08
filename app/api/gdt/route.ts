import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { latin1 } from "@/lib/gdtExport";
import { alsHeruntergeladenMerken, gdtErgebnis } from "@/lib/gdtErgebnis";
import { auditFromSession } from "@/lib/audit";

// Rückgabe an die Praxissoftware als GDT-Datei (Satzart 6310). Nur für
// freigegebene Berichte und angenommene Vorschläge, und nur für Patienten,
// die über die Praxissoftware geöffnet wurden (deren Patientennummer kennt
// Sorrida dann). Die Datei legt die Praxis in den GDT-Importordner.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const url = new URL(req.url);
  const art = url.searchParams.get("art");
  const id = url.searchParams.get("id") ?? "";
  const practiceId = session.user.practiceId;
  if (art !== "bericht" && art !== "vorschlag") return NextResponse.json({ error: "Unbekannte Art" }, { status: 400 });
  const e = await gdtErgebnis(practiceId, art, id);
  if ("fehler" in e) return NextResponse.json({ error: e.fehler }, { status: e.status });
  await alsHeruntergeladenMerken(practiceId, art, id);
  await auditFromSession(session, "schnittstelle.export", { entityType: art === "bericht" ? "Bericht" : "Vorschlag", entityId: id, summary: "GDT 6310" });
  return new NextResponse(new Blob([latin1(e.inhalt) as BlobPart]), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${e.dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
