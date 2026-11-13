import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { bestaetigePasswortUndCode, generateBackupCodes } from "@/lib/twoFactor";

// Regeneriert die Backup-Codes (z. B. weil alte verbraucht/verloren wurden).
// Ersetzt die alte Liste vollständig - vorherige Codes werden ungültig.
// Backup-Codes ersetzen den zweiten Faktor, deshalb nur mit aktuellem
// Passwort und aktuellem Code, nicht allein mit einer offenen Sitzung.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpEnabled) {
    return NextResponse.json({ error: "2FA ist nicht aktiv." }, { status: 400 });
  }

  if (!(await consumeAttempt(`2fa-bestaetigung:${user.id}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const pruefung = await bestaetigePasswortUndCode(user, body?.password, body?.token);
  if (!pruefung.ok) {
    // Ein dabei verbrauchter Backup-Code kann es hier nicht geben (ok=false), also nichts zu speichern.
    return NextResponse.json({ error: pruefung.error }, { status: 400 });
  }

  const { plain: backupCodes, hashesJoined } = await generateBackupCodes();
  await prisma.user.update({ where: { id: user.id }, data: { totpBackupCodes: hashesJoined } });

  return NextResponse.json({ backupCodes });
}
