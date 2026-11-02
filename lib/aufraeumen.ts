import { prisma } from "@/lib/prisma";
import { stichtag } from "@/lib/loeschfristen";
import { cleanupExpiredDemos } from "@/lib/demo";

/** Wendet die automatischen Löschfristen an (lib/loeschfristen.ts). Idempotent. */
export async function aufraeumen(now = new Date()) {
  const t = stichtag("token", now);
  const [ev, pr, inv, lt, portal, anam, leads, logs] = await Promise.all([
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: t } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: t } } }),
    prisma.staffInvite.deleteMany({ where: { expiresAt: { lt: t }, acceptedAt: null } }),
    prisma.launchToken.deleteMany({ where: { expiresAt: { lt: t } } }),
    prisma.patient.updateMany({ where: { portalExpiresAt: { lt: stichtag("portal", now) }, portalTokenHash: { not: null } }, data: { portalTokenHash: null } }),
    prisma.anamnesisForm.deleteMany({ where: { submittedAt: null, expiresAt: { lt: stichtag("anamnese", now) } } }),
    prisma.lead.deleteMany({ where: { handledAt: { lt: stichtag("anfragen", now) } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: stichtag("protokoll", now) } } }),
  ]);
  const demos = await cleanupExpiredDemos(now);
  return { token: ev.count + pr.count + inv.count + lt.count, portal: portal.count, anamnese: anam.count, anfragen: leads.count, protokoll: logs.count, demos };
}
