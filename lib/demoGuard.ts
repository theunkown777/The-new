import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_REPORT_LIMIT } from "@/lib/demo";

// Schutz für Gastzugänge: keine E-Mails an fremde Adressen (Team-Einladung)
// und eine Obergrenze für KI-Berichte, damit Demos keine Kosten treiben.
export async function demoGuard(practiceId: string, action: "invite" | "report"): Promise<NextResponse | null> {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true, createdAt: true } });
  if (!practice?.isDemo) return null;
  // Einladungen im Gastzugang sind erlaubt, verschicken aber nie eine Mail
  // (siehe app/api/settings/team/route.ts): Der Link wird nur angezeigt.
  if (action === "invite") return null;
  // Nur selbst erstellte Berichte zählen, nicht die mitgelieferten Beispielberichte (zurückdatiert).
  const reports = await prisma.report.count({ where: { practiceId, createdAt: { gte: practice.createdAt } } });
  if (reports >= DEMO_REPORT_LIMIT) {
    return NextResponse.json(
      { error: `Im Gastzugang sind bis zu ${DEMO_REPORT_LIMIT} Berichte möglich. Registrieren Sie Ihre Praxis, um weiterzuarbeiten.` },
      { status: 429 }
    );
  }
  return null;
}
