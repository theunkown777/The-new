import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { angebotText, passt } from "@/lib/warteliste";
import { darfWhatsapp, waLink } from "@/lib/whatsapp";
import { istFrei } from "@/lib/buchung";
import { buchungsLage } from "@/lib/buchungLoad";
import { PORTAL_TTL_MS } from "@/lib/invoices";
import { generateToken } from "@/lib/tokens";
import { auditFromSession } from "@/lib/audit";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

const schema = z.object({ terminId: z.string().min(1).max(40) }).strict();

// „Diese Zeit anbieten“: erzeugt den Nachrichtentext mit persönlichem Link für eine Person von der
// Warteliste. Verschickt wird hier nichts: Die Praxis kopiert den Text oder öffnet WhatsApp und
// tippt dort selbst auf „Senden“. Der neue persönliche Link ersetzt den bisherigen Link der Person.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const practiceId = session.user.practiceId;
  const key = `nachricht:${practiceId}`;
  if (await isRateLimited(key, 300, 3600e3)) return NextResponse.json({ error: "Zu viele Nachrichten in kurzer Zeit." }, { status: 429 });

  const [eintrag, termin, practice, standorte] = await Promise.all([
    prisma.warteliste.findFirst({
      where: { id: params.id, practiceId },
      select: { id: true, patientId: true, vonTag: true, bisTag: true, zeit: true, createdAt: true, erledigtAt: true, patient: { select: { id: true, firstName: true, phone: true, whatsappConsentAt: true } } },
    }),
    prisma.appointment.findFirst({ where: { id: parsed.data.terminId, practiceId }, select: { id: true, start: true, status: true, patientId: true, location: { select: { name: true } } } }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, isDemo: true } }),
    prisma.location.count({ where: { practiceId } }),
  ]);
  if (!eintrag || eintrag.erledigtAt) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  if (!termin) return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  if (termin.status !== "ABGESAGT") return NextResponse.json({ error: "Dieser Termin ist nicht abgesagt. Die Zeit ist nicht frei." }, { status: 409 });
  if (termin.start.getTime() <= Date.now()) return NextResponse.json({ error: "Diese Zeit liegt in der Vergangenheit." }, { status: 409 });
  if (!passt(eintrag, termin)) return NextResponse.json({ error: "Diese Zeit passt nicht zum Wunsch auf der Warteliste." }, { status: 409 });

  // Lässt sich genau diese Zeit über den Link online buchen? Sonst bittet der Text um eine kurze Rückmeldung.
  const lage = await buchungsLage(practiceId);
  const onlineBuchbar = !!lage?.praxis.buchungAktiv && istFrei(lage.eingabe, termin.start.toISOString());

  const now = new Date();
  const { raw, hash } = generateToken();
  await prisma.$transaction([
    prisma.patient.update({ where: { id: eintrag.patient.id }, data: { portalTokenHash: hash, portalExpiresAt: new Date(now.getTime() + PORTAL_TTL_MS), portalViewedAt: null } }),
    prisma.warteliste.update({ where: { id: eintrag.id }, data: { angebotenAt: now } }),
  ]);
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const url = onlineBuchbar ? `${base}/portal/${raw}/termin` : `${base}/portal/${raw}`;
  const text = angebotText({ firstName: eintrag.patient.firstName, practiceName: practice?.name ?? "Ihrer Praxis", start: termin.start, ort: standorte > 1 ? termin.location?.name ?? null : null, url, onlineBuchbar });
  await recordAttempt(key, 3600e3);

  // WhatsApp nur mit Mobilnummer und eigener Einwilligung. Im Gastzugang (erfundene Patienten) ohne Empfänger.
  const wa = darfWhatsapp(eintrag.patient);
  const whatsapp = wa.ok ? waLink(practice?.isDemo ? null : wa.nummer, text) : null;
  await auditFromSession(session, "warteliste.angebot", { entityType: "Patient", entityId: eintrag.patient.id, summary: "Text mit persönlichem Link erzeugt" });
  return NextResponse.json({ ok: true, text, whatsapp, onlineBuchbar, keinWhatsapp: wa.ok ? null : wa.grund }, { headers: { "Cache-Control": "no-store" } });
}
