import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { antwortAnrede, antwortBetreff, antwortEntwurf, hatAntwortEntwurf, rueckmeldungArt } from "@/lib/antwortBausteine";
import { darfMailen } from "@/lib/kontakt";
import { darfWhatsapp } from "@/lib/whatsapp";
import { leseStammdaten } from "@/lib/praxisStammdaten";
import { istOhneAkte } from "@/lib/ohneAkte";

// „Antwort vorbereiten“ im Eingang: Text aus festen Bausteinen (lib/antwortBausteine.ts) zu einer
// Rückmeldung zum Vorschlag. Ohne KI. Sorrida verschickt hier nichts: Die Praxis ändert den Text und
// kopiert ihn oder öffnet WhatsApp bzw. ihr E-Mail-Programm. Diese beiden Wege gibt es nur mit
// Nummer bzw. Adresse UND dokumentierter Einwilligung des Patienten für genau diesen Weg.
async function laden(id: string, practiceId: string) {
  return prisma.eingang.findFirst({
    where: { id, practiceId },
    select: {
      id: true, art: true, entityId: true, patientId: true,
      patient: { select: { firstName: true, lastName: true, geschlecht: true, ohneAkte: true, email: true, phone: true, contactConsentAt: true, whatsappConsentAt: true } },
    },
  });
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;
  const eintrag = await laden(id, practiceId);
  if (!eintrag) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  if (!hatAntwortEntwurf(eintrag.art)) return NextResponse.json({ error: "Zu diesem Eintrag gibt es keinen Antwortentwurf." }, { status: 400 });

  const [praxis, vorschlag] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, stammdaten: true, isDemo: true } }),
    eintrag.art === "VORSCHLAG_INTERESSE" && eintrag.entityId
      ? prisma.treatmentProposal.findFirst({ where: { id: eintrag.entityId, practiceId }, select: { patientNote: true, patientChoices: true } })
      : null,
  ]);
  const wahl = vorschlag?.patientChoices && typeof vorschlag.patientChoices === "object" ? Object.keys(vorschlag.patientChoices as object).length > 0 : false;
  const art = rueckmeldungArt(eintrag.art, { nachricht: !!vorschlag?.patientNote?.trim(), wahl })!;
  const p = eintrag.patient;
  const praxisName = praxis?.name ?? "Ihre Praxis";
  const text = antwortEntwurf({ art, anrede: antwortAnrede({ ...p, ohneAkte: istOhneAkte(p) }), praxis: praxisName, telefon: leseStammdaten(praxis?.stammdaten).telefon });

  const wa = darfWhatsapp(p);
  const mail = darfMailen(p);
  // Gastzugang: erfundene Patienten, deshalb ohne Empfänger.
  const demo = !!praxis?.isDemo;
  return NextResponse.json(
    {
      text,
      betreff: antwortBetreff(praxisName),
      whatsapp: wa.ok ? { ok: true, nummer: demo ? null : wa.nummer } : { ok: false, grund: wa.grund },
      email: mail.ok ? { ok: true, adresse: demo ? null : p.email } : { ok: false, grund: mail.grund },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const schema = z.object({ weg: z.enum(["kopiert", "whatsapp", "email"]) });

/** Vermerk im Protokoll, auf welchem Weg die Praxis die Antwort weitergegeben hat. Ohne Inhalt. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const eintrag = await laden(id, session.user.practiceId);
  if (!eintrag) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  if (!hatAntwortEntwurf(eintrag.art)) return NextResponse.json({ error: "Zu diesem Eintrag gibt es keinen Antwortentwurf." }, { status: 400 });
  // Die Wege WhatsApp und E-Mail gibt es nur mit dokumentierter Einwilligung; auch der Vermerk prüft das.
  const p = eintrag.patient;
  if (parsed.data.weg === "whatsapp" && !darfWhatsapp(p).ok) return NextResponse.json({ error: "Keine Einwilligung in Nachrichten per WhatsApp dokumentiert." }, { status: 409 });
  if (parsed.data.weg === "email" && !darfMailen(p).ok) return NextResponse.json({ error: "Keine Einwilligung in Nachrichten per E-Mail dokumentiert." }, { status: 409 });
  const wie = { kopiert: "Text kopiert", whatsapp: "WhatsApp mit fertigem Text geöffnet", email: "E-Mail-Programm mit fertigem Text geöffnet" }[parsed.data.weg];
  await auditFromSession(session, "eingang.antwort", { entityType: "Patient", entityId: eintrag.patientId, summary: wie });
  return NextResponse.json({ ok: true });
}
