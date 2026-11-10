import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { darfWhatsapp, waLink, whatsappApiAktiv, whatsappSenden, whatsappText, type WhatsappArt } from "@/lib/whatsapp";
import { PORTAL_TTL_MS, nextReminderLevel } from "@/lib/invoices";
import { generateToken } from "@/lib/tokens";
import { auditFromSession } from "@/lib/audit";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

// Nachricht per WhatsApp: persönlicher Link, Terminbestätigung, Terminerinnerung, Zahlungserinnerung.
// Jede Nachricht löst ein Mensch aus. Ohne WhatsApp Business liefert die Antwort einen Link, der
// WhatsApp auf dem Praxisgerät mit Empfänger und fertigem Text öffnet; mit WhatsApp Business
// verschickt Sorrida selbst. Voraussetzung ist immer Mobilnummer plus eigene Einwilligung.
const schema = z.object({ art: z.enum(["portal-link", "termin-bestaetigung", "termin-erinnerung", "zahlungserinnerung"]), id: z.string().min(1).max(40) });
const PATIENT = { id: true, firstName: true, phone: true, whatsappConsentAt: true } as const;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const { art, id } = parsed.data as { art: WhatsappArt; id: string };
  const practiceId = session.user.practiceId;
  const key = `nachricht:${practiceId}`;
  if (await isRateLimited(key, 300, 3600e3)) return NextResponse.json({ error: "Zu viele Nachrichten in kurzer Zeit." }, { status: 429 });

  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, isDemo: true } });
  const praxis = practice?.name ?? "Ihre Praxis";
  const now = new Date();
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;

  let patient: { id: string; firstName: string; phone: string | null; whatsappConsentAt: Date | null };
  let start: Date | undefined;
  let ort: string | null = null;
  let nachher: () => Promise<unknown> = async () => undefined;
  let entity: { entityType: string; entityId: string };

  if (art === "portal-link") {
    const p = await prisma.patient.findFirst({ where: { id, practiceId }, select: PATIENT });
    if (!p) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
    patient = p;
    entity = { entityType: "Patient", entityId: p.id };
  } else if (art === "zahlungserinnerung") {
    const inv = await prisma.invoice.findFirst({ where: { id, practiceId, status: { in: ["OFFEN", "GEMELDET"] } }, include: { patient: { select: PATIENT } } });
    if (!inv) return NextResponse.json({ error: "Offene Rechnung nicht gefunden" }, { status: 404 });
    patient = inv.patient;
    const level = nextReminderLevel(inv.reminderLevel);
    nachher = () => prisma.invoice.update({ where: { id: inv.id }, data: { remindedAt: now, reminderLevel: level } });
    entity = { entityType: "Rechnung", entityId: inv.id };
  } else {
    const t = await prisma.appointment.findFirst({ where: { id, practiceId }, include: { patient: { select: PATIENT }, location: { select: { name: true } } } });
    if (!t) return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
    patient = t.patient;
    start = t.start;
    const standorte = await prisma.location.count({ where: { practiceId } });
    ort = standorte > 1 ? t.location?.name ?? null : null;
    nachher = () => prisma.appointment.update({ where: { id: t.id }, data: art === "termin-bestaetigung" ? { confirmedAt: now } : { remindedAt: now } });
    entity = { entityType: "Termin", entityId: t.id };
  }

  const pruef = darfWhatsapp(patient);
  if (!pruef.ok) return NextResponse.json({ error: pruef.grund }, { status: 409 });

  let url: string | undefined;
  if (art === "portal-link" || art === "zahlungserinnerung") {
    // Neuer persönlicher Link (ersetzt den alten), wie beim Versand per E-Mail.
    const { raw, hash } = generateToken();
    await prisma.patient.update({ where: { id: patient.id }, data: { portalTokenHash: hash, portalExpiresAt: new Date(now.getTime() + PORTAL_TTL_MS), portalViewedAt: null } });
    url = `${base}/portal/${raw}`;
  }
  const text = whatsappText(art, { firstName: patient.firstName, practiceName: praxis, start, ort, url });
  await recordAttempt(key, 3600e3);

  // Im Gastzugang sind die Patienten erfunden: WhatsApp öffnet sich mit dem Text, aber ohne Empfänger.
  if (practice?.isDemo) {
    await nachher();
    return NextResponse.json({ ok: true, weg: "link", link: waLink(null, text), hinweis: "Gastzugang: WhatsApp öffnet sich mit dem fertigen Text, aber ohne Empfänger." }, { headers: { "Cache-Control": "no-store" } });
  }

  if (whatsappApiAktiv()) {
    const inhalt = text.replace(/^Hallo [^,]*, /, "");
    const r = await whatsappSenden({ nummer: pruef.nummer, firstName: patient.firstName, practiceName: praxis, inhalt });
    if (!r.ok) return NextResponse.json({ error: r.fehler }, { status: 502 });
    await nachher();
    await auditFromSession(session, "nachricht.whatsapp", { ...entity, summary: `${art} über WhatsApp Business verschickt` });
    return NextResponse.json({ ok: true, weg: "api" });
  }

  await nachher();
  await auditFromSession(session, "nachricht.whatsapp", { ...entity, summary: `${art}: WhatsApp mit fertigem Text geöffnet` });
  return NextResponse.json({ ok: true, weg: "link", link: waLink(pruef.nummer, text) }, { headers: { "Cache-Control": "no-store" } });
}
