import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const { raw: rawToken, hash: tokenHash } = generateToken();

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "E-Mail-Adresse bestätigen – Sorrida",
    html: `
      <p>Hallo ${escapeHtml(user.name)},</p>
      <p>Bitte bestätigen Sie Ihre E-Mail-Adresse (Link ist 24 Stunden gültig):</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `,
  });
}
