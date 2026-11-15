import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { agreementSchema } from "@/lib/agreement";
import { agreementContext } from "@/lib/agreementContext";
import { offeneEinverstaendnisseWhere, uebergabeFuer } from "@/lib/empfangServer";
import { eingangMelden } from "@/lib/eingang";

// Einverständnis am Empfangs-Tablet unterschreiben. Zugang nur mit gültigem Übergabe-Token für genau
// diesen Patienten und den Schritt „Unterschrift“. Die Geburtsdatum-Prüfung des Patientenportals entfällt:
// Die Person steht in der Praxis und hat das Tablet vom Empfang bekommen. agreedGeprueftAt bleibt deshalb
// leer; der Eingang nennt den Weg („am Empfangs-Tablet“).
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const a = await uebergabeFuer("unterschrift");
  if (!a) return NextResponse.json({ error: "Die Zeit am Tablet ist abgelaufen. Bitte geben Sie das Tablet am Empfang zurück." }, { status: 401 });
  if (!(await consumeAttempt(`empfang-patient:${a.patient.id}`, 30, 3600e3))) return NextResponse.json({ error: "Zu viele Anfragen. Bitte wenden Sie sich an den Empfang." }, { status: 429 });
  const parsed = agreementSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });

  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: a.patient.practiceId, ...offeneEinverstaendnisseWhere(a.patient.id) },
    select: { id: true, status: true, createdAt: true, input: true, choices: true, patientChoices: true, patientResponse: true, practice: { select: { name: true, proposalPrices: true } } },
  });
  const ctx = proposal && agreementContext(proposal);
  if (!proposal || !ctx) return NextResponse.json({ error: "Dieser Vorschlag kann nicht mehr bestätigt werden." }, { status: 404 });
  const now = new Date();
  const r = await prisma.treatmentProposal.updateMany({
    where: { id: proposal.id, practiceId: a.patient.practiceId, patientId: a.patient.id, agreedAt: null },
    data: {
      agreedAt: now, agreedName: parsed.data.name, agreedSignature: parsed.data.signature, agreedChoices: ctx.choices, agreedText: ctx.text, agreedGeprueftAt: null,
      ...(proposal.patientResponse ? {} : { patientResponse: "INTERESSE", patientRespondedAt: now }),
    },
  });
  if (r.count === 0) return NextResponse.json({ error: "Dieser Vorschlag kann nicht mehr bestätigt werden." }, { status: 404 });
  await eingangMelden({ practiceId: a.patient.practiceId, patientId: a.patient.id, art: "VEREINBARUNG", entityId: proposal.id, hinweis: "am Empfangs-Tablet in der Praxis unterschrieben" });
  return NextResponse.json({ ok: true });
}
