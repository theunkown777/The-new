import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { favoritSchema, favoritSetzen, favoritenLesen } from "@/lib/favoriten";

// Vorschlag-Favoriten der Praxis: lesen, speichern und löschen darf jedes Teammitglied.
// Gespeichert wird nur die Auswahl (Anlässe, Befunde, Wahl), nichts über Patienten.
async function laden(practiceId: string) {
  const p = await prisma.practice.findUnique({ where: { id: practiceId }, select: { vorschlagFavoriten: true } });
  return favoritenLesen(p?.vorschlagFavoriten);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ favoriten: await laden(session.user.practiceId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = favoritSchema.omit({ id: true }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const neu = { ...parsed.data, id: crypto.randomUUID().slice(0, 12) };
  const r = favoritSetzen(await laden(session.user.practiceId), neu);
  if (!r.ok) return NextResponse.json({ error: r.fehler }, { status: 409 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { vorschlagFavoriten: r.liste } });
  return NextResponse.json({ favoriten: r.liste }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = z.object({ id: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const liste = (await laden(session.user.practiceId)).filter((f) => f.id !== parsed.data.id);
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { vorschlagFavoriten: liste } });
  return NextResponse.json({ favoriten: liste });
}
