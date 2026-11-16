import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kontoDarf } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { kiFehlerGrund } from "@/lib/anthropic";
import { KI_ANTWORT_HINWEIS, KiAntwortFehler, kiAnlaesseZuordnen, kiHilfenZugang } from "@/lib/kiHilfen";
import { anlassEintraege } from "@/lib/anlassErkennung";
import { resolveMed } from "@/lib/practiceMed";
import { specialty } from "@/lib/specialties";
import { CUSTOM_PREFIX } from "@/lib/medicalProposals";

// „Mit KI zuordnen“ im Vorschlags-Editor: Stichworte aus dem Gespräch den Anlässen des Fachs zuordnen.
// An den KI-Dienst gehen nur der bereinigte Text (ohne Namen, Kontaktdaten, Datumsangaben,
// Versichertennummern) und die Bezeichnungen der Anlässe. Zurück kommen IDs aus der Liste der Praxis.
// Das Ergebnis ist ein Entwurf: Angekreuzt wird erst, was die Person in der Praxis bestätigt.
const schema = z.object({ text: z.string().trim().min(3).max(2000), patientId: z.string().max(60).optional().nullable() });

const namensTeile = (name: string | null | undefined) => {
  const teile = (name ?? "").split(/\s+/).filter((t) => t.length >= 3 && !/^(dr|prof|med|dent|dipl)\.?$/i.test(t));
  return teile.length ? [{ firstName: teile[0], lastName: teile[teile.length - 1] }] : [];
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;
  if (!(await kontoDarf(session.user.id, "vorschlaege", practiceId))) return NextResponse.json({ error: "Dafür hat Ihr Konto keine Berechtigung." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte geben Sie Stichworte ein (höchstens 2000 Zeichen)." }, { status: 400 });

  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true, medPrices: true, customOffers: true } });
  const { fach, med } = resolveMed(praxis ?? {});
  const liste = anlassEintraege(specialty(fach)?.anlaesse ?? [], med.custom ?? [], CUSTOM_PREFIX);
  if (liste.length === 0) return NextResponse.json({ error: "Für Ihr Fachgebiet sind keine Anlässe hinterlegt." }, { status: 400 });

  const zugang = await kiHilfenZugang(practiceId, "anlass");
  if (!zugang.ok) return NextResponse.json({ error: zugang.error }, { status: zugang.status });

  // Namen, die Sorrida kennt, vor dem Senden entfernen: Patient (nur aus der eigenen Praxis) und Team.
  const [patient, team] = await Promise.all([
    parsed.data.patientId ? prisma.patient.findFirst({ where: { id: parsed.data.patientId, practiceId }, select: { firstName: true, lastName: true } }) : null,
    prisma.user.findMany({ where: { practiceId }, select: { name: true }, take: 200 }),
  ]);
  const namen = [...(patient ? [patient] : []), ...team.flatMap((u) => namensTeile(u.name))];

  try {
    const ids = await kiAnlaesseZuordnen({ text: parsed.data.text, anlaesse: liste, namen });
    await auditFromSession(session, "ki.anlass", { summary: `${ids.length} Anlässe vorgeschlagen` });
    return NextResponse.json({ ids, entwurf: true });
  } catch (e) {
    if (e instanceof KiAntwortFehler) return NextResponse.json({ error: KI_ANTWORT_HINWEIS }, { status: 502 });
    console.error("KI-Zuordnung der Anlässe fehlgeschlagen", e instanceof Error ? e.name : "Fehler");
    return NextResponse.json({ error: `Zuordnung mit KI nicht möglich: ${kiFehlerGrund(e)} Die Erkennung ohne KI steht weiter bereit.` }, { status: 502 });
  }
}
