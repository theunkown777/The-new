import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailVersandAktiv, sendEmail } from "@/lib/email";
import { morgenMailText, morgenSumme, morgenZahlen } from "@/lib/morgenmail";

// Werktags morgens von Vercel Cron aufgerufen (vercel.json), nur mit CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 401 });
  }
  if (!mailVersandAktiv()) return NextResponse.json({ ok: true, verschickt: 0, hinweis: "Mailversand nicht eingerichtet" });
  const now = new Date();
  const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const praxen = await prisma.practice.findMany({
    where: { morgenMail: true, morgenMailAn: { not: null }, isDemo: false },
    select: { id: true, name: true, morgenMailAn: true, morgenMailZuletzt: true },
    take: 500,
  });
  let verschickt = 0;
  for (const p of praxen) {
    // Höchstens eine Mail in 20 Stunden, auch wenn der Job doppelt läuft.
    if (p.morgenMailZuletzt && now.getTime() - p.morgenMailZuletzt.getTime() < 20 * 3600 * 1000) continue;
    const zahlen = await morgenZahlen(p.id, now).catch(() => null);
    if (!zahlen || morgenSumme(zahlen) === 0) continue; // nichts offen: keine Mail
    const { subject, html } = morgenMailText(zahlen, { practiceName: p.name, baseUrl });
    const r = await sendEmail({ to: p.morgenMailAn!, subject, html }).catch(() => null);
    if (r?.versendet) {
      verschickt++;
      await prisma.practice.update({ where: { id: p.id }, data: { morgenMailZuletzt: now } });
    }
  }
  return NextResponse.json({ ok: true, verschickt });
}
