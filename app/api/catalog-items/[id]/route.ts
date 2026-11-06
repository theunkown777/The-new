import { sichtbarFuer, SCHREIBGESCHUETZT } from "@/lib/katalogScope";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

const STANDARD_FAKTOR = { faktorMin: 1.0, faktorMax: 3.5, regelhoechstfaktor: 2.3, begruendungspflichtAbFaktor: 2.3 };

// Abrechnungswerte (Punktzahl/Festbetrag) und Stammdaten (Titel, System,
// Ziffer, Kategorie, Zahnbezug) sind beide über diese Route editierbar.
// Bewusst NICHT editierbar über die UI: Ausschluss-Regeln, Gültigkeits-
// zeiträume und Frequenzlimits - das sind fachlich heikle Regeln, die
// weiterhin nur über prisma/seed.ts gepflegt werden, um Fehleingaben mit
// größerer Tragweite (z. B. versehentlich eine Ausschlussregel entfernen)
// zu vermeiden.
const updateSchema = z.object({
  system: z.enum(["GOZ", "BEMA", "GOAE", "BEL_II", "SONSTIGES"]).optional(),
  code: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().min(1).optional(),
  toothRelevant: z.boolean().optional(),
  hasFaktor: z.boolean().optional(),
  punktzahl: z.number().min(0).max(100000).optional().nullable(),
  festbetragCent: z.number().int().min(0).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const existing = await prisma.serviceCatalogItem.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!existing && (await prisma.serviceCatalogItem.count({ where: { id: params.id, practiceId: null } }))) {
    return NextResponse.json({ error: SCHREIBGESCHUETZT }, { status: 403 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Katalogposition nicht gefunden" }, { status: 404 });
  }

  const { hasFaktor, ...rest } = parsed.data;
  const faktorFields =
    hasFaktor === undefined ? {} : hasFaktor ? STANDARD_FAKTOR : { faktorMin: null, faktorMax: null, regelhoechstfaktor: null, begruendungspflichtAbFaktor: null };

  const item = await prisma.serviceCatalogItem.update({
    where: { id: params.id },
    data: { ...rest, ...faktorFields },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const existing = await prisma.serviceCatalogItem.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
  });
  if (!existing && (await prisma.serviceCatalogItem.count({ where: { id: params.id, practiceId: null } }))) {
    return NextResponse.json({ error: SCHREIBGESCHUETZT }, { status: 403 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Katalogposition nicht gefunden" }, { status: 404 });
  }

  const [templateUsage, reportUsage] = await Promise.all([
    prisma.serviceTemplateItem.count({ where: { catalogItemId: params.id } }),
    prisma.reportServiceEntry.count({ where: { catalogItemId: params.id } }),
  ]);
  if (templateUsage > 0 || reportUsage > 0) {
    return NextResponse.json(
      {
        error: `Diese Position wird noch in ${templateUsage} Vorlage(n) und ${reportUsage} Bericht(en) verwendet und kann deshalb nicht gelöscht werden. Zuerst aus allen Vorlagen entfernen.`,
      },
      { status: 409 }
    );
  }

  await prisma.serviceCatalogItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
