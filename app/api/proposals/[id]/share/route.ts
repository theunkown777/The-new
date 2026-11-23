import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { PATIENT_LINK_TTL_MS } from "@/lib/patientLink";
import { resolvePrices } from "@/lib/proposals";
import { leererVorschlag, proposalInputSchema } from "@/lib/proposalSchema";

// Patienten-Link erzeugen. Ein neuer Link macht den vorherigen ungültig.
// Der Link wird nur in dieser Antwort im Klartext ausgegeben.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    select: { id: true, shareCreatedAt: true, input: true, practice: { select: { proposalPrices: true } } },
  });
  if (!proposal) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  // Ohne Position sähen Patienten nur „0 Positionen“ und die Antwortknöpfe.
  const gespeichert = proposalInputSchema.safeParse(proposal.input);
  const leer = gespeichert.success ? leererVorschlag(gespeichert.data, resolvePrices(proposal.practice.proposalPrices)) : null;
  if (leer) return NextResponse.json({ error: leer }, { status: 400 });

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + PATIENT_LINK_TTL_MS);
  await prisma.treatmentProposal.update({
    where: { id: proposal.id },
    data: { shareTokenHash: hash, shareExpiresAt: expiresAt, patientViewedAt: null, shareCreatedAt: proposal.shareCreatedAt ?? new Date() },
  });

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const url = `${base}/p/${raw}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#24201f", light: "#ffffff" } });
  // Fach des Vorschlags (input.fach) für den Text zum Weitergeben: „Ihr Beratungsvorschlag“ (lib/fachText.ts)
  const fach = (proposal.input as { fach?: unknown } | null)?.fach;
  return NextResponse.json({ url, qr, expiresAt, fach: typeof fach === "string" ? fach : null }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const res = await prisma.treatmentProposal.updateMany({
    where: { id: params.id, practiceId: session.user.practiceId },
    data: { shareTokenHash: null, shareExpiresAt: null },
  });
  if (res.count === 0) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
