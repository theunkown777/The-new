import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { ANAMNESIS_LINK_TTL_MS } from "@/lib/anamnesis";

// Link zum digitalen Anamnesebogen erzeugen. Offene, noch nicht ausgefüllte
// Bögen desselben Patienten werden dabei ungültig.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;

  const patient = await prisma.patient.findFirst({ where: { id: params.id, practiceId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + ANAMNESIS_LINK_TTL_MS);
  await prisma.$transaction([
    prisma.anamnesisForm.updateMany({
      where: { practiceId, patientId: patient.id, submittedAt: null },
      data: { tokenHash: null, expiresAt: new Date() },
    }),
    prisma.anamnesisForm.create({ data: { practiceId, patientId: patient.id, tokenHash: hash, expiresAt } }),
  ]);

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const url = `${base}/a/${raw}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#24201f", light: "#ffffff" } });
  return NextResponse.json({ url, qr, expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
