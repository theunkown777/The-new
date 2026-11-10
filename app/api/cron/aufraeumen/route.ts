import { NextResponse } from "next/server";
import { aufraeumen } from "@/lib/aufraeumen";
import { prisma } from "@/lib/prisma";
import { kalenderAbgleichen } from "@/lib/kalenderSync";

// Täglich von Vercel Cron aufgerufen (vercel.json). Mit gesetztem
// CRON_SECRET schickt Vercel es als Bearer-Token mit; nur dann läuft der Job.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 401 });
  }
  const ergebnis = await aufraeumen();
  console.log("Löschfristen angewendet", ergebnis);
  // Kalender der Praxen mit Online-Terminen abgleichen und alte Belegungen entfernen (zusätzlich zum Abgleich bei Bedarf)
  const praxen = await prisma.practice.findMany({ where: { kalenderUrl: { not: null } }, select: { id: true }, take: 300 });
  let kalender = 0;
  for (const p of praxen) { const r = await kalenderAbgleichen(p.id).catch(() => null); if (r?.ok) kalender++; }
  await prisma.kalenderBelegung.deleteMany({ where: { ende: { lt: new Date(Date.now() - 2 * 864e5) } } });
  return NextResponse.json({ ok: true, ergebnis, kalender });
}
