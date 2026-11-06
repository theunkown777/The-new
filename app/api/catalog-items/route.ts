import { sichtbarFuer, SCHREIBGESCHUETZT } from "@/lib/katalogScope";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

// Listet den globalen Referenzkatalog (praxisunabhängige Positionen), damit
// die Praxis amtliche Punktzahlen/Festbeträge eintragen kann. Diese Werte
// sind objektiv (Teil des offiziellen Gebührenverzeichnisses) und daher
// bewusst geteilt statt je Praxis dupliziert - siehe Hinweis auf der Seite.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const items = await prisma.serviceCatalogItem.findMany({
    where: await sichtbarFuer(session.user.practiceId),
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      system: true,
      practiceId: true,
      code: true,
      title: true,
      description: true,
      category: true,
      toothRelevant: true,
      faktorMin: true,
      punktzahl: true,
      festbetragCent: true,
    },
  });

  return NextResponse.json({ items });
}

const STANDARD_FAKTOR = { faktorMin: 1.0, faktorMax: 3.5, regelhoechstfaktor: 2.3, begruendungspflichtAbFaktor: 2.3 };

const createSchema = z.object({
  system: z.enum(["GOZ", "BEMA", "GOAE", "BEL_II", "EBM", "UVGOAE", "HEILMITTEL", "PFLEGE", "HEBAMME", "APO", "HILFSMITTEL", "SELBST", "SONSTIGES"]),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  toothRelevant: z.boolean().default(false),
  hasFaktor: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { hasFaktor, ...rest } = parsed.data;

  const item = await prisma.serviceCatalogItem.create({
    data: {
      ...rest,
      practiceId: session.user.practiceId,
      ...(hasFaktor ? STANDARD_FAKTOR : {}),
    },
  });

  return NextResponse.json({ item });
}
