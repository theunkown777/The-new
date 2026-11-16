import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { kiFehlerGrund } from "@/lib/anthropic";
import { KI_ANTWORT_HINWEIS, KiAntwortFehler, kiHilfeBeantworten, kiHilfenZugang } from "@/lib/kiHilfen";
import { HILFE_WISSEN } from "@/lib/hilfeWissen";
import { sucheHilfe } from "@/lib/hilfeSuche";
import { isDental } from "@/lib/specialties";

// „Frag Sorrida“ mit KI: Die Frage und die fünf besten Einträge der festen Wissenssammlung gehen an den
// KI-Dienst. Er antwortet nur aus diesen Einträgen und nennt die Quelle; passt nichts, sagt er das.
// Keine Patientendaten: Die Frage wird vor dem Senden bereinigt, die Einträge enthalten keine.
const schema = z.object({ frage: z.string().trim().min(3).max(500) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte geben Sie eine Frage ein (höchstens 500 Zeichen)." }, { status: 400 });
  const practiceId = session.user.practiceId;

  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } });
  const beste = sucheHilfe(parsed.data.frage, HILFE_WISSEN, { anzahl: 5, fach: isDental(praxis?.specialty) ? "zahn" : "andere" }).map((t) => t.eintrag);
  // Ohne passenden Eintrag gibt es nichts, woraus die KI antworten dürfte: keine Anfrage an den Dienst.
  if (beste.length === 0) return NextResponse.json({ passt: false, antwort: "", quellen: [], entwurf: true });

  const zugang = await kiHilfenZugang(practiceId, "hilfe");
  if (!zugang.ok) return NextResponse.json({ error: zugang.error }, { status: zugang.status });

  try {
    const r = await kiHilfeBeantworten({ frage: parsed.data.frage, eintraege: beste });
    await auditFromSession(session, "ki.hilfe", { summary: r.passt ? `${r.quellen.length} Quellen` : "keine passende Quelle" });
    const quellen = r.quellen.flatMap((id) => beste.filter((e) => e.id === id).map((e) => ({ id: e.id, frage: e.frage, pfad: e.pfad, href: e.href })));
    return NextResponse.json({ passt: r.passt, antwort: r.antwort, quellen, entwurf: true });
  } catch (e) {
    if (e instanceof KiAntwortFehler) return NextResponse.json({ error: KI_ANTWORT_HINWEIS }, { status: 502 });
    console.error("KI-Hilfe fehlgeschlagen", e instanceof Error ? e.name : "Fehler");
    return NextResponse.json({ error: `Antwort mit KI nicht möglich: ${kiFehlerGrund(e)} Die Einträge oben stehen weiter bereit.` }, { status: 502 });
  }
}
