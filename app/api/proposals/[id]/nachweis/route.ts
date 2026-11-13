import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildKosteninfoPdf } from "@/lib/pdf";
import { ABGEWAEHLT, PROPOSAL_STATUS_LABELS, buildProposal, chosenOption, formatEuro, money, resolvePrices, summarize, typeLabelOf } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";

const TZ = "Europe/Berlin";
const zeit = (d: Date) => d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: TZ });

// Nachweis „Kosteninformation“ als PDF für die Karteikarte (auch ohne Unterschrift des Patienten).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const p = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: session.user.practiceId },
    include: { patient: true, practice: { select: { name: true, proposalPrices: true } } },
  });
  if (!p) return NextResponse.json({ error: "Vorschlag nicht gefunden" }, { status: 404 });
  const input = proposalInputSchema.safeParse(p.input);
  const choices = choicesSchema.safeParse(p.choices);
  if (!input.success || !choices.success) return NextResponse.json({ error: "Die gespeicherten Befunddaten sind ungültig." }, { status: 422 });

  const items = buildProposal(input.data, resolvePrices(p.practice.proposalPrices));
  const pat = input.data.patient;
  const wahlPatient = choicesSchema.safeParse(p.agreedChoices ?? p.patientChoices).data ?? null;
  const name = (key: string, id: string) => {
    const it = items.find((x) => x.key === key);
    if (it && id === ABGEWAEHLT) return `${it.where}: ${it.title} nicht gewünscht`;
    const o = it?.options.find((x) => x.id === id);
    return it && o ? `${it.where}: ${o.name}` : null;
  };
  const entschieden = p.status === "ANGENOMMEN";
  const punkte = items
    .filter((it) => it.options.length)
    .map((it) => {
      const praxis = chosenOption(it, choices.data);
      return {
        wo: it.where,
        titel: it.title,
        optionen: it.options.map((o) => ({
          name: o.name,
          art: typeLabelOf(o, pat.insurance),
          eigen: formatEuro(money(o, pat).netto),
          markierung: [
            o.id === it.recommended ? "Empfehlung der Praxis" : "",
            o.id === praxis?.id && (entschieden || choices.data[it.key]) ? (entschieden ? "vereinbart" : "geplant") : "",
            wahlPatient?.[it.key] === o.id ? "vom Patienten gewählt" : "",
          ].filter(Boolean).join(", "),
        })),
      };
    });
  const verlauf = [
    p.shareCreatedAt && { was: "Persönlicher Link für den Patienten erzeugt", wann: zeit(p.shareCreatedAt) },
    p.patientViewedAt && { was: "Vom Patienten geöffnet", wann: zeit(p.patientViewedAt) },
    p.patientRespondedAt && { was: p.patientResponse === "RUECKRUF" ? "Patient bittet um Rückruf" : "Rückmeldung des Patienten mit Auswahl", wann: zeit(p.patientRespondedAt) },
    p.agreedAt && { was: "Einverständnis digital unterschrieben", wann: zeit(p.agreedAt) },
  ].filter((x): x is { was: string; wann: string } => !!x);

  const pdf = await buildKosteninfoPdf({
    practiceName: p.practice.name,
    patientName: `${p.patient.firstName} ${p.patient.lastName}`,
    patientBirthDate: p.patient.birthDate ? p.patient.birthDate.toLocaleDateString("de-DE", { timeZone: TZ }) : null,
    proposalDate: p.createdAt.toLocaleDateString("de-DE", { timeZone: TZ }),
    status: PROPOSAL_STATUS_LABELS[p.status] ?? p.status,
    punkte,
    summe: formatEuro(summarize(items, choices.data, pat).netto),
    summeHinweis: entschieden ? "Eigenanteil der vereinbarten Versorgung" : "Eigenanteil nach Planung bzw. Empfehlung der Praxis",
    verlauf,
    patientWahl: wahlPatient ? Object.entries(wahlPatient).map(([k, v]) => name(k, v)).filter(Boolean).join(" · ") || null : null,
    patientNotiz: p.patientNote,
    signed: p.agreedAt
      ? {
          at: zeit(p.agreedAt),
          name: p.agreedName ?? "",
          text: p.agreedText ?? "",
          png: p.agreedSignature?.startsWith("data:image/png;base64,") ? Buffer.from(p.agreedSignature.split(",")[1], "base64") : null,
        }
      : null,
    erstelltAm: zeit(new Date()),
    erstelltVon: session.user.name ?? "Praxis",
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="kosteninformation-${p.patient.lastName.replace(/[^\p{L}\d-]/gu, "")}-${p.id.slice(0, 6)}.pdf"`, "Cache-Control": "no-store" },
  });
}
