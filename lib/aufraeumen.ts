import { prisma } from "@/lib/prisma";
import { anfragenFaellig, stichtag } from "@/lib/loeschfristen";
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
    // Alle Anfragen nach dem Eingang, ob erledigt oder nicht (Zusage in der Datenschutzerklärung)
    prisma.lead.deleteMany({ where: anfragenFaellig(now) }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: stichtag("protokoll", now) } } }),
  ]);
  // Zähler der Geburtsdatum-Prüfung (S5) zu Links, an denen sich lange nichts getan hat
  await prisma.portalPruefung.deleteMany({ where: { updatedAt: { lt: stichtag("portal", now) } } });
  // Online-Anfragen neuer Patienten (lib/terminanfrage.ts): unbestätigte 30 Tage nach Eingang; bei bestätigten
  // stehen die Daten in Akte und Termin, die Kopie in der Anfrage wird 30 Tage nach der Bestätigung gelöscht.
  const ta = stichtag("terminanfrage", now);
  const [anfragenOffen, anfragenBestaetigt, warteliste] = await Promise.all([
    prisma.terminanfrage.deleteMany({ where: { status: { not: "BESTAETIGT" }, createdAt: { lt: ta } } }),
    prisma.terminanfrage.deleteMany({ where: { status: "BESTAETIGT", OR: [{ bearbeitetAt: { lt: ta } }, { bearbeitetAt: null, createdAt: { lt: ta } }] } }),
    prisma.warteliste.deleteMany({ where: { erledigtAt: { lt: stichtag("warteliste", now) } } }),
  ]);
  const demos = await cleanupExpiredDemos(now);
  return { token: ev.count + pr.count + inv.count + lt.count, portal: portal.count, anamnese: anam.count, anfragen: leads.count, protokoll: logs.count, terminanfragen: anfragenOffen.count + anfragenBestaetigt.count, warteliste: warteliste.count, demos };
}
