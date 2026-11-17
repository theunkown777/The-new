import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mitPatientenGrenze } from "@/lib/patientenImportSperre";
import { absageText, neueKontaktdaten, zusageText } from "@/lib/terminanfrage";
import { kandidaten } from "@/lib/terminanfrageLoad";
import { auditFromSession } from "@/lib/audit";

const schema = z.discriminatedUnion("aktion", [
  // patientId: vorhandener Patient, den Sorrida nach Name und Geburtsdatum vorgeschlagen hat; ohne = neu anlegen
  // kontaktUebernehmen: Nur mit diesem ausdrücklichen Ja kommen Mobilnummer oder E-Mail aus dem (ungeprüften) Formular in eine vorhandene Akte.
  z.object({ aktion: z.literal("bestaetigen"), patientId: z.string().min(1).max(40).optional().nullable(), kontaktUebernehmen: z.boolean().optional() }).strict(),
  z.object({ aktion: z.literal("ablehnen") }).strict(),
]);

class SchonBearbeitet extends Error {}

// Online-Anfrage eines neuen Patienten bestätigen oder ablehnen. Erst beim Bestätigen entstehen
// Patient (oder Zuordnung zu einem vorhandenen) und Termin. Verschickt wird nichts: Die Antwort
// enthält einen Text, den die Praxis selbst kopiert und sendet.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  const von = session.user.name ?? "Praxis";

  const [anfrage, praxis] = await Promise.all([
    prisma.terminanfrage.findFirst({ where: { id: params.id, practiceId } }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, isDemo: true, locations: { select: { id: true } } } }),
  ]);
  if (!anfrage) return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  if (anfrage.status !== "OFFEN") return NextResponse.json({ error: "Diese Anfrage ist schon bearbeitet." }, { status: 409 });
  const praxisName = praxis?.name ?? "Ihrer Praxis";
  const kontakt = { phone: anfrage.phone, email: anfrage.email };
  const now = new Date();

  if (d.aktion === "ablehnen") {
    const r = await prisma.terminanfrage.updateMany({ where: { id: anfrage.id, practiceId, status: "OFFEN" }, data: { status: "ABGELEHNT", bearbeitetAt: now, bearbeitetVon: von } });
    if (!r.count) return NextResponse.json({ error: "Diese Anfrage ist schon bearbeitet." }, { status: 409 });
    await auditFromSession(session, "terminanfrage", { entityType: "Terminanfrage", entityId: anfrage.id, summary: "abgelehnt" });
    return NextResponse.json({ ok: true, status: "ABGELEHNT", text: absageText({ firstName: anfrage.firstName, practiceName: praxisName, start: anfrage.start }), kontakt });
  }

  if (anfrage.start.getTime() <= now.getTime()) return NextResponse.json({ error: "Die gewünschte Zeit liegt in der Vergangenheit. Bitte lehnen Sie die Anfrage ab und vereinbaren Sie einen neuen Termin." }, { status: 409 });

  // Zuordnung nur zu einem Patienten der eigenen Praxis, der nach Name und Geburtsdatum zur Anfrage passt.
  let vorhandener: { id: string; phone: string | null; email: string | null } | null = null;
  if (d.patientId) {
    vorhandener = (await kandidaten(practiceId, anfrage)).find((p) => p.id === d.patientId) ?? null;
    if (!vorhandener) return NextResponse.json({ error: "Dieser Patient passt nicht zur Anfrage. Bitte neu anlegen." }, { status: 409 });
  }
  const neuerKontakt = vorhandener && d.kontaktUebernehmen === true ? neueKontaktdaten(anfrage, vorhandener) : {};
  const ort = praxis?.locations.length === 1 ? praxis.locations[0].id : null;
  const eingang = anfrage.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

  let ergebnis: { patientId: string; terminId: string };
  try {
    // Gastzugang: Ein neuer Patient zählt zur Obergrenze wie bei Neuanlage und Import (lib/patientenImportSperre.ts).
    const mit = await mitPatientenGrenze({ practiceId, demo: praxis?.isDemo === true, neu: vorhandener ? 0 : 1 }, async (tx) => {
      // Zuerst die Anfrage festhalten: Zwei gleichzeitige Klicks legen so nicht zwei Patienten an.
      const r = await tx.terminanfrage.updateMany({ where: { id: anfrage.id, practiceId, status: "OFFEN" }, data: { status: "BESTAETIGT", bearbeitetAt: now, bearbeitetVon: von } });
      if (!r.count) throw new SchonBearbeitet();
      let patientId: string;
      if (vorhandener) {
        patientId = vorhandener.id;
        // Das Formular prüft nicht, wer es ausfüllt: Kontaktdaten kommen nur in die Akte, wenn die Praxis es
        // ausdrücklich angeklickt hat. Vorhandene Angaben werden nie überschrieben. Einwilligungen bleiben leer.
        if (Object.keys(neuerKontakt).length) await tx.patient.update({ where: { id: patientId }, data: neuerKontakt });
      } else {
        const p = await tx.patient.create({
          data: {
            practiceId, firstName: anfrage.firstName, lastName: anfrage.lastName, birthDate: anfrage.birthDate, phone: anfrage.phone, email: anfrage.email,
            notes: `Online angemeldet am ${eingang} über die Buchungsseite${anfrage.beispiel ? " (Beispiel aus dem Gastzugang)" : ""}.`,
          },
          select: { id: true },
        });
        patientId = p.id;
      }
      const termin = await tx.appointment.create({
        data: { practiceId, patientId, locationId: ort, start: anfrage.start, minutes: anfrage.minutes, reason: `Online-Anfrage: ${anfrage.anlass}`, quelle: "NEU" },
        select: { id: true },
      });
      await tx.terminanfrage.update({ where: { id: anfrage.id }, data: { patientId, appointmentId: termin.id } });
      return { patientId, terminId: termin.id };
    });
    if (!mit.ok) return NextResponse.json({ error: mit.grund, code: mit.belegt ? "BELEGT" : "GRENZE" }, { status: 409 });
    ergebnis = mit.wert;
  } catch (err) {
    if (err instanceof SchonBearbeitet) return NextResponse.json({ error: "Diese Anfrage ist schon bearbeitet." }, { status: 409 });
    throw err;
  }
  await auditFromSession(session, "terminanfrage", { entityType: "Terminanfrage", entityId: anfrage.id, summary: vorhandener ? "bestätigt, vorhandenem Patienten zugeordnet" : "bestätigt, Patient neu angelegt" });
  if (vorhandener && Object.keys(neuerKontakt).length) {
    // Ohne die Angabe selbst: nur, welches Feld übernommen wurde und woher.
    await auditFromSession(session, "patient.kontakt", { entityType: "Patient", entityId: vorhandener.id, summary: `${[neuerKontakt.phone ? "Mobilnummer" : null, neuerKontakt.email ? "E-Mail-Adresse" : null].filter(Boolean).join(" und ")} aus Online-Anfrage übernommen, nicht geprüft` });
  }
  return NextResponse.json({
    ok: true, status: "BESTAETIGT", ...ergebnis, neuAngelegt: !vorhandener, kontaktUebernommen: Object.keys(neuerKontakt).length > 0,
    tag: anfrage.start.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }),
    text: zusageText({ firstName: anfrage.firstName, practiceName: praxisName, start: anfrage.start }), kontakt,
  });
}
