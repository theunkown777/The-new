import { NextResponse } from "next/server";
import { buildKostenuebersichtPdf } from "@/lib/pdf";
import { kostenuebersicht } from "@/lib/kostenuebersicht";
import { buildProposal, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { leseStammdaten } from "@/lib/praxisStammdaten";
import { isTherapie, istZahnVorschlag, specialty } from "@/lib/specialties";
import { consumeAttempt } from "@/lib/rateLimit";

import { anschluss } from "@/lib/anschluss";
const KOPF = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export const pdfFehler = (error: string, status: number) => NextResponse.json({ error }, { status, headers: KOPF });

/** Begrenzung pro IP für das Erzeugen von PDFs über Patienten-Links (20 je Stunde). */
export async function pdfErlaubt(req: Request): Promise<boolean> {
  const ip = anschluss(req.headers);
  return consumeAttempt(`patient-pdf:${ip}`, 20, 60 * 60 * 1000);
}

/** Kostenübersicht eines Vorschlags als PDF-Antwort (Patienten-Link und Portal teilen sich diese Funktion). */
export async function kostenuebersichtAntwort(p: {
  input: unknown;
  choices: unknown;
  patientChoices: unknown;
  patientResponse: string | null;
  practice: { name: string; proposalPrices: unknown; stammdaten: unknown };
}): Promise<NextResponse> {
  const input = proposalInputSchema.safeParse(p.input);
  if (!input.success) return pdfFehler("Die Kostenübersicht kann gerade nicht erzeugt werden. Bitte fragen Sie in Ihrer Praxis nach.", 422);
  const items = buildProposal(input.data, resolvePrices(p.practice.proposalPrices)).filter((i) => i.options.length > 0);
  const gesendet = p.patientResponse ? choicesSchema.safeParse(p.patientChoices).data ?? null : null;
  const pdf = await buildKostenuebersichtPdf(
    kostenuebersicht({
      praxis: p.practice.name,
      stammdaten: leseStammdaten(p.practice.stammdaten),
      items,
      patient: input.data.patient,
      praxisWahl: choicesSchema.safeParse(p.choices).data ?? {},
      patientWahl: gesendet,
      dental: istZahnVorschlag(input.data.fach),
      therapie: isTherapie(specialty(input.data.fach)),
      fach: input.data.fach,
    }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { ...KOPF, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="kostenuebersicht.pdf"' },
  });
}
