import { NextResponse } from "next/server";
import { aufraeumen } from "@/lib/aufraeumen";
import { prisma } from "@/lib/prisma";
import { kalenderAbgleichen } from "@/lib/kalenderSync";
import { erinnerungenMelden } from "@/lib/erinnerungWunsch";
import { fehlerMailSenden } from "@/lib/fehlerSpeicher";
import { stichtag } from "@/lib/loeschfristen";

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
  // „Erinnern Sie mich“: fällige Wünsche der Patienten als Aufgabe in den Eingang der Praxis (es geht keine Nachricht raus)
  const erinnerungen = await erinnerungenMelden().catch((err) => { console.error("Erinnerungswünsche konnten nicht gemeldet werden", err); return 0; });
  // Lese-Links für Vertrauenspersonen: nach der Frist aus lib/loeschfristen.ts entfernen (sie gelten ohnehin nicht mehr)
  await prisma.leseLink.deleteMany({ where: { expiresAt: { lt: stichtag("leselink") } } }).catch(() => null);
  // Neue Fehler seit gestern: eine Mail an das Sorrida-Team (nur Zahl, Orte und der Link /betrieb, keine Meldungstexte)
  const fehlerMail = await fehlerMailSenden().catch(() => ({ neu: 0, versendet: false }));
  return NextResponse.json({ ok: true, ergebnis, kalender, erinnerungen, fehlerMail });
}
