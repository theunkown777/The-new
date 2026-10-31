import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICES, buildProposal, type FindingCode, type ProposalInput } from "@/lib/proposals";
import { computeProposal } from "@/lib/proposalSchema";
import { QUESTIONS, WISHES } from "@/lib/anamnesis";
import { specialty } from "@/lib/specialties";
import { ageOn, generatePatients, rng } from "@/lib/demoData";

// Füllt eine Demo-Praxis mit rund 1000 erfundenen Patienten und dem, was in
// einer echten Praxis über einige Monate entsteht: Vorschläge in allen
// Stadien, Patienten-Links mit Rückmeldungen, Anamnesebögen und (Zahnmedizin)
// Berichte. Alles in wenigen Sammelabfragen, damit der Gastzugang schnell bleibt.

export const DEMO_PATIENT_COUNT = 1000;
const DAY = 24 * 60 * 60 * 1000;

const DENTAL_FINDINGS: [FindingCode, number][] = [
  ["karies_klein", 0.32],
  ["karies_gross", 0.2],
  ["fuellung_defekt", 0.15],
  ["fehlt", 0.12],
  ["zerstoert", 0.11],
  ["wurzel", 0.07],
  ["fissur", 0.03],
];
const TEETH = [16, 17, 26, 27, 36, 37, 46, 47, 15, 25, 35, 45, 14, 24, 34, 44, 11, 21];

function weighted<T>(r: () => number, list: [T, number][]): T {
  let x = r() * list.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of list) if ((x -= w) <= 0) return v;
  return list[0][0];
}

