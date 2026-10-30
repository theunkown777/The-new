import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { demoGuard } from "@/lib/demoGuard";
import { requireAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { generateToken } from "@/lib/tokens";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: { practiceId: session.user.practiceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.staffInvite.findMany({
      where: { practiceId: session.user.practiceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    }),
  ]);

  return NextResponse.json({ users, invites });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "staff"]).default("staff"),
});

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (!session) return error;
  const blocked = await demoGuard(session.user.practiceId, "invite");
  if (blocked) return blocked;

  const rateLimitKey = `staff-invite:${session.user.practiceId}`;
  if (await isRateLimited(rateLimitKey, INVITE_LIMIT, INVITE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Zu viele Einladungen in kurzer Zeit. Bitte später erneut versuchen." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." },
      { status: 409 }
    );
  }

  await recordAttempt(rateLimitKey, INVITE_WINDOW_MS);

  const { raw: rawToken, hash: tokenHash } = generateToken();

  await prisma.staffInvite.create({
    data: {
      practiceId: session.user.practiceId,
      email,
      role: parsed.data.role,
      tokenHash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: `Einladung zu ${session.user.practiceName} – Sorrida`,
    html: `
      <p>Hallo,</p>
      <p>${session.user.name} hat Sie eingeladen, dem Team von ${session.user.practiceName} in Sorrida beizutreten.</p>
      <p>Der folgende Link ist 7 Tage gültig:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    `,
  });

  return NextResponse.json({ ok: true });
}
