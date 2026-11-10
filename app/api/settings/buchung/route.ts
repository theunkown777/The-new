import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buchungSchema } from "@/lib/buchung";
import { kalenderAbgleichen, kalenderUrlPruefen } from "@/lib/kalenderSync";
import { generateToken } from "@/lib/tokens";
import { auditFromSession } from "@/lib/audit";

async function admin() {
  const session = await getServerSession(authOptions);
  if (!session) return { fehler: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  if (session.user.role !== "admin") return { fehler: NextResponse.json({ error: "Nur die Geschäftsführung kann Online-Termine einstellen." }, { status: 403 }) } as const;
  return { session } as const;
}

// Sprechzeiten und Regeln der Online-Buchung speichern.
export async function PUT(req: Request) {
  const a = await admin();
  if ("fehler" in a) return a.fehler;
  const parsed = buchungSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  if (d.buchungAktiv && !Object.values(d.sprechzeiten).some((t) => t?.length)) return NextResponse.json({ error: "Bitte mindestens eine Sprechzeit eintragen." }, { status: 400 });
  await prisma.practice.update({ where: { id: a.session.user.practiceId }, data: d });
  await auditFromSession(a.session, "kalender", { summary: `Online-Termine ${d.buchungAktiv ? "eingeschaltet" : "ausgeschaltet"}` });
  return NextResponse.json({ ok: true });
}

const aktion = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("kalender-verbinden"), url: z.string().min(8).max(2000) }),
  z.object({ aktion: z.literal("kalender-abgleichen") }),
  z.object({ aktion: z.literal("kalender-trennen") }),
  z.object({ aktion: z.literal("datei-entfernen") }),
  z.object({ aktion: z.literal("abo-link") }),
  z.object({ aktion: z.literal("abo-link-sperren") }),
]);

// Kalender verbinden, abgleichen, trennen; Abo-Link für den eigenen Kalender erzeugen.
export async function POST(req: Request) {
  const a = await admin();
  if ("fehler" in a) return a.fehler;
  const parsed = aktion.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const practiceId = a.session.user.practiceId;
  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } });
  const d = parsed.data;

  if (d.aktion === "kalender-verbinden") {
    if (praxis?.isDemo) return NextResponse.json({ error: "Im Gastzugang ruft Sorrida keinen fremden Kalender ab. Bitte laden Sie zum Ausprobieren eine Kalenderdatei (.ics) hoch." }, { status: 403 });
    const p = kalenderUrlPruefen(d.url);
    if ("fehler" in p) return NextResponse.json({ error: p.fehler }, { status: 400 });
    await prisma.practice.update({ where: { id: practiceId }, data: { kalenderUrl: p.url, kalenderSyncAt: null, kalenderSyncFehler: null } });
    const r = await kalenderAbgleichen(practiceId);
    if (!r.ok) {
      await prisma.practice.update({ where: { id: practiceId }, data: { kalenderUrl: null, kalenderSyncFehler: null } });
      return NextResponse.json({ error: r.fehler }, { status: 400 });
    }
    await auditFromSession(a.session, "kalender", { summary: "Praxiskalender verbunden" });
    return NextResponse.json({ ok: true, anzahl: r.anzahl });
  }
  if (d.aktion === "kalender-abgleichen") {
    const r = await kalenderAbgleichen(practiceId);
    return r.ok ? NextResponse.json({ ok: true, anzahl: r.anzahl }) : NextResponse.json({ error: r.fehler }, { status: 400 });
  }
  if (d.aktion === "kalender-trennen") {
    await prisma.$transaction([
      prisma.kalenderBelegung.deleteMany({ where: { practiceId, quelle: "abo" } }),
      prisma.practice.update({ where: { id: practiceId }, data: { kalenderUrl: null, kalenderSyncAt: null, kalenderSyncFehler: null } }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (d.aktion === "datei-entfernen") {
    await prisma.kalenderBelegung.deleteMany({ where: { practiceId, quelle: "datei" } });
    return NextResponse.json({ ok: true });
  }
  if (d.aktion === "abo-link") {
    const { raw, hash } = generateToken();
    await prisma.practice.update({ where: { id: practiceId }, data: { kalenderFeedHash: hash } });
    const basis = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(req.url).origin;
    return NextResponse.json({ ok: true, link: `${basis}/api/kalender/${raw}` });
  }
  await prisma.practice.update({ where: { id: practiceId }, data: { kalenderFeedHash: null } });
  return NextResponse.json({ ok: true });
}
