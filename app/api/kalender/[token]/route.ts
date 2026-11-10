import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { icsSchreiben } from "@/lib/ics";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Kalender-Abo für die Praxis: Termine aus Sorrida im eigenen Kalender (Google, Outlook, Apple).
// Zugang über den geheimen Link. Bewusst ohne Patientennamen und ohne Anlass, weil Kalenderdienste
// den Link auf ihren eigenen Servern abrufen.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (await isRateLimited(`kalenderfeed:${ip}`, 120, 3600e3)) return new NextResponse("Zu viele Abrufe", { status: 429 });
  await recordAttempt(`kalenderfeed:${ip}`, 3600e3);
  const token = params.token.replace(/\.ics$/i, "");
  const praxis = /^[A-Za-z0-9_-]{20,128}$/.test(token) ? await prisma.practice.findUnique({ where: { kalenderFeedHash: hashToken(token) }, select: { id: true, name: true } }) : null;
  if (!praxis) return new NextResponse("Nicht gefunden", { status: 404 });
  const jetzt = new Date();
  const termine = await prisma.appointment.findMany({
    where: { practiceId: praxis.id, start: { gte: new Date(jetzt.getTime() - 30 * 864e5), lte: new Date(jetzt.getTime() + 120 * 864e5) } },
    orderBy: { start: "asc" }, take: 3000,
    select: { id: true, start: true, minutes: true, status: true, quelle: true, createdAt: true, location: { select: { name: true } } },
  });
  const ics = icsSchreiben(`Sorrida: ${praxis.name}`, termine.map((t) => ({
    id: t.id, start: t.start, minutes: t.minutes, titel: t.quelle === "PATIENT" ? "Sorrida-Termin (online gebucht)" : "Sorrida-Termin", ort: t.location?.name ?? null, abgesagt: t.status === "ABGESAGT", geaendert: t.createdAt,
  })), jetzt);
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" } });
}
