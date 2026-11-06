import { sichtbarFuer, SCHREIBGESCHUETZT } from "@/lib/katalogScope";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { parseDependsOn } from "@/lib/serviceDependency";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const template = await prisma.serviceTemplate.findFirst({
    where: { id: params.id, ...(await sichtbarFuer(session.user.practiceId)) },
    include: { items: { orderBy: { position: "asc" }, include: { catalogItem: true } } },
  });
  if (!template) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

  return NextResponse.json({
    template: {
      ...template,
      items: template.items.map((item) => ({ ...item, dependsOn: parseDependsOn(item.dependsOn) })),
    },
  });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const existing = await prisma.serviceTemplate.findFirst({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!existing && (await prisma.serviceTemplate.count({ where: { id: params.id, practiceId: null } }))) return NextResponse.json({ error: SCHREIBGESCHUETZT }, { status: 403 });
  if (!existing) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

  const template = await prisma.serviceTemplate.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const existing = await prisma.serviceTemplate.findFirst({ where: { id: params.id, practiceId: session.user.practiceId } });
  if (!existing && (await prisma.serviceTemplate.count({ where: { id: params.id, practiceId: null } }))) return NextResponse.json({ error: SCHREIBGESCHUETZT }, { status: 403 });
  if (!existing) return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });

  const reportUsage = await prisma.report.count({ where: { serviceTemplateId: params.id } });
  if (reportUsage > 0) {
    return NextResponse.json(
      { error: `Diese Vorlage wurde bereits in ${reportUsage} Bericht(en) verwendet und kann nicht gelöscht werden.` },
      { status: 409 }
    );
  }

  await prisma.serviceTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
