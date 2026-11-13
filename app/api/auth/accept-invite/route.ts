import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { hashToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, "Name ist zu kurz"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Kein Token angegeben" }, { status: 400 });

  const tokenHash = hashToken(token);
  const invite = await prisma.staffInvite.findUnique({
    where: { tokenHash },
    include: { practice: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Die Einladung ist ungültig oder abgelaufen." }, { status: 400 });
  }

  return NextResponse.json({ email: invite.email, practiceName: invite.practice.name });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rateLimitKey = `accept-invite:${ip}`;
  if (await isRateLimited(rateLimitKey, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(rateLimitKey, WINDOW_MS);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const invite = await prisma.staffInvite.findUnique({ where: { tokenHash } });

  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Die Einladung ist ungültig oder abgelaufen. Bitte um eine neue Einladung bitten." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        practiceId: invite.practiceId,
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        role: invite.role,
        // Bestätigt ist die Adresse nur, wenn der Link per E-Mail genau dorthin ging.
        // Wurde er bloß angezeigt (Gastzugang, kein Mailversand), kann ihn jeder
        // eingelöst haben; das Konto bestätigt seine Adresse dann wie nach der Registrierung.
        emailVerifiedAt: invite.mailed ? new Date() : null,
      },
    }),
    prisma.staffInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
