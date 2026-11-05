import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildGdt6310, latin1 } from "@/lib/gdtExport";
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
  const patSel = { select: { id: true, firstName: true, lastName: true, birthDate: true, externalSource: true, externalId: true } } as const;

  let patient, titel: string, text: string, datum: Date;
  if (art === "bericht") {
    const r = await prisma.report.findFirst({ where: { id, practiceId }, include: { patient: patSel } });
    if (!r) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });
    if (r.status !== "FINAL") return NextResponse.json({ error: "Nur freigegebene Berichte gehen an die Praxissoftware." }, { status: 409 });
    patient = r.patient;
    titel = r.type === "KRANKENKASSE" ? "Schreiben an die Krankenkasse (Sorrida)" : "Befundbericht (Sorrida)";
    text = `${r.editedText ?? r.generatedText ?? ""}\n\nFreigegeben von ${r.approvedByName ?? "unbekannt"}${r.approvedAt ? ` am ${r.approvedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}` : ""}.`;
    datum = r.treatmentDate ?? r.createdAt;
  } else if (art === "vorschlag") {
    const p = await prisma.treatmentProposal.findFirst({ where: { id, practiceId }, include: { patient: patSel } });
    if (!p) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
    if (p.status !== "ANGENOMMEN") return NextResponse.json({ error: "Nur angenommene Vorschläge gehen an die Praxissoftware." }, { status: 409 });
    patient = p.patient;
    titel = "Behandlungsvereinbarung (Sorrida)";
    const eur = (c: number) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " EUR";
    text = [
      `Behandlungsvorschlag vom ${p.createdAt.toLocaleDateString("de-DE")} vom Patienten angenommen.`,
      `Eigenanteil: ${eur(p.eigenanteilCent)}.`,
      p.agreedAt ? `Vereinbarung digital unterschrieben am ${p.agreedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}; PDF in Sorrida.` : "Keine digitale Unterschrift in Sorrida.",
    ].join("\n");
    datum = p.agreedAt ?? p.updatedAt;
  } else {
    return NextResponse.json({ error: "Unbekannte Art" }, { status: 400 });
  }
  if (!patient.externalId) {
    return NextResponse.json({ error: "Dieser Patient wurde nicht aus der Praxissoftware geöffnet; Sorrida kennt seine Patientennummer dort nicht. Bitte einmal aus der Praxissoftware heraus öffnen." }, { status: 409 });
  }
  const receiver = (patient.externalSource ?? "").replace(/^GDT-/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "PVS";
  const gdt = buildGdt6310({ patId: patient.externalId, lastName: patient.lastName, firstName: patient.firstName, birthDate: patient.birthDate, receiver, datum, titel, text });
  await auditFromSession(session, "schnittstelle.export", { entityType: art === "bericht" ? "Bericht" : "Vorschlag", entityId: id, summary: "GDT 6310" });
  return new NextResponse(new Blob([latin1(gdt) as BlobPart]), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="SORRIDA_${patient.externalId.replace(/[^A-Za-z0-9]/g, "")}.gdt"`,
      "Cache-Control": "no-store",
    },
  });
}
