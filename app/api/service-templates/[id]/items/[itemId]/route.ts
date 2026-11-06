import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { serializeDependsOn } from "@/lib/serviceDependency";

const updateSchema = z.object({
  dependsOn: z.array(z.string()).optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const existing = await prisma.serviceTemplateItem.findFirst({
    where: { id: params.itemId, templateId: params.id, template: { practiceId: session.user.practiceId } },
  });
  if (!existing) return NextResponse.json({ error: "Position nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const data: { dependsOn?: string | null; position?: number } = {};
  if (parsed.data.dependsOn !== undefined) data.dependsOn = serializeDependsOn(parsed.data.dependsOn);
  if (parsed.data.position !== undefined) data.position = parsed.data.position;

  const item = await prisma.serviceTemplateItem.update({
    where: { id: params.itemId },
    data,
    include: { catalogItem: true },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const existing = await prisma.serviceTemplateItem.findFirst({
    where: { id: params.itemId, templateId: params.id, template: { practiceId: session.user.practiceId } },
  });
  if (!existing) return NextResponse.json({ error: "Position nicht gefunden" }, { status: 404 });

  // Andere Positionen, die von dieser abhängen, müssen ihre Abhängigkeit
  // ebenfalls verlieren, sonst zeigt die Erfassung ins Leere.
  const dependents = await prisma.serviceTemplateItem.findMany({
    where: { templateId: params.id },
  });
  for (const dep of dependents) {
    if (!dep.dependsOn) continue;
    const ids = dep.dependsOn.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.includes(existing.catalogItemId)) {
      const remaining = ids.filter((id) => id !== existing.catalogItemId);
      await prisma.serviceTemplateItem.update({
        where: { id: dep.id },
        data: { dependsOn: remaining.length ? remaining.join(",") : null },
      });
    }
  }

  await prisma.serviceTemplateItem.delete({ where: { id: params.itemId } });
  return NextResponse.json({ ok: true });
}
