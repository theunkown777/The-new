import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { systemGruppe } from "@/lib/fachprofile";
import { EIGENE_KATEGORIE, eigeneLeistungSchema, eigenesSystem, naechsteEigeneZiffer } from "@/lib/eigeneLeistung";
import { auditFromSession } from "@/lib/audit";

// Eigene Leistung mit Name und (auf Wunsch) Preis anlegen. Alle im Team dürfen das, damit am
// Empfang niemand auf die Praxisleitung warten muss; jede Anlage steht im Protokoll.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = eigeneLeistungSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const practiceId = session.user.practiceId;
  const d = parsed.data;

  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } });
  const system = eigenesSystem(systemGruppe(praxis?.specialty));
  const eigene = await prisma.serviceCatalogItem.findMany({ where: { practiceId }, select: { id: true, code: true, title: true, system: true } });
  if (eigene.length >= 5000) return NextResponse.json({ error: "Der Katalog ist voll. Bitte nicht mehr benötigte Leistungen löschen." }, { status: 409 });

  // Gleicher Name schon da: nicht doppelt anlegen, sondern die vorhandene zurückgeben.
  const gleich = eigene.find((e) => e.title.trim().toLowerCase() === d.name.toLowerCase());
  const item = gleich
    ? await prisma.serviceCatalogItem.findUnique({ where: { id: gleich.id } })
    : await prisma.serviceCatalogItem.create({
        data: { practiceId, system, code: naechsteEigeneZiffer(eigene.map((e) => e.code)), title: d.name, category: d.kategorie ?? EIGENE_KATEGORIE, toothRelevant: false, festbetragCent: d.preisCent },
      });
  if (!item) return NextResponse.json({ error: "Anlegen fehlgeschlagen" }, { status: 500 });
  if (!gleich) await auditFromSession(session, "katalog.eigen", { entityType: "Leistung", entityId: item.id, summary: `${item.code}${d.preisCent != null ? " mit Preis" : ""}` });
  return NextResponse.json({ item: { ...item, ausschlussMit: [] }, schonVorhanden: !!gleich }, { status: gleich ? 200 : 201 });
}
