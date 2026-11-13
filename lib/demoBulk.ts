import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { demoKennzahlen, demoStamm, demoVorschlaege } from "@/lib/demoKennzahlen";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICES, buildProposal, type FindingCode, type ProposalInput } from "@/lib/proposals";
import { computeProposal } from "@/lib/proposalSchema";
import { QUESTIONS, WISHES } from "@/lib/anamnesis";
import { specialty } from "@/lib/specialties";
import { ageOn, generatePatients, rng } from "@/lib/demoData";
import { fachprofil, passtZuPerson, termineFuer } from "@/lib/fachprofile";
import { befundmodell } from "@/lib/befundmodelle";
import { heuteTag, tagesGrenzen } from "@/lib/termine";

// Füllt eine Demo-Praxis mit 30 bis 80 erfundenen Patienten und dem, was in
// einer echten Praxis über einige Monate entsteht: Vorschläge in allen
// Stadien, Patienten-Links mit Rückmeldungen, Anamnesebögen und (Zahnmedizin)
// Berichte. Alles in wenigen Sammelabfragen, damit der Gastzugang schnell bleibt.

/** Größe des Demo-Stamms hängt vom Fach ab (lib/demoKennzahlen.ts). */
export const demoPatientCount = (fach: string) => demoStamm(fach);
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
  const kz = demoKennzahlen(fach);
  const rows = generatePatients(Math.max(0, demoStamm(fach) - args.existing), fach, seed, now);

  const reportDates: { patientId: string; at: Date }[] = [];
  const patients = await prisma.patient.createManyAndReturn({
    data: rows.map((p) => ({
      practiceId,
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      insuranceType: p.insuranceType,
      insuranceName: p.insuranceName,
      geschlecht: p.sex,
      notes: `Beispiel (${fachprofil(fach).person.sg}) im Gastzugang, erfundene Daten`,
      createdAt: new Date(now.getTime() - Math.floor(r() * 3 * 365) * DAY),
    })),
    select: { id: true, firstName: true, lastName: true, birthDate: true, insuranceType: true, geschlecht: true },
  });

  // Behandlungsvorschläge für einen Teil der Patienten (siehe demoVorschlaege), über 75 Tage verteilt, damit auch die kleine Demo auf jeder Station Patienten hat.
  const spec = specialty(fach);
  const anlaesseAlle = spec ? spec.anlaesse.filter((a) => !a.nurAufWunsch || fach === "aesthetik") : [];
  const proposals: Prisma.TreatmentProposalCreateManyInput[] = [];
  const shuffled = [...patients].sort(() => r() - 0.5);
  for (const p of shuffled.slice(0, demoVorschlaege(fach, patients.length + args.existing))) {
    const age = ageOn(p.birthDate!, now);
    const insurance = (p.insuranceType === "PKV" ? "PKV" : "GKV") as "GKV" | "PKV";
    const factors = { age, insurance, bonusYears: weighted(r, [[0, 0.3], [5, 0.25], [10, 0.45]]) as 0 | 5 | 10, haertefall: r() < 0.04, erstattungProzent: insurance === "PKV" ? 80 : r() < 0.3 ? 50 : 0 };
    let input: ProposalInput;
    if (dental) {
      const teeth: Record<string, FindingCode> = {};
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) teeth[String(TEETH[Math.floor(r() * TEETH.length)])] = weighted(r, DENTAL_FINDINGS);
      input = { teeth, globals: { zahnstein: r() < 0.4, psi: r() < 0.1, bruxismus: r() < 0.08, raucher: r() < 0.15 }, patient: factors };
    } else if (anlaesseAlle.some((a) => passtZuPerson(a, { geschlecht: p.geschlecht, alter: age }))) {
      // Nur Anlässe, die zu Geschlecht und Alter passen (keine Prostata-Vorsorge für Frauen)
      const anlaesse = anlaesseAlle.filter((a) => passtZuPerson(a, { geschlecht: p.geschlecht, alter: age })).map((a) => a.id);
      const pickA = [...anlaesse].sort(() => r() - 0.5).slice(0, r() < 0.7 ? 1 : 2);
      input = { teeth: {}, globals: {}, patient: { ...factors, bonusYears: 0, haertefall: false }, fach, anlaesse: pickA, med: { prices: {}, custom: [] } };
    } else continue;

    const items = buildProposal(input, DEFAULT_PRICES).filter((i) => i.options.length);
    if (!items.length) continue;
    const daysAgo = Math.floor(r() * 75);
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
    const respondedRoh = new Date(shareCreatedAt.getTime() + Math.floor(24 + r() * 96) * 3600 * 1000);
    const respondedAt = respondedRoh < now ? respondedRoh : new Date(now.getTime() - Math.floor(1 + r() * 20) * 3600 * 1000);
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
  const createdProposals = proposals.length
    ? await prisma.treatmentProposal.createManyAndReturn({ data: proposals, select: { id: true, patientId: true, status: true, eigenanteilCent: true, updatedAt: true } })
    : [];

  // Rechnungen für die meisten angenommenen Vorschläge mit Eigenanteil:
  // überwiegend bezahlt, einige offen, gemeldet oder überfällig.
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const year = now.getFullYear();
  for (const p of createdProposals.filter((x) => x.status === "ANGENOMMEN" && x.eigenanteilCent > 0).sort((a, b) => +a.updatedAt - +b.updatedAt)) {
    if (r() > 0.85) continue;
    const createdAt = new Date(p.updatedAt.getTime() + DAY);
    if (createdAt > now) continue;
    const dueDate = new Date(createdAt.getTime() + 14 * DAY);
    const age = (now.getTime() - createdAt.getTime()) / DAY;
    // Überfällig nur bis etwa sechs Wochen; ältere Rechnungen sind erledigt.
    const status =
      age < 14
        ? weighted(r, [["OFFEN", 0.6], ["GEMELDET", 0.15], ["BEZAHLT", 0.25]])
        : age < 45
          ? weighted(r, [["BEZAHLT", 0.75], ["OFFEN", 0.25]])
          : weighted(r, [["BEZAHLT", 0.96], ["STORNIERT", 0.04]]);
    invoices.push({
      practiceId,
      patientId: p.patientId,
      proposalId: p.id,
      number: `${year}-${String(invoices.length + 1).padStart(4, "0")}`,
      title: dental ? "Eigenanteil Zahnbehandlung" : spec && spec.beruf === "therapie" ? "Selbstzahlerleistung" : "Privatleistung",
      amountCent: p.eigenanteilCent,
      dueDate,
      status,
      createdAt,
      wantsInstallments: status === "OFFEN" && p.eigenanteilCent > 50000 && r() < 0.4,
      ...(status === "GEMELDET" && { reportedPaidAt: new Date(Math.min(now.getTime(), createdAt.getTime() + 3 * DAY)) }),
      ...(status === "BEZAHLT" && { paidAt: new Date(Math.min(now.getTime(), createdAt.getTime() + Math.floor(2 + r() * 16) * DAY)) }),
    });
  }
  if (invoices.length) await prisma.invoice.createMany({ data: invoices });

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
    reportDates.push(...reports.map((x) => ({ patientId: x.patientId, at: new Date(x.treatmentDate as Date) })));
  }
  await seedTermineUndAkte({ practiceId, patients, dental, r, now, reportDates, fach });
  return { patients: patients.length, proposals: proposals.length, anamnesis: forms.length, invoices: invoices.length };
}

