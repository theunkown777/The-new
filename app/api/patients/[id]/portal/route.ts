import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { PORTAL_TTL_MS } from "@/lib/invoices";

// Patientenportal-Link erzeugen: offene Rechnungen, Vorschläge und Anamnese
// auf dem Handy des Patienten. Ein neuer Link ersetzt den alten; der Link
// steht nur in dieser Antwort im Klartext.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + PORTAL_TTL_MS);
  const res = await prisma.patient.updateMany({
    where: { id: params.id, practiceId: session.user.practiceId },
    data: { portalTokenHash: hash, portalExpiresAt: expiresAt, portalViewedAt: null },
  });
  if (res.count === 0) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const url = `${base}/portal/${raw}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#24201f", light: "#ffffff" } });
  return NextResponse.json({ url, qr, expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const res = await prisma.patient.updateMany({
    where: { id: params.id, practiceId: session.user.practiceId },
    data: { portalTokenHash: null, portalExpiresAt: null },
  });
  if (res.count === 0) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
