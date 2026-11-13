import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_REPORT_LIMIT } from "@/lib/demo";
import { consumeAttempt } from "@/lib/rateLimit";

// Schutz für Gastzugänge: keine E-Mails an fremde Adressen (Team-Einladung)
// und eine Obergrenze für KI-Berichte, damit Demos keine Kosten treiben.
export async function demoGuard(practiceId: string, action: "invite" | "report"): Promise<NextResponse | null> {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true, createdAt: true } });
  if (!practice?.isDemo) return null;
  // Einladungen im Gastzugang sind erlaubt, verschicken aber nie eine Mail
  // (siehe app/api/settings/team/route.ts): Der Link wird nur angezeigt.
  if (action === "invite") return null;
  // Nur selbst erstellte Berichte zählen, nicht die mitgelieferten Beispielberichte (zurückdatiert).
  // „Neu erzeugen“ legt keinen Bericht an, kostet aber genauso: Deshalb zählen auch die
  // KI-Läufe aus dem Protokoll (ein Eintrag je Erstellen und je Neu-Erzeugen).
  const [reports, kiLaeufe] = await Promise.all([
    prisma.report.count({ where: { practiceId, createdAt: { gte: practice.createdAt } } }),
    prisma.auditLog.count({ where: { practiceId, action: "bericht.ki", createdAt: { gte: practice.createdAt } } }),
  ]);
  if (demoLimitErreicht(reports, kiLaeufe)) {
    return NextResponse.json(
      { error: `Im Gastzugang sind bis zu ${DEMO_REPORT_LIMIT} KI-Berichte möglich (neu erzeugte zählen mit). Registrieren Sie Ihre Praxis, um weiterzuarbeiten.` },
      { status: 429 }
    );
  }
  return null;
}

/** Demo-Grenze erreicht? Maßgeblich ist der höhere Wert aus angelegten Berichten und KI-Läufen. */
export const demoLimitErreicht = (reports: number, kiLaeufe: number): boolean => Math.max(reports, kiLaeufe) >= DEMO_REPORT_LIMIT;

// KI-Aufrufe je Praxis und Stunde (Kosten): Gastzugänge knapp, echte Praxen
// so, dass der Alltag nicht stockt. Gezählt wird vorab und in einem Schritt.
export const KI_PRO_STUNDE = { demo: 20, praxis: 120 };
const STUNDE_MS = 60 * 60 * 1000;

export async function kiLimit(practiceId: string, art: "regenerate" | "briefing"): Promise<NextResponse | null> {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } });
  const grenze = practice?.isDemo ? KI_PRO_STUNDE.demo : KI_PRO_STUNDE.praxis;
  if (await consumeAttempt(`ki-${art}:${practiceId}`, grenze, STUNDE_MS)) return null;
  return NextResponse.json({ error: "Zu viele KI-Anfragen in dieser Stunde. Bitte später erneut versuchen." }, { status: 429 });
}
