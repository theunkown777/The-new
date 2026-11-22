import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { kiFehlerGrund } from "@/lib/anthropic";
import { KI_ANTWORT_HINWEIS, KiAntwortFehler, gefundeneNamen, kiHilfeBeantworten, kiHilfenZugang, namensFilter, namensKandidaten } from "@/lib/kiHilfen";
import { HILFE_WISSEN } from "@/lib/hilfeWissen";
import { hilfeText, sichtbareHilfe } from "@/lib/hilfeSuche";
import { seitenTitel } from "@/lib/hilfeZeiger";
import { menueRechteVon } from "@/lib/permissions";
import { isDental } from "@/lib/specialties";
import { abschlussWort, fachprofil } from "@/lib/fachprofile";
import { gebuehrenwerkeFuer } from "@/lib/abrechnungsarten";

// „Frag Sorrida“ mit KI, nur auf Knopfdruck und nur mit eingeschalteten KI-Hilfen (sonst 409/503).
// An den KI-Dienst gehen: die Frage, bis zu drei frühere Fragen ohne Antworten, der Titel der geöffneten Seite aus einer
// festen Liste (nie der Pfad mit Kennungen) und als Grundlage die ganze Wissenssammlung, gefiltert nach Fach, Praxis und Rechten.
// Vorher ersetzt Sorrida Namen eigener Patienten (Abgleich nur innerhalb dieser Praxis), Namen nach einer Anrede,
// Kontaktdaten, Datumsangaben und Versichertennummern. Die Antwort stützt sich nur auf die Sammlung und nennt Quellen.
const schema = z.object({
  frage: z.string().trim().min(3).max(500),
  seite: z.string().max(300).optional(),
  verlauf: z.array(z.string().max(500)).max(3).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte geben Sie eine Frage ein (höchstens 500 Zeichen)." }, { status: 400 });
  const practiceId = session.user.practiceId;
  const { frage, seite, verlauf = [] } = parsed.data;

  // Schalter, Zugang und Grenze je Stunde zuerst: Ohne eingeschaltete KI-Hilfen wird nichts gelesen und nichts gesendet.
  const zugang = await kiHilfenZugang(practiceId, "hilfe");
  if (!zugang.ok) return NextResponse.json({ error: zugang.error }, { status: zugang.status });

  const [praxis, rechte] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } }),
    menueRechteVon(session.user.id, practiceId),
  ]);
  const { sg: person, pl: personPl } = fachprofil(praxis?.specialty).person;
  const woerter = { personPl, person, abschluss: abschlussWort(praxis?.specialty) };
  const merkmale = { gebuehrenrechner: gebuehrenwerkeFuer(praxis?.specialty).length > 0 };
  // Wie /hilfe-praxis: Zahn-Einträge nur bei Fach "zahn" (isDental ist ohne Fach false).
  const eintraege = sichtbareHilfe(HILFE_WISSEN, { fach: isDental(praxis?.specialty) ? "zahn" : "andere", rechte, merkmale }).map((e) => hilfeText(e, woerter));

  // Namen eigener Patienten in Frage und Verlauf finden, damit genau diese ersetzt werden. Nur in dieser Praxis.
  // Vor- und Nachnamen getrennt und je Name nur einmal (distinct): Auch 60 Patienten „Thomas“ verdrängen keinen
  // zweiten Namen. Ohne Obergrenze; die Zahl der Zeilen ist durch die verschiedenen Namen der Praxis begrenzt.
  const kandidaten = namensKandidaten([frage, ...verlauf]);
  const namen = kandidaten.length ? await eigeneNamen(practiceId, kandidaten) : [];

  try {
    const r = await kiHilfeBeantworten({ frage, eintraege, seitentitel: seite ? seitenTitel(seite, woerter) : null, verlauf, namen });
    await auditFromSession(session, "ki.hilfe", { summary: r.passt ? `${r.quellen.length} Quellen` : "keine passende Quelle" });
    const quellen = r.quellen.flatMap((id) => eintraege.filter((e) => e.id === id).map((e) => ({ id: e.id, frage: e.frage, pfad: e.pfad, href: e.href })));
    return NextResponse.json({ passt: r.passt && quellen.length > 0, antwort: quellen.length ? r.antwort : "", quellen, entwurf: true });
  } catch (e) {
    if (e instanceof KiAntwortFehler) return NextResponse.json({ error: KI_ANTWORT_HINWEIS }, { status: 502 });
    console.error("KI-Hilfe fehlgeschlagen", e instanceof Error ? e.name : "Fehler");
    return NextResponse.json({ error: `Antwort mit KI nicht möglich: ${kiFehlerGrund(e)} Die Einträge ohne KI stehen weiter bereit.` }, { status: 502 });
  }
}

/** Wörter aus Frage und Verlauf, die Vor- oder Nachname (oder ein Teil davon) eines eigenen Patienten sind. */
async function eigeneNamen(practiceId: string, kandidaten: string[]): Promise<string[]> {
  const mode = "insensitive" as const;
  const [vor, nach] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId, OR: kandidaten.flatMap((w) => namensFilter(w).map((f) => ({ firstName: { ...f, mode } }))) },
      select: { firstName: true },
      distinct: ["firstName"],
    }),
    prisma.patient.findMany({
      where: { practiceId, OR: kandidaten.flatMap((w) => namensFilter(w).map((f) => ({ lastName: { ...f, mode } }))) },
      select: { lastName: true },
      distinct: ["lastName"],
    }),
  ]);
  return gefundeneNamen(kandidaten, [...vor.map((p) => p.firstName), ...nach.map((p) => p.lastName)]);
}
