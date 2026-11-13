import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { bestaetigePasswortUndCode, createTotpSecret, totpQrDataUrl } from "@/lib/twoFactor";

// Erzeugt ein neues, noch nicht aktives TOTP-Secret (totpPendingSecret) und
// liefert einen QR-Code dafür. Das bisherige Secret und totpEnabled bleiben
// unberührt; erst /api/settings/2fa/enable stellt nach gültigem Code um.
// Ist die 2FA schon aktiv (Gerätewechsel), braucht es das aktuelle Passwort
// und einen aktuellen Code: Eine offene Sitzung allein darf die 2FA nicht ersetzen.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  let totpBackupCodes = user.totpBackupCodes;
  if (user.totpEnabled) {
    if (!(await consumeAttempt(`2fa-bestaetigung:${user.id}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const pruefung = await bestaetigePasswortUndCode(user, body?.password, body?.token);
    if (!pruefung.ok) return NextResponse.json({ error: pruefung.error }, { status: 400 });
    totpBackupCodes = pruefung.backupCodes;
  }

  const secret = createTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecret: secret, totpBackupCodes } });

  const qrDataUrl = await totpQrDataUrl(user.email, secret);

  return NextResponse.json({ secret, qrDataUrl });
}
