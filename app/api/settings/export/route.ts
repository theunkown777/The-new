import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";

// Gesamtexport der Praxis: eigene Sicherung und Rückgabe der Daten bei
// Vertragsende (AVV, Art. 28 Abs. 3 lit. g DSGVO). Ohne Passwort-Hashes,
// 2FA-Geheimnisse und Token-Hashes. Dokumente als Liste; die Dateien selbst
// lädt man einzeln aus der Akte (Größenlimit einer Antwort).
export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const practiceId = session.user.practiceId;
  const ohne = <T extends Record<string, unknown>>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => !/hash|secret|backupcodes|password/i.test(k)));
  const [practice, users, locations, catalog, templates, auditLog, anzahl] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId } }),
    prisma.user.findMany({ where: { practiceId } }),
    prisma.location.findMany({ where: { practiceId } }),
    prisma.serviceCatalogItem.findMany({ where: { practiceId } }),
    prisma.serviceTemplate.findMany({ where: { practiceId }, include: { items: true } }),
    prisma.auditLog.findMany({ where: { practiceId }, orderBy: { createdAt: "asc" } }),
    prisma.patient.count({ where: { practiceId } }),
  ]);
  await auditFromSession(session, "patient.export", { entityType: "Praxis", entityId: practiceId, summary: `Gesamtexport, ${anzahl} Patienten` });
  const kopf = {
    hinweis: "Gesamtexport aus Sorrida (JSON). Enthält alle Daten der Praxis ohne Zugangsgeheimnisse. Dokumentdateien einzeln aus der Akte laden.",
    erstelltAm: new Date().toISOString(),
    praxis: practice ? ohne(practice as unknown as Record<string, unknown>) : null,
    konten: users.map((u) => ohne(u as unknown as Record<string, unknown>)),
    standorte: locations,
    eigeneLeistungen: catalog,
    vorlagen: templates,
    protokoll: auditLog,
  };
  const enc = new TextEncoder();
  // Patienten in Paketen laden und streamen: kein Größenlimit, wenig Speicher.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const k = JSON.stringify(kopf);
      controller.enqueue(enc.encode(k.slice(0, -1) + ',"patienten":['));
      let cursor: string | undefined;
      let erster = true;
      for (;;) {
        const batch = await prisma.patient.findMany({
          where: { practiceId },
          orderBy: { id: "asc" },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            reports: { include: { serviceEntries: true, revisions: true } },
            proposals: true,
            anamnesisForms: true,
            invoices: true,
            entries: true,
            appointments: true,
            documents: { select: { id: true, name: true, mime: true, size: true, createdAt: true, createdBy: true } },
          },
        });
        for (const p of batch) {
          const row = {
            ...ohne(p as unknown as Record<string, unknown>),
            anamnesisForms: p.anamnesisForms.map((f) => ohne(f as unknown as Record<string, unknown>)),
            proposals: p.proposals.map((x) => ohne(x as unknown as Record<string, unknown>)),
          };
          controller.enqueue(enc.encode((erster ? "" : ",") + JSON.stringify(row)));
          erster = false;
        }
        if (batch.length < 100) break;
        cursor = batch[batch.length - 1].id;
      }
      controller.enqueue(enc.encode("]}"));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sorrida-gesamtexport-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