export async function seedBulkDemo(args: {
  practiceId: string;
  practiceName: string;
  authorId: string;
  fach: string;
  existing: number;
  now: Date;
}) {
  const { practiceId, practiceName, authorId, fach, now } = args;
  const dental = fach === "zahn";
  const seed = parseInt(crypto.randomBytes(4).toString("hex"), 16);
  const r = rng(seed);
  const rows = generatePatients(DEMO_PATIENT_COUNT - args.existing, fach, seed, now);

  const patients = await prisma.patient.createManyAndReturn({
    data: rows.map((p) => ({
      practiceId,
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      insuranceType: p.insuranceType,
      insuranceName: p.insuranceName,
      notes: "Beispielpatient im Gastzugang (erfundene Daten)",
      createdAt: new Date(now.getTime() - Math.floor(r() * 3 * 365) * DAY),
    })),
    select: { id: true, firstName: true, lastName: true, birthDate: true, insuranceType: true },
  });

  // Behandlungsvorschläge für etwa 12 % der Patienten, über 150 Tage verteilt.
  const spec = specialty(fach);
  const anlaesse = spec ? spec.anlaesse.filter((a) => !a.nurAufWunsch || fach === "aesthetik").map((a) => a.id) : [];
  const proposals: Prisma.TreatmentProposalCreateManyInput[] = [];
  const shuffled = [...patients].sort(() => r() - 0.5);
  for (const p of shuffled.slice(0, Math.round(patients.length * 0.12))) {
    const age = ageOn(p.birthDate!, now);
    const insurance = (p.insuranceType === "PKV" ? "PKV" : "GKV") as "GKV" | "PKV";
    const factors = { age, insurance, bonusYears: weighted(r, [[0, 0.3], [5, 0.25], [10, 0.45]]) as 0 | 5 | 10, haertefall: r() < 0.04, erstattungProzent: insurance === "PKV" ? 80 : r() < 0.3 ? 50 : 0 };
    let input: ProposalInput;
    if (dental) {
      const teeth: Record<string, FindingCode> = {};
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) teeth[String(TEETH[Math.floor(r() * TEETH.length)])] = weighted(r, DENTAL_FINDINGS);
      input = { teeth, globals: { zahnstein: r() < 0.4, psi: r() < 0.1, bruxismus: r() < 0.08, raucher: r() < 0.15 }, patient: factors };
    } else if (anlaesse.length) {
      const pickA = [...anlaesse].sort(() => r() - 0.5).slice(0, r() < 0.7 ? 1 : 2);
      input = { teeth: {}, globals: {}, patient: { ...factors, bonusYears: 0, haertefall: false }, fach, anlaesse: pickA, med: { prices: {}, custom: [] } };
    } else continue;

    const items = buildProposal(input, DEFAULT_PRICES).filter((i) => i.options.length);
    if (!items.length) continue;
    const daysAgo = Math.floor(r() * 150);
    const createdAt = new Date(now.getTime() - daysAgo * DAY - Math.floor(r() * 8) * 3600 * 1000);
    // Ältere Vorschläge sind meist entschieden, neue noch offen.
    const status =
      daysAgo < 7
        ? weighted(r, [["ENTWURF", 0.55], ["BESPROCHEN", 0.45]])
        : daysAgo < 30
          ? weighted(r, [["BESPROCHEN", 0.4], ["ANGENOMMEN", 0.35], ["ABGELEHNT", 0.25]])
          : weighted(r, [["ANGENOMMEN", 0.55], ["ABGELEHNT", 0.4], ["BESPROCHEN", 0.05]]);
    const upgrade = status === "ANGENOMMEN" ? r() < 0.7 : r() < 0.4;
    const choices = Object.fromEntries(
      items.map((it) => {
        const alt = it.options.filter((o) => o.type !== "kasse" && o.type !== "regel");
        return [it.key, upgrade && alt.length ? alt[Math.floor(r() * alt.length)].id : it.options[0].id];
      }),
    );
    const computed = computeProposal({ input, choices, prices: DEFAULT_PRICES, patientName: `${p.firstName} ${p.lastName}`, practiceName, date: createdAt });

    const linked = r() < 0.55;
    const viewed = linked && r() < 0.8;
    const responded = viewed && (status !== "ENTWURF" ? r() < 0.55 : r() < 0.3);
    const shareCreatedAt = new Date(createdAt.getTime() + 3600 * 1000);
    const respondedAt = new Date(shareCreatedAt.getTime() + Math.floor(24 + r() * 96) * 3600 * 1000);
    proposals.push({
      practiceId,
      patientId: p.id,
      authorId,
      status,
      input: input as unknown as Prisma.InputJsonValue,
      createdAt,
      updatedAt: createdAt,
      ...computed,
      ...(linked && {
        shareTokenHash: crypto.randomBytes(32).toString("hex"),
        shareExpiresAt: new Date(shareCreatedAt.getTime() + 30 * DAY),
        shareCreatedAt,
        patientViewedAt: viewed ? new Date(shareCreatedAt.getTime() + Math.floor(r() * 72) * 3600 * 1000) : null,
        ...(responded && {
          patientResponse: r() < 0.6 ? "INTERESSE" : "RUECKRUF",
          patientChoices: computed.choices,
          patientRespondedAt: respondedAt,
          updatedAt: respondedAt < now ? respondedAt : now,
          patientWantsInstallments: r() < 0.15,
          patientNote: r() < 0.3 ? weighted(r, [["Am besten nachmittags erreichbar.", 1], ["Ist eine Ratenzahlung möglich?", 1], ["Was zahlt meine Kasse davon?", 1], ["Kann ich erst nach dem Urlaub?", 1]]) : null,
        }),
      }),
    });
  }
  if (proposals.length) await prisma.treatmentProposal.createMany({ data: proposals });

  // Digitale Anamnese bei etwa 15 % der Patienten.
  const forms: Prisma.AnamnesisFormCreateManyInput[] = shuffled.slice(0, Math.round(patients.length * 0.15)).map((p) => {
    const submittedAt = new Date(now.getTime() - Math.floor(r() * 200) * DAY);
    const q = Object.fromEntries(
      QUESTIONS.filter((x) => dental || !x.dentalOnly).map((x) => {
        const yes = r() < (x.key === "medikamente" ? 0.45 : x.key === "rauchen" ? 0.18 : x.key === "blutdruck" ? 0.22 : 0.06);
        return [x.key, { yes, detail: yes && x.detail ? weighted(r, [["laut Medikamentenplan", 1], ["ASS 100", 1], ["Penicillin", 1], ["L-Thyroxin", 1]]) : undefined }];
      }),
    );
    return {
      practiceId,
      patientId: p.id,
      expiresAt: submittedAt,
      viewedAt: new Date(submittedAt.getTime() - 3600 * 1000),
      submittedAt,
      answers: { q, wishes: r() < 0.1 ? [WISHES[Math.floor(r() * WISHES.length)].key] : [], confirmName: `${p.firstName} ${p.lastName}` } as Prisma.InputJsonValue,
    };
  });
  if (forms.length) await prisma.anamnesisForm.createMany({ data: forms });

  // Zahnmedizin: Berichte der letzten Wochen (die App-Berichte sind zahnärztlich).
  if (dental) {
    const reports: Prisma.ReportCreateManyInput[] = shuffled.slice(0, 80).map((p) => {
      const treatmentDate = new Date(now.getTime() - Math.floor(r() * 90) * DAY);
      const anlass = weighted(r, [["Kontrolluntersuchung", 0.5], ["Füllungstherapie", 0.25], ["Professionelle Zahnreinigung", 0.15], ["Schmerzbehandlung", 0.1]]);
      return {
        practiceId,
        patientId: p.id,
        authorId,
        type: r() < 0.85 ? "BEFUND" : "KRANKENKASSE",
        status: r() < 0.8 ? "FINAL" : "ENTWURF",
        treatmentDate,
        createdAt: treatmentDate,
        serviceSummary: anlass,
        reviewConfirmed: true,
        generatedText: `Befund- und Behandlungsbericht\n\nPatient/in: ${p.firstName} ${p.lastName}\nBehandlung: ${anlass}\n\nBeispielbericht im Gastzugang mit erfundenen Daten.`,
      };
    });
    await prisma.report.createMany({ data: reports });
  }
  return { patients: patients.length, proposals: proposals.length, anamnesis: forms.length };
}
