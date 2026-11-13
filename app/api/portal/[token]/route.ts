import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isValidIban, normalizeIban } from "@/lib/invoices";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { eingangMelden } from "@/lib/eingang";
import { pruefLage, pruefungNoetigAntwort } from "@/lib/portalPruefungServer";

const schema = z.object({
  invoiceId: z.string().min(1).max(40),
  action: z.enum(["gezahlt", "raten", "lastschrift"]),
  iban: z.string().max(40).optional(),
  name: z.string().trim().max(70).optional(),
  zustimmung: z.boolean().optional(),
});

const rechnungHinweis = async (id: string) => {
  const r = await prisma.invoice.findUnique({ where: { id }, select: { number: true } });
  return r ? `Rechnung ${r.number}` : null;
};

// Patientenportal (öffentlich, ohne Login): Zahlung melden oder Ratenzahlung anfragen.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `portal:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, 60 * 60 * 1000);

  const patient = await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(params.token) },
    select: { id: true, practiceId: true, portalExpiresAt: true, birthDate: true },
  });
  if (!patient || !patient.portalExpiresAt || patient.portalExpiresAt < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });

  if (parsed.data.action === "lastschrift") {
    // Einzel-Lastschriftmandat: nur mit gültiger IBAN, Namen und ausdrücklicher Zustimmung zum Mandatstext.
    // Und nur nach bestätigtem Geburtsdatum (S5): Ein Mandat bewegt Geld von einem frei eingetippten Konto,
    // deshalb gibt es hier, anders als bei der Unterschrift, keinen Weg ohne Prüfung. Hat die Praxis kein
    // Geburtsdatum hinterlegt, bleiben Überweisung und Online-Zahlung.
    const pruefung = pruefLage(params.token, patient);
    if (pruefung.status === "ohne") return NextResponse.json({ error: "Lastschrift ist hier erst möglich, wenn Ihre Praxis Ihr Geburtsdatum hinterlegt hat. Bitte überweisen Sie den Betrag oder sprechen Sie Ihre Praxis an.", code: "OHNE_GEBURTSDATUM" }, { status: 409 });
    if (pruefung.status === "noetig") return pruefungNoetigAntwort();
    const iban = normalizeIban(parsed.data.iban ?? "");
    if (!isValidIban(iban)) return NextResponse.json({ error: "Die IBAN ist ungültig." }, { status: 400 });
    if (!parsed.data.name || parsed.data.name.length < 2) return NextResponse.json({ error: "Bitte den Namen des Kontoinhabers angeben." }, { status: 400 });
    if (!parsed.data.zustimmung) return NextResponse.json({ error: "Bitte dem Lastschriftmandat zustimmen." }, { status: 400 });
    const r = await prisma.invoice.updateMany({
      where: { id: parsed.data.invoiceId, patientId: patient.id, status: "OFFEN", sepaExportedAt: null, practice: { glaeubigerId: { not: null } } },
      data: { sepaIban: iban, sepaName: parsed.data.name, sepaMandatAt: new Date(), sepaGeprueftAt: pruefung.geprueftAt },
    });
    if (r.count === 0) return NextResponse.json({ error: "Lastschrift für diese Rechnung nicht möglich." }, { status: 409 });
    await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: "LASTSCHRIFT", entityId: parsed.data.invoiceId, hinweis: await rechnungHinweis(parsed.data.invoiceId) });
    return NextResponse.json({ ok: true });
  }

  const res = await prisma.invoice.updateMany({
    where: { id: parsed.data.invoiceId, patientId: patient.id, status: { in: ["OFFEN", "GEMELDET"] } },
    data: parsed.data.action === "gezahlt" ? { status: "GEMELDET", reportedPaidAt: new Date() } : { wantsInstallments: true },
  });
  if (res.count === 0) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  await eingangMelden({ practiceId: patient.practiceId, patientId: patient.id, art: parsed.data.action === "gezahlt" ? "ZAHLUNG_GEMELDET" : "RATEN", entityId: parsed.data.invoiceId, hinweis: await rechnungHinweis(parsed.data.invoiceId) });
  return NextResponse.json({ ok: true });
}
