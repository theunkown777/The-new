import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mailVersandAktiv, sendEmail } from "@/lib/email";
import { BETREFF, darfMailen, mailHtml } from "@/lib/kontakt";
import { bestaetigungText, erinnerungText } from "@/lib/termine";
import { PORTAL_TTL_MS, nextReminderLevel, reminderText } from "@/lib/invoices";
import { generateToken } from "@/lib/tokens";
import { auditFromSession } from "@/lib/audit";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

// Versand per E-Mail für Terminbestätigung, Terminerinnerung und
// Zahlungserinnerung. Jede Nachricht löst ein Mensch aus (Klick), nichts geht
// automatisch raus. Ohne RESEND_API_KEY läuft der Versand im Testmodus und
// meldet das zurück, statt Erfolg vorzutäuschen.
const schema = z.object({ art: z.enum(["termin-bestaetigung", "termin-erinnerung", "zahlungserinnerung"]), id: z.string().min(1).max(40) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const { art, id } = parsed.data;
  const practiceId = session.user.practiceId;
  const key = `nachricht:${practiceId}`;
  if (await isRateLimited(key, 300, 3600e3)) return NextResponse.json({ error: "Zu viele Nachrichten in kurzer Zeit." }, { status: 429 });

  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, isDemo: true } });
  if (practice?.isDemo) return NextResponse.json({ error: "Im Gastzugang werden keine Nachrichten verschickt." }, { status: 403 });
  const praxis = practice?.name ?? "Ihrer Praxis";
  const testmodus = () => NextResponse.json({ ok: false, testMode: true, error: "Mailversand ist noch nicht eingerichtet (Testmodus). Es wurde nichts verschickt; bitte den Text kopieren." }, { status: 503 });
  const now = new Date();

  let empfaenger: { id: string; firstName: string; email: string | null; contactConsentAt: Date | null };
  let text: string;
  let nachher: () => Promise<unknown>;

  if (art === "zahlungserinnerung") {
    const inv = await prisma.invoice.findFirst({
      where: { id, practiceId, status: { in: ["OFFEN", "GEMELDET"] } },
      include: { patient: { select: { id: true, firstName: true, email: true, contactConsentAt: true } } },
    });
    if (!inv) return NextResponse.json({ error: "Offene Rechnung nicht gefunden" }, { status: 404 });
    empfaenger = inv.patient;
    const pruef = darfMailen(empfaenger);
    if (!pruef.ok) return NextResponse.json({ error: pruef.grund }, { status: 409 });
    if (!mailVersandAktiv()) return testmodus();
    // Neuer Portal-Link, damit der Patient direkt per GiroCode zahlen kann.
    const { raw, hash } = generateToken();
    await prisma.patient.update({ where: { id: inv.patient.id }, data: { portalTokenHash: hash, portalExpiresAt: new Date(now.getTime() + PORTAL_TTL_MS), portalViewedAt: null } });
    const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
    const level = nextReminderLevel(inv.reminderLevel);
    text = reminderText({ level, firstName: inv.patient.firstName, practiceName: praxis, number: inv.number, amountCent: inv.amountCent, dueDate: inv.dueDate, url: `${base}/portal/${raw}` });
    nachher = () => prisma.invoice.update({ where: { id: inv.id }, data: { remindedAt: now, reminderLevel: level } });
  } else {
    const t = await prisma.appointment.findFirst({
      where: { id, practiceId },
      include: { patient: { select: { id: true, firstName: true, email: true, contactConsentAt: true } }, location: { select: { name: true } } },
    });
    if (!t) return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
    empfaenger = t.patient;
    const pruef = darfMailen(empfaenger);
    if (!pruef.ok) return NextResponse.json({ error: pruef.grund }, { status: 409 });
    if (!mailVersandAktiv()) return testmodus();
    const ort = t.location?.name ?? null;
    text = art === "termin-bestaetigung"
      ? bestaetigungText({ firstName: t.patient.firstName, practiceName: praxis, start: t.start, ort, reason: t.reason })
      : erinnerungText({ firstName: t.patient.firstName, practiceName: praxis, start: t.start, ort });
    nachher = () => prisma.appointment.update({ where: { id: t.id }, data: art === "termin-bestaetigung" ? { confirmedAt: now } : { remindedAt: now } });
  }

  await recordAttempt(key, 3600e3);
  let ergebnis: { testMode: boolean };
  try {
    ergebnis = await sendEmail({ to: empfaenger.email!, subject: BETREFF[art](praxis), html: mailHtml({ text, practiceName: praxis }) });
  } catch (e) {
    console.error("Versand fehlgeschlagen", e);
    return NextResponse.json({ error: "Die E-Mail konnte nicht verschickt werden." }, { status: 502 });
  }
  if (ergebnis.testMode) {
    return NextResponse.json({ ok: false, testMode: true, error: "Mailversand ist noch nicht eingerichtet (Testmodus). Es wurde nichts verschickt; bitte den Text kopieren." }, { status: 503 });
  }
  await nachher();
  await auditFromSession(session, "nachricht", { entityType: art === "zahlungserinnerung" ? "Rechnung" : "Termin", entityId: id, summary: art });
  return NextResponse.json({ ok: true });
}
