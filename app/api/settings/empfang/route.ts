import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pinProblem } from "@/lib/empfang";
import { auditFromSession } from "@/lib/audit";

const schema = z.object({ pin: z.string().max(12) }).strict();

// Empfangs-PIN festlegen oder ändern. Gespeichert wird nur der Hash. Eine neue PIN hebt eine laufende Sperre auf.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Geschäftsführung kann die Empfangs-PIN festlegen." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte genau vier Ziffern eingeben." }, { status: 400 });
  const problem = pinProblem(parsed.data.pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await prisma.practice.update({
    where: { id: session.user.practiceId },
    data: { empfangPinHash: await bcrypt.hash(parsed.data.pin, 10), empfangPinFehlversuche: 0, empfangPinSperren: 0, empfangPinGesperrtBis: null },
  });
  await auditFromSession(session, "empfang.pin", { summary: "festgelegt" });
  return NextResponse.json({ ok: true });
}
