import { praxisFach } from "@/lib/katalogScope";
import { sichtbarFuer } from "@/lib/katalogScope";
import { auditFromSession } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoGuard } from "@/lib/demoGuard";
import { kiFehlerGrund, generateReportText } from "@/lib/anthropic";
import { buildServiceSummary } from "@/lib/serviceSummary";
import { computeEffectivePerformed, parseDependsOn } from "@/lib/serviceDependency";
import { validateFaktor, findExclusionConflicts, validateGueltigkeit } from "@/lib/serviceRules";

const entrySchema = z.object({
  catalogItemId: z.string().min(1),
  performed: z.boolean(),
  toothNumbers: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  note: z.string().optional().nullable(),
  faktor: z.number().min(0).max(10).optional().nullable(),
  begruendung: z.string().optional().nullable(),
});

const createSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(["BEFUND", "KRANKENKASSE"]),
  treatmentDate: z.string().optional().nullable(),
  serviceTemplateId: z.string().min(1),
  entries: z.array(entrySchema).min(1),
  reviewConfirmed: z.boolean(),
  additionalContext: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const blocked = await demoGuard(session.user.practiceId, "report");
  if (blocked) return blocked;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { patientId, type, treatmentDate, serviceTemplateId, entries, reviewConfirmed, additionalContext } =
    parsed.data;

  if (!reviewConfirmed) {
    return NextResponse.json(
      { error: "Bitte bestätigen Sie, dass die Leistungsliste vollständig geprüft wurde." },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.user.practiceId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  }

  const template = await prisma.serviceTemplate.findFirst({
    where: {
      id: serviceTemplateId,
      ...(await sichtbarFuer(session.user.practiceId)),
    },
    include: { items: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Leistungsvorlage nicht gefunden" }, { status: 404 });
  }

  // Lückenlosigkeit erzwingen: jede Position der Vorlage muss genau einmal
  // in den eingereichten Einträgen enthalten sein - keine Position darf
  // fehlen oder unentschieden bleiben.
  const requiredItemIds = new Set(template.items.map((i) => i.catalogItemId));
  const submittedItemIds = new Set(entries.map((e) => e.catalogItemId));

  if (submittedItemIds.size !== entries.length) {
    return NextResponse.json({ error: "Eine Position ist doppelt in der Leistungsliste." }, { status: 400 });
  }
  // Zusätzlich zur Vorlage dürfen Positionen aus dem Katalog der Praxis ergänzt werden
  // (z. B. aus dem Leistungsverzeichnis beim Sitzungstyp); fremde Positionen nicht.
  const zusatzIds = Array.from(submittedItemIds).filter((id) => !requiredItemIds.has(id));
  if (zusatzIds.length) {
    const erlaubt = await prisma.serviceCatalogItem.count({
      where: { id: { in: zusatzIds }, ...(await sichtbarFuer(session.user.practiceId)) },
    });
    if (erlaubt !== zusatzIds.length) {
      return NextResponse.json(
        { error: "Leistungsliste ist unvollständig oder enthält unbekannte Positionen." },
        { status: 400 }
      );
    }
  }
  for (const id of requiredItemIds) {
    if (!submittedItemIds.has(id)) {
      return NextResponse.json(
        { error: "Leistungsliste ist unvollständig: Es fehlt mindestens eine Position der Vorlage." },
        { status: 400 }
      );
    }
  }

  const catalogItems = await prisma.serviceCatalogItem.findMany({
    where: { id: { in: Array.from(submittedItemIds) } },
  });
  const catalogItemById = new Map(catalogItems.map((c) => [c.id, c]));

  // Serverseitige Absicherung der Abhängigkeitsketten: unabhängig davon, was
  // der Client als "performed" meldet, wird hier neu berechnet, ob eine
  // Position angesichts ihrer Voraussetzungen tatsächlich stattgefunden
  // haben kann. Ein manipulierter Request kann die Kaskade damit nicht
  // umgehen.
  const ownPerformedById: Record<string, boolean> = {};
  entries.forEach((e) => {
    ownPerformedById[e.catalogItemId] = e.performed;
  });
  const dependencyItems = [
    ...template.items.map((i) => ({ id: i.catalogItemId, dependsOn: parseDependsOn(i.dependsOn) })),
    ...zusatzIds.map((id) => ({ id, dependsOn: [] as string[] })),
  ];
  const effectiveById = computeEffectivePerformed(dependencyItems, ownPerformedById);

  const entriesWithCatalog = entries.map((e) => {
    const catalogItem = catalogItemById.get(e.catalogItemId);
    if (!catalogItem) throw new Error("Unbekannte Katalogposition");
    return {
      performed: effectiveById[e.catalogItemId] ?? false,
      toothNumbers: e.toothNumbers ?? null,
      quantity: e.quantity,
      note: e.note ?? null,
      catalogItem,
    };
  });

  const treatmentDateObj = treatmentDate ? new Date(treatmentDate) : null;

  // Faktor-Regeln (§5 GOZ-Logik): Faktor muss im erlaubten Bereich liegen,
  // und ab dem Regelhöchstfaktor ist eine schriftliche Begründung Pflicht.
  for (const e of entries) {
    if (!(effectiveById[e.catalogItemId] ?? false)) continue;
    const catalogItem = catalogItemById.get(e.catalogItemId);
    if (!catalogItem) continue;
    const error = validateFaktor(e.faktor, e.begruendung, catalogItem, catalogItem.title);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  // Gültigkeitszeitraum: das Behandlungsdatum muss innerhalb des
  // gueltigAb/gueltigBis-Fensters der Katalogposition liegen (z. B. keine
  // PAR-Position vor der Reform vom 1.7.2021).
  for (const e of entries) {
    if (!(effectiveById[e.catalogItemId] ?? false)) continue;
    const catalogItem = catalogItemById.get(e.catalogItemId);
    if (!catalogItem) continue;
    const error = validateGueltigkeit(
      treatmentDateObj,
      { gueltigAb: catalogItem.gueltigAb, gueltigBis: catalogItem.gueltigBis },
      catalogItem.title
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  // Ausschluss-Regeln: nicht gleichzeitig abrechenbare Positionen dürfen
  // nicht beide effektiv erbracht sein (z. B. zwei Füllungsarten am selben
  // Zahn in derselben Sitzung).
  const exclusionItemsById = new Map(
    catalogItems.map((c) => [c.id, { id: c.id, title: c.title, ausschlussMit: parseDependsOn(c.ausschlussMit) }])
  );
  const performedIds = entries
    .filter((e) => effectiveById[e.catalogItemId] ?? false)
    .map((e) => e.catalogItemId);
  const conflicts = findExclusionConflicts(performedIds, exclusionItemsById);
  if (conflicts.length > 0) {
    const { a, b } = conflicts[0];
    return NextResponse.json(
      {
        error: `"${a.title}" und "${b.title}" dürfen laut Katalog nicht gemeinsam abgerechnet werden. Bitte eine der beiden Positionen streichen.`,
      },
      { status: 400 }
    );
  }

  // Frequenzlimit: manche Positionen dürfen je Patient nur eine begrenzte
  // Anzahl innerhalb eines Zeitraums abgerechnet werden (z. B. PZR 2x pro
  // Jahr). Prüft gegen bereits erfasste ReportServiceEntry-Einträge
  // desselben Patienten.
  if (treatmentDateObj) {
    for (const e of entries) {
      if (!(effectiveById[e.catalogItemId] ?? false)) continue;
      const catalogItem = catalogItemById.get(e.catalogItemId);
      if (!catalogItem?.frequenzlimitAnzahl || !catalogItem.frequenzlimitZeitraumTage) continue;

      const windowStart = new Date(
        treatmentDateObj.getTime() - catalogItem.frequenzlimitZeitraumTage * 24 * 60 * 60 * 1000
      );
      const priorCount = await prisma.reportServiceEntry.count({
        where: {
          catalogItemId: catalogItem.id,
          performed: true,
          report: {
            patientId,
            practiceId: session.user.practiceId,
            treatmentDate: { gte: windowStart, lt: treatmentDateObj },
          },
        },
      });
      if (priorCount >= catalogItem.frequenzlimitAnzahl) {
        return NextResponse.json(
          {
            error: `"${catalogItem.title}" wurde für diesen Patienten in den letzten ${catalogItem.frequenzlimitZeitraumTage} Tagen bereits ${priorCount}x abgerechnet (Limit: ${catalogItem.frequenzlimitAnzahl}x).`,
          },
          { status: 400 }
        );
      }
    }
  }

  const serviceSummary = buildServiceSummary(entriesWithCatalog);

  let generatedText: string;
  try {
    generatedText = await generateReportText({
      fach: await praxisFach(session.user.practiceId),
      reportType: type,
      practiceName: session.user.practiceName,
      authorName: session.user.name ?? "",
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate ? patient.birthDate.toLocaleDateString("de-DE") : null,
        insuranceName: patient.insuranceName,
        insuranceNumber: patient.insuranceNumber,
      },
      treatmentDate: treatmentDateObj ? treatmentDateObj.toLocaleDateString("de-DE") : null,
      serviceSummary,
      additionalContext: additionalContext || null,
    });
  } catch (err) {
    console.error("Fehler bei der Berichtsgenerierung:", err);
    return NextResponse.json(
      { error: `Der Bericht konnte nicht erstellt werden: ${kiFehlerGrund(err)}` },
      { status: 502 }
    );
  }

  const report = await prisma.report.create({
    data: {
      practiceId: session.user.practiceId,
      patientId,
      authorId: session.user.id,
      type,
      treatmentDate: treatmentDateObj,
      serviceTemplateId: template.id,
      serviceSummary,
      reviewConfirmed: true,
      additionalContext: additionalContext || null,
      generatedText,
      serviceEntries: {
        create: entries.map((e, i) => ({
          catalogItemId: e.catalogItemId,
          performed: effectiveById[e.catalogItemId] ?? false,
          toothNumbers: e.toothNumbers || null,
          quantity: e.quantity,
          note: e.note || null,
          faktor: e.faktor ?? null,
          begruendung: e.begruendung || null,
          position: i,
        })),
      },
    },
  });

  await auditFromSession(session, "bericht.ki", {
    entityType: "Bericht",
    entityId: report.id,
    summary: generatedText?.startsWith("[TESTMODUS") ? "Testmodus ohne KI" : "Entwurf, pseudonymisiert an KI-Dienst",
  });
  return NextResponse.json({ report });
}