// Standorte, Termine und Akteneinträge, damit Tagesplan, Auslastung,
// Abrechnungsprüfung und Überblick vor dem Termin in der Demo etwas zeigen.
async function seedTermineUndAkte(a: {
  fach: string;
  practiceId: string;
  patients: { id: string; geschlecht: string | null; birthDate: Date | null }[];
  dental: boolean;
  r: () => number;
  now: Date;
  reportDates: { patientId: string; at: Date }[];
}) {
  const { practiceId, patients, dental, r, now } = a;
  // Standorte, Terminzahl und -dauer je Fach (lib/demoKennzahlen.ts)
  const kz = demoKennzahlen(a.fach);
  const orte = await prisma.location.createManyAndReturn({
    data: kz.standorte.map((s) => ({ practiceId, ...s })),
    select: { id: true, rooms: true, minutesPerDay: true },
  });
  const haupt = orte[0];
  const zweig = orte[1] ?? orte[0];
  const zweigAnteil = orte[1] ? (orte[1].rooms * orte[1].minutesPerDay) / orte.reduce((x, o) => x + o.rooms * o.minutesPerDay, 0) : 0;
  const dauer = () => kz.dauer[Math.floor(r() * kz.dauer.length)];
  const proTag = () => kz.termine[0] + Math.floor(r() * (kz.termine[1] - kz.termine[0] + 1));
  const tagesMinuten = haupt.minutesPerDay;
  const byId = new Map(patients.map((p) => [p.id, p]));
  const pick = () => patients[Math.floor(r() * patients.length)].id;
  // Terminanlass passend zu Fach, Geschlecht und Alter des jeweiligen Patienten
  const grund = (patientId: string) => {
    const p = byId.get(patientId)!;
    const liste = termineFuer(a.fach, { geschlecht: p.geschlecht, alter: p.birthDate ? ageOn(p.birthDate, now) : null });
    return liste[Math.floor(r() * liste.length)] ?? fachprofil(a.fach).termine[0];
  };
  // Tage in deutscher Zeit, sonst landen Termine um Mitternacht (Server in UTC) auf dem falschen Tag.
  const heute0 = tagesGrenzen(heuteTag(now)).von.getTime();
  const at = (tagOffset: number, minute: number) => new Date(heute0 + tagOffset * DAY + (8 * 60 + minute) * 60000);
  const rows: Prisma.AppointmentCreateManyInput[] = [];
  // Vergangenheit: in der Zahnmedizin passend zu den Berichten, sonst zufällig.
  const vergangen = dental
    ? a.reportDates.filter((x) => now.getTime() - x.at.getTime() < 60 * DAY)
    : [...Array(Math.round(((kz.termine[0] + kz.termine[1]) / 2) * 30))].map(() => ({ patientId: pick(), at: at(-1 - Math.floor(r() * 42), Math.floor(r() * (tagesMinuten / 15)) * 15) }));
  for (const v of vergangen) {
    const tagOffset = Math.round((tagesGrenzen(heuteTag(v.at)).von.getTime() - heute0) / DAY);
    const start = at(tagOffset, Math.floor(r() * (tagesMinuten / 15)) * 15);
    rows.push({ practiceId, patientId: v.patientId, locationId: r() < zweigAnteil ? zweig.id : haupt.id, start, minutes: dauer(), reason: grund(v.patientId), status: "ERSCHIENEN" });
  }
  // Ausfälle und (Zahnmedizin) drei Termine ohne Dokumentation in der letzten Woche.
  // Etwa 5 % Ausfälle (nicht erschienen oder abgesagt)
  const ausfaelle = Math.max(4, Math.round(vergangen.length * 0.05));
  for (let i = 0; i < ausfaelle; i++) { const pid = pick(); rows.push({ practiceId, patientId: pid, locationId: haupt.id, start: at(-1 - Math.floor(r() * 40), Math.floor(r() * (tagesMinuten / 15)) * 15), minutes: dauer(), reason: grund(pid), status: r() < 0.6 ? "NICHT_ERSCHIENEN" : "ABGESAGT" }); }
  if (dental) for (let i = 1; i <= 3; i++) rows.push({ practiceId, patientId: pick(), locationId: haupt.id, start: at(-i, 120 + i * 30), minutes: 45, reason: "Füllung", status: "ERSCHIENEN" });
  // Heute bis in zwei Wochen.
  for (let tag = 0; tag <= 14; tag++) {
    const wd = new Date(at(tag, 240)).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const anzahl = tag === 0 ? kz.termine[1] : proTag();
    for (let i = 0; i < anzahl; i++) {
      const imHaupt = r() >= zweigAnteil;
      const pid = pick();
      rows.push({
        practiceId,
        patientId: pid,
        locationId: imHaupt ? haupt.id : zweig.id,
        start: at(tag, Math.floor(((i / anzahl) * tagesMinuten) / 10) * 10),
        minutes: dauer(),
        reason: grund(pid),
        status: tag === 0 ? (i < Math.round(anzahl * 0.35) ? "ERSCHIENEN" : r() < 0.7 ? "BESTAETIGT" : "GEPLANT") : r() < 0.4 ? "BESTAETIGT" : "GEPLANT",
        confirmedAt: r() < 0.4 ? new Date(now.getTime() - DAY) : null,
      });
    }
  }
  await prisma.appointment.createMany({ data: rows });

  const allergien = ["Penicillin", "Latex", "Lokalanästhetika vom Estertyp", "Nickel", "Ibuprofen"];
  // Diagnosen aus dem Befundmodell des Fachs, passend zum Geschlecht; Fächer ohne Diagnosen bekommen keine.
  const diagnosenFuer = (g: string | null): [string, string][] => befundmodell(a.fach, { geschlecht: g }).flatMap((reg) => reg.befunde.map((b) => [b.text, b.icd] as [string, string]));
  const mitMedikation = !["optik", "hoerakustik", "sanitaetshaus", "aesthetik"].includes(a.fach);
  const mitAllergie = !["optik", "hoerakustik"].includes(a.fach);
  const medis = ["Metformin 1000 mg 1-0-1", "Ramipril 5 mg 1-0-0", "ASS 100 mg 1-0-0 (Blutverdünner)", "L-Thyroxin 75 µg 1-0-0"];
  const entries: Prisma.PatientEntryCreateManyInput[] = [];
  for (const p of patients) {
    const x = r();
    if (mitAllergie && x < 0.08) entries.push({ practiceId, patientId: p.id, art: "ALLERGIE", text: allergien[Math.floor(r() * allergien.length)], createdBy: "Demo" });
    const diagnosen = diagnosenFuer(p.geschlecht);
    if (diagnosen.length && r() < 0.22) {
      const [text, code] = diagnosen[Math.floor(r() * diagnosen.length)];
      entries.push({ practiceId, patientId: p.id, art: "DIAGNOSE", text, code, createdBy: "Demo" });
    }
    if (mitMedikation && r() < (a.fach === "apotheke" || a.fach === "pflege" ? 0.45 : 0.12)) entries.push({ practiceId, patientId: p.id, art: "MEDIKATION", text: medis[Math.floor(r() * medis.length)], createdBy: "Demo" });
  }
  if (entries.length) await prisma.patientEntry.createMany({ data: entries });
}
