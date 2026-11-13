import { auditFromSession } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { sitzungenBeenden } from "@/lib/sitzungCookie";
import { verifyTotpToken, generateBackupCodes } from "@/lib/twoFactor";

const enableSchema = z.object({
  token: z.string().min(6).max(6),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = enableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte einen 6-stelligen Code eingeben." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  // Vor der Umstellung auf totpPendingSecret begonnene Einrichtungen liegen noch in totpSecret.
  const secret = user?.totpPendingSecret ?? (user && !user.totpEnabled ? user.totpSecret : null);
  if (!user || !secret) {
    return NextResponse.json(
      { error: "Zuerst muss ein 2FA-Setup gestartet werden." },
      { status: 400 }
    );
  }

  // Der Code hat nur sechs Stellen: Durchprobieren begrenzen.
  if (!(await consumeAttempt(`2fa-aktivieren:${user.id}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429 });
  }

  const valid = await verifyTotpToken(parsed.data.token, secret);
  if (!valid) {
    return NextResponse.json({ error: "Der Code ist ungültig oder abgelaufen." }, { status: 400 });
  }

  const { plain: backupCodes, hashesJoined } = await generateBackupCodes();

  // Erst jetzt gilt das neue Secret; ein bisheriges Gerät ist damit abgelöst.
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpPendingSecret: null, totpEnabled: true, totpBackupCodes: hashesJoined },
  });
  // Andere Sitzungen dieses Kontos enden; dieses Gerät bleibt angemeldet
  // (bei 2FA-Pflicht wie bisher gesperrt bis zur Neuanmeldung mit Code).
  await sitzungenBeenden(user.id, { eigeneBehalten: true });

  await auditFromSession(session, "2fa.an", { entityType: "Konto", entityId: session.user.id });
  return NextResponse.json({ ok: true, backupCodes });
}
