import { auditFromSession, audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken, generateBackupCodes } from "@/lib/twoFactor";

const enableSchema = z.object({
  token: z.string().min(6).max(6),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const parsed = enableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte einen 6-stelligen Code eingeben." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret) {
    return NextResponse.json(
      { error: "Zuerst muss ein 2FA-Setup gestartet werden." },
      { status: 400 }
    );
  }

  const valid = await verifyTotpToken(parsed.data.token, user.totpSecret);
  if (!valid) {
    return NextResponse.json({ error: "Der Code ist ungültig oder abgelaufen." }, { status: 400 });
  }

  const { plain: backupCodes, hashesJoined } = await generateBackupCodes();

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpBackupCodes: hashesJoined },
  });

  await auditFromSession(session, "2fa.an", { entityType: "Konto", entityId: session.user.id });
  return NextResponse.json({ ok: true, backupCodes });
}
