import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { escapeHtml, sendEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";

const schema = z.object({ email: z.string().email() });

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
const TOKEN_TTL_MS = 60 * 60 * 1000;

// Antwortet bewusst immer identisch, unabhängig davon, ob die E-Mail-Adresse
// existiert - sonst ließe sich über die Antwort ausspähen, welche Adressen
// registriert sind (User-Enumeration).
const GENERIC_MESSAGE =
  "Falls für diese E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen des Passworts verschickt.";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rateLimitKey = `forgot-password:${ip}`;
  if (await isRateLimited(rateLimitKey, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429 }
    );
  }
  await recordAttempt(rateLimitKey, WINDOW_MS);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const { raw: rawToken, hash: tokenHash } = generateToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Passwort zurücksetzen – Sorrida",
      html: `
        <p>Hallo ${escapeHtml(user.name)},</p>
        <p>Sie haben angefordert, Ihr Passwort zurückzusetzen. Der folgende Link ist eine Stunde gültig:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>
      `,
    });
  }

  // Bewusst KEIN unterschiedliches Timing/Verhalten je nachdem ob user
  // existiert - siehe GENERIC_MESSAGE oben.
  return NextResponse.json({ message: GENERIC_MESSAGE });
}
