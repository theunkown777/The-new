import { NextResponse } from "next/server";
import { patientInPractice } from "@/lib/patientScope";
import { loadBriefing } from "@/lib/briefingLoad";
import { briefingAsText } from "@/lib/akte";
import { generateBriefingSummary, kiFehlerGrund, kiVerfuegbar } from "@/lib/anthropic";
import { auditFromSession } from "@/lib/audit";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { kiLimit } from "@/lib/demoGuard";

// KI-Kurzfassung des Überblicks. Grundlage ist der regelbasierte Überblick
// ohne Namen; das Ergebnis ist ein Entwurf und wird nicht gespeichert.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  if (!kiVerfuegbar()) {
    return NextResponse.json({ error: "Für die KI-Kurzfassung ist kein KI-Zugang hinterlegt. Der Überblick oben ist vollständig und regelbasiert." }, { status: 503 });
  }
  const key = `briefing:${session.user.id}`;
  if (await isRateLimited(key, 60, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut." }, { status: 429 });
  await recordAttempt(key, 60 * 60 * 1000);
  // Zusätzlich je Praxis: Viele Konten (oder ein Gastzugang) sollen die Kosten nicht treiben.
  const zuViele = await kiLimit(session.user.practiceId, "briefing");
  if (zuViele) return zuViele;
  const b = await loadBriefing(session.user.practiceId, patient.id);
  if (!b) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  try {
    const text = await generateBriefingSummary(briefingAsText(b), patient);
    await auditFromSession(session, "ueberblick.ki", { entityType: "Patient", entityId: patient.id });
    return NextResponse.json({ text });
  } catch (e) {
    console.error("KI-Überblick fehlgeschlagen", e);
    return NextResponse.json({ error: `KI-Kurzfassung nicht möglich: ${kiFehlerGrund(e)}` }, { status: 502 });
  }
}
