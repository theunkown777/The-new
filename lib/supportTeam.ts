import { prisma } from "@/lib/prisma";

// Wer gehört zum Sorrida-Team und darf das Postfach mit Pilot- und
// Hilfe-Anfragen sehen? Festgelegt über SUPPORT_TEAM_EMAILS in Vercel
// (kommagetrennt). Zusätzlich muss die E-Mail-Adresse des Kontos bestätigt
// sein, damit sich niemand mit einer fremden Adresse registriert und so
// Zugriff bekommt.

/** Wert von SUPPORT_TEAM_EMAILS, auch wenn der Name in Vercel anders geschrieben wurde (z. B. Support_Team_Emails). */
export function teamEmailsRaw(env: Record<string, string | undefined> = process.env): string | undefined {
  if (env.SUPPORT_TEAM_EMAILS !== undefined) return env.SUPPORT_TEAM_EMAILS;
  const key = Object.keys(env).find((k) => k.toUpperCase().replace(/[^A-Z]/g, "") === "SUPPORTTEAMEMAILS");
  return key ? env[key] : undefined;
}

export function teamEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (teamEmailsRaw(env) ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function isSupportTeam(userId: string | undefined | null): Promise<boolean> {
  const allowed = teamEmails();
  if (!userId || allowed.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  return !!user?.emailVerifiedAt && allowed.includes(user.email.toLowerCase());
}
