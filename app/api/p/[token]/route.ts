import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { patientResponseSchema } from "@/lib/patientLink";
import { eingangMelden } from "@/lib/eingang";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { ABGEWAEHLT, buildProposal, chosenOption, resolvePrices } from "@/lib/proposals";

// Rückmeldung des Patienten über den Patienten-Link (öffentlich, ohne Login).
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `patient-link:${ip}`;
  if (await isRateLimited(key, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, 60 * 60 * 1000);

  const proposal = await prisma.treatmentProposal.findUnique({
    where: { shareTokenHash: hashToken(params.token) },
    select: { id: true, shareExpiresAt: true, status: true, practiceId: true, patientId: true, choices: true, input: true, practice: { select: { proposalPrices: true } } },
  });
  if (!proposal || !proposal.shareExpiresAt || proposal.shareExpiresAt < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  }

  const parsed = patientResponseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });

  await prisma.treatmentProposal.update({
    where: { id: proposal.id },
    data: {
      patientResponse: parsed.data.response,
      patientChoices: parsed.data.choices,
      patientNote: parsed.data.note || null,
      patientRespondedAt: new Date(),
      patientWantsInstallments: parsed.data.wantsInstallments,
    },
  });
  // Nur Hinweise ohne Gesundheitsangaben (siehe lib/eingang.ts): ob eine eigene Wahl, eine Nachricht oder ein Ratenwunsch dabei ist.
  const praxisWahl = choicesSchema.safeParse(proposal.choices).data ?? {};
  const inp = proposalInputSchema.safeParse(proposal.input);
  const items = inp.success ? buildProposal(inp.data, resolvePrices(proposal.practice.proposalPrices)) : [];
  const eigeneWahl = Object.entries(parsed.data.choices ?? {}).some(([k, v]) => {
    const it = items.find((x) => x.key === k);
    return it ? (chosenOption(it, praxisWahl)?.id ?? ABGEWAEHLT) !== v : false;
  });
  const hinweis = [
    eigeneWahl ? "hat anders gewählt als geplant" : Object.keys(parsed.data.choices ?? {}).length ? "Wahl wie geplant" : null,
    parsed.data.note ? "mit Nachricht" : null,
    parsed.data.wantsInstallments ? "möchte in Raten zahlen" : null,
  ].filter(Boolean).join(" · ");
  await eingangMelden({ practiceId: proposal.practiceId, patientId: proposal.patientId, art: parsed.data.response === "RUECKRUF" ? "VORSCHLAG_RUECKRUF" : "VORSCHLAG_INTERESSE", entityId: proposal.id, hinweis: hinweis || null });
  return NextResponse.json({ ok: true });
}
