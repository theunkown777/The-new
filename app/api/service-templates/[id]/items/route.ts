import { sichtbarFuer, SCHREIBGESCHUETZT } from "@/lib/katalogScope";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { serializeDependsOn } from "@/lib/serviceDependency";

const addItemSchema = z.object({
  catalogItemId: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const template = await prisma.serviceTemplate.findFirst({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!template && (await prisma.serviceTemplate.count({ where: { id: params.id, practiceId: null } }))) return NextResponse.json({ error: SCHREIBGESCHUETZT }, { status: 403 });
  if (!template) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const catalogItem = await prisma.serviceCatalogItem.findFirst({
    where: { id: parsed.data.catalogItemId, ...(await sichtbarFuer(session.user.practiceId)) },
  });
  if (!catalogItem) return NextResponse.json({ error: "Katalogposition nicht gefunden" }, { status: 404 });

  const existingCount = await prisma.serviceTemplateItem.count({ where: { templateId: params.id } });

  const item = await prisma.serviceTemplateItem.upsert({
    where: { templateId_catalogItemId: { templateId: params.id, catalogItemId: parsed.data.catalogItemId } },
    update: { dependsOn: serializeDependsOn(parsed.data.dependsOn) },
    create: {
      templateId: params.id,
      catalogItemId: parsed.data.catalogItemId,
      position: existingCount,
      dependsOn: serializeDependsOn(parsed.data.dependsOn),
    },
    include: { catalogItem: true },
  });

  return NextResponse.json({ item });
}
