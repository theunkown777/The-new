import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Nur im Gastzugang: Die Geschäftsführung sieht die eigene Demo-Praxis aus
// Sicht der Mitarbeiterin "Rezeption (Demo)" (und wieder zurück), um
// Berechtigungen wie die Analyse-Freigabe auszuprobieren. Kein freier
// Rollen-Einstieg: Man muss bereits in genau dieser Demo-Praxis angemeldet
// sein. Zugangsdaten gelten nur für den Wechsel (neues Zufallspasswort).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { isDemo: true } });
  if (!practice?.isDemo) return NextResponse.json({ error: "Nur im Gastzugang" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const zu = body?.zu === "geschaeftsfuehrung" ? "admin" : body?.zu === "mitarbeiter" ? "staff" : null;
  if (!zu) return NextResponse.json({ error: "Ungültige Angabe" }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { practiceId: session.user.practiceId, role: zu, id: { not: session.user.id } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Kein passendes Konto in dieser Demo-Praxis" }, { status: 404 });
  const password = crypto.randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: new Date() } });
  return NextResponse.json({ email: target.email, password }, { headers: { "Cache-Control": "no-store" } });
}
