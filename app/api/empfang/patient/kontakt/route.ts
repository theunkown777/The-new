import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { kontaktSchema } from "@/lib/kontakt";
import { uebergabeFuer } from "@/lib/empfangServer";
import { audit } from "@/lib/audit";

const schema = kontaktSchema.pick({ email: true, phone: true, einwilligung: true, whatsapp: true }).strict();

// Kontaktdaten am Empfangs-Tablet prüfen und berichtigen. Der Patient ändert nur die eigene
// E-Mail-Adresse und Mobilnummer und seine Einwilligungen in Nachrichten; sonst nichts.
export async function POST(req: Request) {
  const a = await uebergabeFuer("kontakt");
  if (!a) return NextResponse.json({ error: "Die Zeit am Tablet ist abgelaufen. Bitte geben Sie das Tablet am Empfang zurück." }, { status: 401 });
  if (!(await consumeAttempt(`empfang-patient:${a.patient.id}`, 30, 3600e3))) return NextResponse.json({ error: "Zu viele Anfragen. Bitte wenden Sie sich an den Empfang." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  const d = parsed.data;
  const email = d.email || null, phone = d.phone || null;
  await prisma.patient.updateMany({
    where: { id: a.patient.id, practiceId: a.patient.practiceId },
    data: {
      email, phone,
      // Einwilligung nur mit passender Angabe; der Zeitpunkt bleibt, solange sie besteht.
      ...(d.einwilligung !== undefined ? { contactConsentAt: d.einwilligung && email ? a.patient.contactConsentAt ?? new Date() : null } : {}),
      ...(d.whatsapp !== undefined ? { whatsappConsentAt: d.whatsapp && phone ? a.patient.whatsappConsentAt ?? new Date() : null } : {}),
    },
  });
  await audit({ practiceId: a.patient.practiceId, userName: "Patient am Empfangs-Tablet", action: "akte.eintrag", entityType: "Patient", entityId: a.patient.id, summary: "Kontaktdaten am Empfangs-Tablet geprüft" });
  return NextResponse.json({ ok: true });
}
