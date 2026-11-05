import { zweiFaktorPflicht } from "@/lib/zweiFaktorPflicht";
import { auditFromSession, audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const disableSchema = z.object({
  password: z.string().min(1, "Passwort erforderlich"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = disableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte Passwort zur Bestätigung eingeben." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Passwort ist falsch." }, { status: 400 });
  }

  const pflicht = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, practice: { select: { require2faAll: true, isDemo: true } } } });
  if (pflicht && zweiFaktorPflicht({ role: pflicht.role, require2faAll: pflicht.practice.require2faAll, isDemo: pflicht.practice.isDemo })) {
    return NextResponse.json({ error: "Für Ihr Konto ist die Zwei-Faktor-Anmeldung Pflicht und kann nicht ausgeschaltet werden. Ein neues Gerät richten Sie mit einem Backup-Code ein." }, { status: 409 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null },
  });

  await auditFromSession(session, "2fa.aus", { entityType: "Konto", entityId: session.user.id });
  return NextResponse.json({ ok: true });
}
