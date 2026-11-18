import { NextResponse } from "next/server";
import { authenticateAndRateLimitApiRequest } from "@/lib/apiAuth";
import { generateReportText } from "@/lib/anthropic";
import { buildServiceSummary } from "@/lib/serviceSummary";
import { berichtFachFuerApi, generateReportSchema } from "@/lib/berichtApi";

// KI-Berichtsgenerierung als Service: der Partner liefert bereits geprüfte
// (z. B. über /api/v1/validate freigegebene), strukturierte Leistungsdaten
// - Patienten-/Behandlungsdaten werden ausschließlich für diesen einen
// Aufruf verwendet und nicht gespeichert.
export async function POST(req: Request) {
  const auth = await authenticateAndRateLimitApiRequest(req);
  if (!auth.client) {
    return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { reportType, practiceName, authorName, fach, patient, treatmentDate, entries, additionalContext } =
    parsed.data;

  const serviceSummary = buildServiceSummary(
    entries.map((e) => ({
      performed: e.performed,
      toothNumbers: e.toothNumbers ?? null,
      quantity: e.quantity,
      note: e.note ?? null,
      catalogItem: { system: e.system, code: e.code, title: e.title },
    }))
  );

  try {
    const text = await generateReportText({
      reportType,
      practiceName,
      authorName,
      // Ohne Angabe das Fach des Schlüssels, dann die Verzeichnisse der Einträge, sonst neutral (lib/berichtApi.ts).
      fach: berichtFachFuerApi(fach, auth.client.fach, entries),
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate ?? null,
        insuranceName: patient.insuranceName ?? null,
        insuranceNumber: patient.insuranceNumber ?? null,
      },
      treatmentDate: treatmentDate ?? null,
      serviceSummary,
      additionalContext: additionalContext || null,
    });

    return NextResponse.json({ text, serviceSummary });
  } catch (err) {
    console.error("Fehler bei der API-Berichtsgenerierung:", err);
    return NextResponse.json(
      { error: "Der Bericht konnte nicht generiert werden. Bitte versuchen Sie es erneut." },
      { status: 502 }
    );
  }
}
