import { auditFromSession, audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { connectorKeyPrefix, generateConnectorKey, hashConnectorKey } from "@/lib/connector";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const keys = await prisma.connectorKey.findMany({
    where: { practiceId: session.user.practiceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  return NextResponse.json({ keys });
}

const createSchema = z.object({ name: z.string().trim().min(1, "Bitte einen Namen angeben").max(60) });

export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }

  const key = generateConnectorKey();
  const created = await prisma.connectorKey.create({
    data: {
      practiceId: session.user.practiceId,
      name: parsed.data.name,
      keyHash: hashConnectorKey(key),
      keyPrefix: connectorKeyPrefix(key),
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });

  await auditFromSession(session, "schnittstelle.schluessel", { entityType: "Schlüssel", entityId: created.id, summary: "angelegt" });
  // Der volle Schlüssel wird nur in dieser Antwort einmal angezeigt.
  return NextResponse.json({ key: created, secret: key }, { status: 201 });
}
