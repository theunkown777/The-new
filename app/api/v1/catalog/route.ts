import { NextResponse } from "next/server";
import { authenticateAndRateLimitApiRequest } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { parseDependsOn } from "@/lib/serviceDependency";
import { katalogFachFuerApi } from "@/lib/berichtApi";

// Referenzkatalog + Vorlagen als Nachschlagedaten für Partner, die die
// eigene Ziffern-/Vorlagenstruktur mit unserer abgleichen oder direkt
// übernehmen möchten. Nur die globalen (praxisunabhängigen) Positionen -
// keine Praxis- oder Patientendaten. Gefiltert nach dem Fach aus ?fach=, sonst dem Fach des Schlüssels;
// ohne beides alle Fächer, jede Position mit ihrem Fach (openapi.yaml).
export async function GET(req: Request) {
  const auth = await authenticateAndRateLimitApiRequest(req);
  if (!auth.client) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  const gewaehlt = katalogFachFuerApi(new URL(req.url).searchParams.get("fach"), auth.client.fach);
  if (!gewaehlt.ok) return NextResponse.json({ error: "Unbekannte Fachrichtung (fach)" }, { status: 400 });
  const fach = gewaehlt.fach ?? undefined;

  const [catalogItems, templates] = await Promise.all([
    prisma.serviceCatalogItem.findMany({ where: { practiceId: null, fach } }),
    prisma.serviceTemplate.findMany({
      where: { practiceId: null, fach },
      orderBy: { name: "asc" },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  ]);

  return NextResponse.json({
    catalog: catalogItems.map((c) => ({
      id: c.id,
      fach: c.fach,
      system: c.system,
      code: c.code,
      title: c.title,
      description: c.description,
      category: c.category,
      toothRelevant: c.toothRelevant,
      faktorMin: c.faktorMin,
      faktorMax: c.faktorMax,
      regelhoechstfaktor: c.regelhoechstfaktor,
      begruendungspflichtAbFaktor: c.begruendungspflichtAbFaktor,
      ausschlussMit: parseDependsOn(c.ausschlussMit),
      frequenzlimitAnzahl: c.frequenzlimitAnzahl,
      frequenzlimitZeitraumTage: c.frequenzlimitZeitraumTage,
      gueltigAb: c.gueltigAb,
      gueltigBis: c.gueltigBis,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      fach: t.fach,
      name: t.name,
      description: t.description,
      items: t.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        position: i.position,
        dependsOn: parseDependsOn(i.dependsOn),
      })),
    })),
  });
}
