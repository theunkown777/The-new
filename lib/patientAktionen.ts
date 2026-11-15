import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { consumeAttempt } from "@/lib/rateLimit";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { LESE_LINK_MAX, TOKEN_FORM, leseLinkErzeugen, leseLinkWiderrufen, leseLinksAktiv } from "@/lib/leseLink";
import { erinnernAm, erinnernMoeglich, istErinnernTage } from "@/lib/erinnerungWunsch";

// Gemeinsame Schnittstellen der Patientenansicht für Patienten-Link (/api/p/<token>/…) und Portal
// (/api/portal/<token>/vorschlag/<id>/…): Lese-Link für Vertrauenspersonen und „Erinnern Sie mich“.
// Beides löst der Patient selbst aus; es geht dabei keine Nachricht an irgendwen.

const KOPF = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: KOPF });
const ABGELAUFEN = "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis.";

export type PatientZugang = { proposalId: string; status: string; quelle: "LINK" | "PORTAL"; expiresAt: Date; zugangHash: string };

/** Zugang über den Patienten-Link: derselbe Test wie auf der Seite /p/<token>. */
export async function zugangLink(token: string): Promise<PatientZugang | null> {
  if (!TOKEN_FORM.test(token)) return null;
  const p = await prisma.treatmentProposal.findUnique({ where: { shareTokenHash: hashToken(token) }, select: { id: true, status: true, shareExpiresAt: true } });
  if (!p || !p.shareExpiresAt || p.shareExpiresAt < new Date()) return null;
  return { proposalId: p.id, status: p.status, quelle: "LINK", expiresAt: p.shareExpiresAt, zugangHash: hashToken(token) };
}

/** Zugang über das Portal: Portal-Link des Patienten und ein Vorschlag, den er dort sehen darf. */
export async function zugangPortal(token: string, id: string): Promise<PatientZugang | null> {
  const patient = await portalPatient(token);
  if (!patient) return null;
  const p = await prisma.treatmentProposal.findFirst({ where: { id, ...portalProposalWhere(patient.id) }, select: { id: true, status: true } });
  if (!p) return null;
  return { proposalId: p.id, status: p.status, quelle: "PORTAL", expiresAt: patient.portalExpiresAt!, zugangHash: hashToken(token) };
}

async function begrenzt(req: Request): Promise<boolean> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  return !(await consumeAttempt(`patient-aktion:${ip}`, 40, 60 * 60 * 1000));
}

/** Lese-Links: GET listet die aktiven, POST erzeugt einen (Token nur in dieser Antwort), DELETE widerruft einen. */
export async function leseLinkAntwort(req: Request, zugang: PatientZugang | null): Promise<NextResponse> {
  if (await begrenzt(req)) return json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, 429);
  if (!zugang) return json({ error: ABGELAUFEN }, 404);
  if (req.method === "POST") {
    const neu = await leseLinkErzeugen(zugang.proposalId, zugang.quelle, zugang.expiresAt, zugang.zugangHash);
    if (!neu) return json({ error: `Es sind höchstens ${LESE_LINK_MAX} Lese-Links gleichzeitig möglich.`, code: "LIMIT" }, 409);
    return json({ ok: true, pfad: `/p/${neu.raw}/lesen`, links: await leseLinksAktiv(zugang.proposalId), max: LESE_LINK_MAX });
  }
  if (req.method === "DELETE") {
    const body = z.object({ id: z.string().min(1).max(60) }).safeParse(await req.json().catch(() => null));
    if (!body.success) return json({ error: "Ungültige Angaben" }, 400);
    await leseLinkWiderrufen(zugang.proposalId, body.data.id);
  }
  return json({ ok: true, links: await leseLinksAktiv(zugang.proposalId), max: LESE_LINK_MAX });
}

/** „Erinnern Sie mich“: POST speichert den gewählten Tag, DELETE löscht ihn wieder. */
export async function erinnernAntwort(req: Request, zugang: PatientZugang | null): Promise<NextResponse> {
  if (await begrenzt(req)) return json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, 429);
  if (!zugang) return json({ error: ABGELAUFEN }, 404);
  if (req.method === "DELETE") {
    await prisma.treatmentProposal.update({ where: { id: zugang.proposalId }, data: { erinnernAm: null, erinnernGemeldetAt: null } });
    return json({ ok: true, erinnernAm: null });
  }
  if (!erinnernMoeglich(zugang.status)) return json({ error: "Über diesen Vorschlag ist schon entschieden." }, 409);
  const body = z.object({ tage: z.number() }).safeParse(await req.json().catch(() => null));
  if (!body.success || !istErinnernTage(body.data.tage)) return json({ error: "Ungültige Angaben" }, 400);
  const am = erinnernAm(body.data.tage);
  await prisma.treatmentProposal.update({ where: { id: zugang.proposalId }, data: { erinnernAm: am, erinnernGemeldetAt: null } });
  return json({ ok: true, erinnernAm: am.toISOString() });
}
