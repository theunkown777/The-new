import { sichtbarFuer, SCHREIBGESCHUETZT } from "@/lib/katalogScope";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDependsOn } from "@/lib/serviceDependency";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const templates = await prisma.serviceTemplate.findMany({
    where: {
      ...(await sichtbarFuer(session.user.practiceId)),
    },
    orderBy: { name: "asc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { catalogItem: true },
      },
    },
  });

  const withParsedDeps = templates.map((tpl) => ({
    ...tpl,
    items: tpl.items.map((item) => ({
      ...item,
      dependsOn: parseDependsOn(item.dependsOn),
      catalogItem: {
        ...item.catalogItem,
        ausschlussMit: parseDependsOn(item.catalogItem.ausschlussMit),
      },
    })),
  }));

  return NextResponse.json({ templates: withParsedDeps });
}

const createSchema = z.object({
  name: z.string().min(2, "Name ist zu kurz"),
  description: z.string().optional().nullable(),
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

  const template = await prisma.serviceTemplate.create({
    data: { practiceId: session.user.practiceId, name: parsed.data.name, description: parsed.data.description },
  });

  return NextResponse.json({ template });
}
