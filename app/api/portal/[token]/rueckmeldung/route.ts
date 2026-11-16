import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { portalPatient } from "@/lib/portalAuth";
import { fensterAb, gepruefterGoogleLink, rueckmeldungSchema } from "@/lib/rueckmeldung";

import { anschluss } from "@/lib/anschluss";
export const dynamic = "force-dynamic";
const KOPF = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

// Eine Frage nach dem Termin aus dem Patientenportal. Gespeichert wird je Termin höchstens eine Antwort.
// Bewusst KEIN Eintrag im Eingang und keine Markierung am Patienten: Die Praxis sieht die Antworten nur gesammelt
// in der Analyse. Den Link zur öffentlichen Bewertung bekommt JEDE Antwort zurück, unabhängig von der Stufe.
export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const ip = anschluss(req.headers);
  if (!(await consumeAttempt(`portal-rueckmeldung:${ip}`, 20, 60 * 60 * 1000))) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429, headers: KOPF });
  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404, headers: KOPF });
  const parsed = rueckmeldungSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400, headers: KOPF });

  const now = new Date();
  const termin = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, patientId: patient.id, practiceId: patient.practiceId, status: "ERSCHIENEN", start: { gte: fensterAb(now), lte: now }, rueckmeldung: null },
    select: { id: true },
  });
  if (!termin) return NextResponse.json({ error: "Zu diesem Termin ist keine Rückmeldung möglich." }, { status: 404, headers: KOPF });
  try {
    await prisma.terminRueckmeldung.create({ data: { practiceId: patient.practiceId, appointmentId: termin.id, stufe: parsed.data.stufe, text: parsed.data.text || null } });
  } catch {
    // Zweites Absenden zum selben Termin (z. B. Doppelklick): Die erste Antwort bleibt.
    return NextResponse.json({ error: "Zu diesem Termin gibt es schon eine Rückmeldung." }, { status: 409, headers: KOPF });
  }
  const praxis = await prisma.practice.findUnique({ where: { id: patient.practiceId }, select: { googleProfilUrl: true } });
  // Für alle gleich, egal welche Stufe gewählt wurde.
  return NextResponse.json({ ok: true, bewertungUrl: gepruefterGoogleLink(praxis?.googleProfilUrl) }, { headers: KOPF });
}
