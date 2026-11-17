import { prisma } from "@/lib/prisma";
import { anfragenFaellig, stichtag } from "@/lib/loeschfristen";
import { abgelaufeneDemosLoeschen } from "@/lib/demo";
import { fehlerSchreiben } from "@/lib/fehlerSpeicher";

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
  // Fehlereinträge aus dem Betrieb (lib/fehlerlog.ts): 30 Tage nach dem letzten Auftreten
  const fehlerlog = await prisma.fehlerEintrag.deleteMany({ where: { zuletztAt: { lt: stichtag("fehlerlog", now) } } });
  // Empfangsmodus: abgelaufene geparkte Sitzungen (nur Hashwert einer Kennung, lib/empfangParkung.ts)
  await prisma.empfangParkung.deleteMany({ where: { expiresAt: { lt: now } } });
  // Abgelaufene Demo-Praxen. Lässt sich eine nicht löschen, laufen die übrigen Schritte der Nacht trotzdem weiter
  // (Kalender, Erinnerungen, Fehler-Mail in app/api/cron/aufraeumen/route.ts). Der Fehler kommt ins Fehlerlog und
  // damit in die tägliche Fehler-Mail; die Praxis bleibt stehen, bis der Grund geklärt ist.
  const demoLauf = await abgelaufeneDemosLoeschen(now);
  for (const f of demoLauf.fehler) {
    console.error("Abgelaufene Demo-Praxis nicht gelöscht", f.id, f.fehler);
    await fehlerSchreiben({ quelle: "server", ort: "/api/cron/aufraeumen", meldung: `Abgelaufene Demo-Praxis nicht gelöscht: ${f.fehler instanceof Error ? f.fehler.message : String(f.fehler)}` }, null, now);
  }
  return { token: ev.count + pr.count + inv.count + lt.count, portal: portal.count, anamnese: anam.count, anfragen: leads.count, protokoll: logs.count, terminanfragen: anfragenOffen.count + anfragenBestaetigt.count, warteliste: warteliste.count, fehlerlog: fehlerlog.count, demos: demoLauf.geloescht, demosFehler: demoLauf.fehler.length };
}
