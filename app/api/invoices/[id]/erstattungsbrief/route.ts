import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRecht } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { consumeAttempt } from "@/lib/rateLimit";
import { buildErstattungsbriefPdf } from "@/lib/pdf";
import { briefOrdnungFuer } from "@/lib/abrechnungsarten";
import { briefDateiname, briefMoeglich, briefSchema, briefText } from "@/lib/erstattungsbrief";

export const dynamic = "force-dynamic";

// Begleitbrief für die private Versicherung bei gekürzter Erstattung: erzeugt ein
// PDF im Namen des Patienten. Nichts wird gespeichert oder verschickt; die Praxis
// gibt das PDF mit. Feste Textbausteine, keine KI (lib/erstattungsbrief.ts).
const BRIEFE_PRO_STUNDE = 60;
const tag = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, error } = await requireRecht("zahlungen");
  if (!session) return error;
  const practiceId = session.user.practiceId;

  if (!(await consumeAttempt(`erstattungsbrief:${session.user.id}`, BRIEFE_PRO_STUNDE, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Zu viele Briefe in dieser Stunde. Bitte später erneut versuchen." }, { status: 429 });
  }

  const parsed = briefSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, practiceId },
    select: { id: true, number: true, createdAt: true, status: true, practice: { select: { name: true, specialty: true } }, patient: { select: { firstName: true, lastName: true, insuranceType: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  if (invoice.status === "STORNIERT") return NextResponse.json({ error: "Die Rechnung ist storniert." }, { status: 409 });
  if (!briefMoeglich(invoice.patient.insuranceType)) {
    return NextResponse.json({ error: "Den Begleitbrief gibt es für Rechnungen an privat Versicherte. Bitte prüfen Sie die Versicherungsart in den Stammdaten." }, { status: 409 });
  }

  // Den Brief gibt es nur, wo das Fach nach GOÄ oder GOZ abrechnet; die GOZ nur in der Zahnmedizin.
  const ordnung = briefOrdnungFuer(invoice.practice.specialty);
  if (!ordnung) return NextResponse.json({ error: "Den Begleitbrief gibt es nur für Rechnungen nach GOÄ oder GOZ." }, { status: 409 });
  if (parsed.data.gebuehrenordnung === "GOZ" && ordnung !== "GOZ") return NextResponse.json({ error: "Die GOZ gilt nur für zahnärztliche Rechnungen." }, { status: 400 });

  const brief = briefText(parsed.data, {
    patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
    practiceName: invoice.practice.name,
    rechnungNummer: invoice.number,
    rechnungDatum: tag(invoice.createdAt),
    heute: tag(new Date()),
  });
  const pdf = await buildErstattungsbriefPdf(brief);

  // Protokoll ohne Namen und ohne Inhalt des Briefs.
  await auditFromSession(session, "rechnung.brief", { entityType: "Rechnung", entityId: invoice.id, summary: `${parsed.data.posten.length} Posten` });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${briefDateiname(invoice.number)}"`,
      "Cache-Control": "no-store",
    },
  });
}
