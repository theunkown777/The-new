import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { leseLeistungenCsv } from "@/lib/amtlich/csvImport";

// Leistungslisten (regionale KV-Ziffern, Sonder- und Selektivverträge, eigene Listen) als CSV
// in den Abrechnungskatalog der Praxis übernehmen. Vorhandene Ziffern desselben Systems bleiben unverändert.
const schema = z.object({
  csv: z.string().min(1).max(1_000_000),
  system: z.enum(["EBM", "GOAE", "UVGOAE", "GOZ", "BEMA", "BEL_II", "HEILMITTEL", "PFLEGE", "HEBAMME", "APO", "HILFSMITTEL", "SELBST", "SONSTIGES"]),
  kategorie: z.string().trim().min(1).max(80),
  nurPruefen: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const { csv, system, kategorie, nurPruefen } = parsed.data;
  const { zeilen, fehler } = leseLeistungenCsv(csv);
  const practiceId = session.user.practiceId;
  const vorhanden = new Set(
    (await prisma.serviceCatalogItem.findMany({ where: { practiceId, system, code: { in: zeilen.map((z) => z.code) } }, select: { code: true } })).map((v) => v.code),
  );
  const neu = zeilen.filter((z) => !vorhanden.has(z.code));
  if (!nurPruefen && neu.length) {
    await prisma.serviceCatalogItem.createMany({
      data: neu.map((z) => ({ practiceId, system, code: z.code, title: z.title, description: z.description, category: kategorie, punktzahl: z.punktzahl, festbetragCent: z.punktzahl == null ? z.festbetragCent : null })),
    });
  }
  return NextResponse.json({ gelesen: zeilen.length, uebernommen: nurPruefen ? 0 : neu.length, neu: neu.length, schonVorhanden: zeilen.length - neu.length, fehler: fehler.slice(0, 50), fehlerGesamt: fehler.length });
}
