import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { buchenSchema, istFrei } from "@/lib/buchung";
import { buchungsLage } from "@/lib/buchungLoad";
import { audit } from "@/lib/audit";
import { eingangErledigen, eingangMelden } from "@/lib/eingang";

export const dynamic = "force-dynamic";
const MAX_OFFEN = 2;
const ABSAGE_BIS_STD = 24;

async function patientVon(token: string) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  const p = await prisma.patient.findUnique({ where: { portalTokenHash: hashToken(token) }, select: { id: true, practiceId: true, firstName: true, lastName: true, portalExpiresAt: true } });
  return p && p.portalExpiresAt && p.portalExpiresAt > new Date() ? p : null;
}
const terminHinweis = (d: Date) => d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) + " Uhr";
const abgelaufen = () => NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });

// Patientenportal: freie Termine ansehen. Angeboten wird nur, was nach Sprechzeiten, Sorrida-Terminen
// und dem übertragenen Praxiskalender wirklich frei ist.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const patient = await patientVon(params.token);
  if (!patient) return abgelaufen();
  const lage = await buchungsLage(patient.practiceId);
  if (!lage) return abgelaufen();
  const meine = await prisma.appointment.findMany({ where: { patientId: patient.id, start: { gte: new Date() }, status: { in: ["GEPLANT", "BESTAETIGT"] } }, orderBy: { start: "asc" }, select: { id: true, start: true, minutes: true, reason: true, quelle: true, status: true } });
  return NextResponse.json({ aktiv: lage.praxis.buchungAktiv, minuten: lage.praxis.buchungMinuten, tage: lage.tage, meine });
}

// Termin buchen: Das Zeitfenster wird beim Buchen noch einmal geprüft.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (await isRateLimited(`buchung:${ip}`, 20, 3600e3)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(`buchung:${ip}`, 3600e3);
  const patient = await patientVon(params.token);
  if (!patient) return abgelaufen();
  const parsed = buchenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  const lage = await buchungsLage(patient.practiceId);
  if (!lage?.praxis.buchungAktiv) return NextResponse.json({ error: "Diese Praxis bietet zurzeit keine Online-Termine an. Bitte rufen Sie an." }, { status: 409 });
  const start = new Date(parsed.data.start);
  if (!istFrei(lage.eingabe, start.toISOString())) return NextResponse.json({ error: "Dieser Termin ist gerade vergeben worden. Bitte wählen Sie einen anderen.", vergeben: true }, { status: 409 });
  const offen = await prisma.appointment.count({ where: { patientId: patient.id, quelle: "PATIENT", start: { gte: new Date() }, status: { in: ["GEPLANT", "BESTAETIGT"] } } });
  if (offen >= MAX_OFFEN) return NextResponse.json({ error: `Sie haben schon ${MAX_OFFEN} Termine online gebucht. Für weitere Termine rufen Sie bitte in der Praxis an.` }, { status: 409 });

  const minuten = lage.praxis.buchungMinuten;
  const ort = lage.praxis.locations.length === 1 ? lage.praxis.locations[0].id : null;
  const anlass = parsed.data.anlass.replace(/\s+/g, " ").trim();
  const termin = await prisma.appointment.create({
    data: { practiceId: patient.practiceId, patientId: patient.id, locationId: ort, start, minutes: minuten, reason: anlass ? `Online gebucht: ${anlass}` : "Online gebucht", quelle: "PATIENT" },
    select: { id: true, start: true, minutes: true, reason: true, createdAt: true },
  });
  // Zwei Patienten gleichzeitig: Wer zuletzt kam, tritt zurück, wenn das Fenster dadurch überbucht ist.
  const ende = new Date(start.getTime() + minuten * 60000);
  const gleichzeitig = await prisma.appointment.findMany({ where: { practiceId: patient.practiceId, status: { not: "ABGESAGT" }, start: { lt: ende, gt: new Date(start.getTime() - 8 * 3600e3) } }, select: { id: true, start: true, minutes: true, createdAt: true } });
  const ueberlappend = gleichzeitig.filter((t) => t.start.getTime() + t.minutes * 60000 > start.getTime());
  const zuletzt = [...ueberlappend].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))[0];
  if (ueberlappend.length > lage.eingabe.plaetze && zuletzt?.id === termin.id) {
    await prisma.appointment.delete({ where: { id: termin.id } });
    return NextResponse.json({ error: "Dieser Termin ist gerade vergeben worden. Bitte wählen Sie einen anderen.", vergeben: true }, { status: 409 });
  }
  await audit({ practiceId: patient.practiceId, userName: `${patient.firstName} ${patient.lastName} (Patient)`, action: "termin.online", entityType: "Patient", entityId: patient.id, summary: "gebucht" });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "TERMIN_GEBUCHT", entityId: termin.id, hinweis: terminHinweis(termin.start) });
  return NextResponse.json({ termin }, { status: 201 });
}

// Eigenen, online gebuchten Termin absagen (bis 24 Stunden vorher).
export async function DELETE(req: Request, { params }: { params: { token: string } }) {
  const patient = await patientVon(params.token);
  if (!patient) return abgelaufen();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const termin = await prisma.appointment.findFirst({ where: { id, patientId: patient.id, status: { in: ["GEPLANT", "BESTAETIGT"] } }, select: { id: true, start: true } });
  if (!termin) return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  if (termin.start.getTime() - Date.now() < ABSAGE_BIS_STD * 3600e3) return NextResponse.json({ error: "Kurzfristige Absagen bitte telefonisch in der Praxis." }, { status: 409 });
  await prisma.appointment.update({ where: { id: termin.id }, data: { status: "ABGESAGT" } });
  await audit({ practiceId: patient.practiceId, userName: `${patient.firstName} ${patient.lastName} (Patient)`, action: "termin.online", entityType: "Patient", entityId: patient.id, summary: "abgesagt" });
  await eingangErledigen(patient.practiceId, ["TERMIN_GEBUCHT"], termin.id, "Patient (abgesagt)");
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "TERMIN_ABGESAGT", entityId: termin.id, hinweis: terminHinweis(termin.start) });
  return NextResponse.json({ ok: true });
}
