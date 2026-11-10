import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { eingangErledigen, eingangMelden } from "@/lib/eingang";
import { MAX_ZWEITMEINUNGEN, alsEintrag, zweitmeinungSchema, zweitmeinungTeilenSchema } from "@/lib/zweitmeinung";

// Gemeinsame Logik für Patienten-Link (/p/<token>) und Portal (/portal/<token>):
// Der Vorschlag wird allein über den Link des Patienten gefunden.

type Vorschlag = { id: string; practiceId: string };

async function begrenzt(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `zweitmeinung:${ip}`;
  if (await isRateLimited(key, 40, 60 * 60 * 1000)) return true;
  await recordAttempt(key, 60 * 60 * 1000);
  return false;
}

export async function vorschlagUeberLink(token: string): Promise<Vorschlag | null> {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  const p = await prisma.treatmentProposal.findUnique({ where: { shareTokenHash: hashToken(token) }, select: { id: true, practiceId: true, shareExpiresAt: true } });
  return p && p.shareExpiresAt && p.shareExpiresAt > new Date() ? p : null;
}

export async function vorschlagUeberPortal(token: string, id: string): Promise<Vorschlag | null> {
  const patient = await portalPatient(token);
  if (!patient) return null;
  return prisma.treatmentProposal.findFirst({ where: { id, ...portalProposalWhere(patient.id) }, select: { id: true, practiceId: true } });
}

const weg = () => NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });

export async function anlegen(req: Request, v: Vorschlag | null) {
  if (await begrenzt(req)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  if (!v) return weg();
  const parsed = zweitmeinungSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  if ((await prisma.zweitmeinung.count({ where: { proposalId: v.id } })) >= MAX_ZWEITMEINUNGEN)
    return NextResponse.json({ error: `Höchstens ${MAX_ZWEITMEINUNGEN} Vergleiche. Bitte einen löschen.` }, { status: 409 });
  const d = parsed.data;
  const z = await prisma.zweitmeinung.create({
    data: { practiceId: v.practiceId, proposalId: v.id, praxis: d.praxis, leistung: d.leistung, eigenanteilCent: d.eigenanteil, gesamtCent: d.gesamt ?? null, notiz: d.notiz },
  });
  return NextResponse.json({ eintrag: alsEintrag(z) }, { status: 201 });
}

export async function aendern(req: Request, v: Vorschlag | null, zid: string) {
  if (await begrenzt(req)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  if (!v) return weg();
  const parsed = zweitmeinungTeilenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const r = await prisma.zweitmeinung.updateMany({ where: { id: zid, proposalId: v.id }, data: { geteiltAt: parsed.data.geteilt ? new Date() : null } });
  if (!r.count) return weg();
  if (parsed.data.geteilt) {
    const vp = await prisma.treatmentProposal.findUnique({ where: { id: v.id }, select: { patientId: true } });
    if (vp) await eingangMelden({ practiceId: v.practiceId, patientId: vp.patientId, art: "ZWEITMEINUNG", entityId: v.id });
  } else if ((await prisma.zweitmeinung.count({ where: { proposalId: v.id, geteiltAt: { not: null } } })) === 0) {
    await eingangErledigen(v.practiceId, ["ZWEITMEINUNG"], v.id, "Patient (nicht mehr geteilt)");
  }
  return NextResponse.json({ ok: true });
}

export async function loeschen(req: Request, v: Vorschlag | null, zid: string) {
  if (await begrenzt(req)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  if (!v) return weg();
  const r = await prisma.zweitmeinung.deleteMany({ where: { id: zid, proposalId: v.id } });
  return r.count ? NextResponse.json({ ok: true }) : weg();
}
