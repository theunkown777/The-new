import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { einwilligungFortschreiben, kontaktSchema, leseVermerk, type EinwilligungVermerk } from "@/lib/kontakt";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const parsed = kontaktSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const alt = await prisma.patient.findUnique({ where: { id: patient.id }, select: { contactConsentAt: true, whatsappConsentAt: true, nachfassConsentAt: true, einwilligungVermerk: true, birthDate: true } });
  // Je Einwilligung: Zeitpunkt bleibt, solange sie besteht; neu erteilt mit Vermerk (wer, auf welchem Weg); Widerruf löscht beides.
  const vermerkAlt = leseVermerk(alt?.einwilligungVermerk);
  const neu = { von: session.user.name ?? "Praxis", weg: d.weg ?? ("muendlich" as const) };
  const mail = einwilligungFortschreiben({ am: alt?.contactConsentAt ?? null, vermerk: vermerkAlt.email }, !!d.einwilligung, neu);
  const wa = einwilligungFortschreiben({ am: alt?.whatsappConsentAt ?? null, vermerk: vermerkAlt.whatsapp }, d.whatsapp, neu);
  const nach = einwilligungFortschreiben({ am: alt?.nachfassConsentAt ?? null, vermerk: vermerkAlt.nachfassen }, d.nachfassen, neu);
  const vermerk: EinwilligungVermerk = { ...(mail.vermerk ? { email: mail.vermerk } : {}), ...(wa.vermerk ? { whatsapp: wa.vermerk } : {}), ...(nach.vermerk ? { nachfassen: nach.vermerk } : {}) };
  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      email: d.email || null,
      phone: d.phone || null,
      contactConsentAt: mail.am,
      whatsappConsentAt: wa.am,
      nachfassConsentAt: nach.am,
      einwilligungVermerk: vermerk,
      ...(d.geschlecht !== undefined ? { geschlecht: d.geschlecht || null } : {}),
      // Wie beim Anlegen (app/api/patients/route.ts): Mitternacht UTC des Kalendertags
      ...(d.geburtsdatum ? { birthDate: new Date(`${d.geburtsdatum}T00:00:00Z`) } : {}),
    },
  });
  await auditFromSession(session, "akte.eintrag", { entityType: "Patient", entityId: patient.id, summary: `Kontaktdaten geändert${d.geburtsdatum && d.geburtsdatum !== alt?.birthDate?.toISOString().slice(0, 10) ? ", Geburtsdatum eingetragen oder berichtigt" : ""}, Einwilligung E-Mail ${d.einwilligung ? "erteilt" : "nicht erteilt"}${d.whatsapp !== undefined ? `, WhatsApp ${d.whatsapp ? "erteilt" : "nicht erteilt"}` : ""}${d.nachfassen !== undefined ? `, Erinnerung an Vorschläge ${d.nachfassen ? "erteilt" : "nicht erteilt"}` : ""}` });
  return NextResponse.json({ ok: true });
}
