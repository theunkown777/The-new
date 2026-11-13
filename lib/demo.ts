import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STANDARD_GOZ_PUNKTWERT_CENT } from "@/lib/billing";
import { buildServiceSummary } from "@/lib/serviceSummary";
import { DEFAULT_PRICES, buildProposal, defaultZuschussJahr, type ProposalInput } from "@/lib/proposals";
import { DENTAL_ID, specialty, type Specialty } from "@/lib/specialties";
import { seedBulkDemo } from "@/lib/demoBulk";
import { eingangAusBestand } from "@/lib/eingang";
import { fachprofil, passtZuPerson } from "@/lib/fachprofile";
import { computeProposal } from "@/lib/proposalSchema";
import { QUESTIONS } from "@/lib/anamnesis";

// Gastzugang: Jeder Gast bekommt eine eigene, abgeschottete Demo-Praxis mit
// erfundenen Beispielpatienten, damit er Sorrida so sieht wie ein Kunde,
// ohne fremde Daten zu sehen oder anderen Gästen in die Quere zu kommen.
// Demo-Praxen laufen nach DEMO_TTL_MS ab und werden beim nächsten Anlegen
// eines Gastzugangs gelöscht.

export const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
export const DEMO_PRACTICE_NAME = "Zahnarztpraxis am Markt (Demo)";
/** Obergrenze für KI-Berichte je Demo-Praxis, damit der Gastzugang keine Kosten treibt. */
export const DEMO_REPORT_LIMIT = 15;

const DEMO_REPORT_TEXT = `Befund- und Behandlungsbericht

Patientin: Martina Weber, geb. 12.03.1980
Behandlung: Kontrolluntersuchung

Anamnese
Die Patientin stellte sich zur halbjährlichen Kontrolle vor. Allgemeinmedizinisch keine Änderungen seit dem letzten Besuch, keine Medikamente, keine bekannten Allergien.

Befund
Eingehende Untersuchung aller Zähne und des Zahnhalteapparats. Regio 36 fehlt seit Extraktion vor zwei Jahren, die Nachbarzähne 35 und 37 sind kariesfrei. An 16 kariöser Defekt okklusal-mesial-distal, an 25 kleiner Defekt approximal. 46 mit insuffizienter, frakturierter Füllung, Restzahnsubstanz stark geschwächt. Supragingivale Beläge und Zahnstein im Unterkieferfrontzahnbereich. PSI-Code maximal 2.

Beratung
Die Patientin wurde über die Befunde und die Behandlungsmöglichkeiten einschließlich der Kassenleistungen und der Alternativen mit Eigenanteil aufgeklärt. Ein schriftlicher Behandlungsvorschlag wurde mitgegeben.

Weiteres Vorgehen
Füllungstherapie 16 und 25, Überkronung 46, Versorgung der Lücke 36 nach Entscheidung der Patientin, Zahnsteinentfernung bzw. professionelle Zahnreinigung.`;

type DemoPatient = {
  firstName: string;
  lastName: string;
  geschlecht: "W" | "M";
  birthDate: string;
  insuranceType: "GKV" | "PKV";
  insuranceName: string;
  proposal?: {
    input: Omit<ProposalInput, "patient">;
    bonusYears: 0 | 5 | 10;
    status: string;
    choices?: Record<string, string>;
    patientResponse?: { response: "INTERESSE" | "RUECKRUF"; note: string };
  };
};

const PATIENTS: DemoPatient[] = [
  {
    firstName: "Martina",
    geschlecht: "W",
    lastName: "Weber",
    birthDate: "1980-03-12",
    insuranceType: "GKV",
    insuranceName: "Techniker Krankenkasse",
    proposal: {
      input: {
        teeth: { "16": "karies_gross", "25": "karies_klein", "36": "fehlt", "46": "zerstoert" },
        globals: { zahnstein: true },
      },
      bonusYears: 10,
      status: "ENTWURF",
    },
  },
  {
    firstName: "Anna",
    geschlecht: "W",
    lastName: "Krüger",
    birthDate: "1975-04-02",
    insuranceType: "PKV",
    insuranceName: "Debeka",
    proposal: {
      input: { teeth: { "26": "wurzel" }, globals: { bruxismus: true } },
      bonusYears: 0,
      status: "ANGENOMMEN",
      choices: { t26: "wkplus" },
    },
  },
  {
    firstName: "Peter",
    geschlecht: "M",
    lastName: "Schulz",
    birthDate: "1968-09-22",
    insuranceType: "GKV",
    insuranceName: "AOK",
    // Hat den Vorschlag über den Patienten-Link angesehen und um Rückruf gebeten.
    proposal: {
      input: { teeth: { "24": "fehlt" }, globals: {} },
      bonusYears: 5,
      status: "BESPROCHEN",
      choices: { t24: "impl" },
      patientResponse: { response: "RUECKRUF", note: "Am besten nachmittags erreichbar." },
    },
  },
  { firstName: "Lena", geschlecht: "W", lastName: "Hoffmann", birthDate: "2014-06-30", insuranceType: "GKV", insuranceName: "Barmer" },
];

function age(birth: string, today = new Date()): number {
  const b = new Date(birth);
  let a = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--;
  return a;
}

/** Abgelaufene Demo-Praxen samt aller abhängigen Daten löschen. */
export async function cleanupExpiredDemos(now = new Date()): Promise<number> {
  const expired = await prisma.practice.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: now } },
    select: { id: true },
  });
  for (const { id } of expired) {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { practiceId: id } }),
      prisma.appointment.deleteMany({ where: { practiceId: id } }),
      prisma.location.deleteMany({ where: { practiceId: id } }),
      prisma.patientEntry.deleteMany({ where: { practiceId: id } }),
      prisma.patientDocument.deleteMany({ where: { practiceId: id } }),
      prisma.invoice.deleteMany({ where: { practiceId: id } }),
      prisma.treatmentProposal.deleteMany({ where: { practiceId: id } }),
      prisma.anamnesisForm.deleteMany({ where: { practiceId: id } }),
      prisma.reportRevision.deleteMany({ where: { report: { practiceId: id } } }),
      prisma.report.deleteMany({ where: { practiceId: id } }),
      prisma.patient.deleteMany({ where: { practiceId: id } }),
      prisma.serviceTemplate.deleteMany({ where: { practiceId: id } }),
      prisma.serviceCatalogItem.deleteMany({ where: { practiceId: id } }),
      prisma.user.deleteMany({ where: { practiceId: id } }),
      prisma.practice.delete({ where: { id } }),
    ]);
  }
  return expired.length;
}

/** Neue Demo-Praxis mit Beispieldaten; liefert die Zugangsdaten für die sofortige Anmeldung. */
export async function createDemoPractice(now = new Date(), fach: string = DENTAL_ID): Promise<{ email: string; password: string; practiceId: string }> {
  const spec = specialty(fach);
  const dental = !spec;
  const suffix = crypto.randomBytes(6).toString("hex");
  const email = `gast-${suffix}@demo.sorrida.invalid`;
  const password = crypto.randomBytes(24).toString("base64url");

  const practice = await prisma.practice.create({
    data: {
      name: spec ? `${spec.kurz} am Markt (Demo)` : DEMO_PRACTICE_NAME,
      specialty: spec ? spec.id : DENTAL_ID,
      isDemo: true,
      // Demo mit erfundenen Daten: Diktat über den Browser-Dienst ist zum Ausprobieren erlaubt.
      diktatCloud: true,
      // Demo zeigt regionale KV-Ziffern beispielhaft für Nordrhein (in der Praxis unter Leistungsverzeichnis änderbar)
      kvBezirk: "NO",
      // Beispiel-IBAN aus der Bankendokumentation, damit das Portal den GiroCode zeigt.
      accountHolder: spec ? `${spec.kurz} am Markt` : "Zahnarztpraxis am Markt",
      iban: "DE89370400440532013000",
      demoExpiresAt: new Date(now.getTime() + DEMO_TTL_MS),
      gozPunktwertCent: STANDARD_GOZ_PUNKTWERT_CENT,
      installments: { enabled: true, months: 12, zinsfrei: true, minEur: 300 },
      users: {
        create: [
          {
            name: "Gast (Dr. Demo)",
            email,
            passwordHash: await bcrypt.hash(password, 10),
            role: "admin",
            emailVerifiedAt: now,
          },
          // Zweite Behandlerin, damit "Mein Bereich" zeigt, dass jede Person nur ihren Stamm sieht.
          // Zufälliges Passwort, das niemand kennt: Anmelden ist mit diesem Konto nicht möglich.
          {
            name: "Lea Brandt (Demo)",
            email: `brandt-${crypto.randomBytes(6).toString("hex")}@demo.sorrida.invalid`,
            passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("base64url"), 10),
            role: "staff",
          },
          // Mitarbeiterin ohne Analyse-Freigabe, damit die Berechtigung im Team sichtbar ist.
          // Zufälliges Passwort, das niemand kennt: Anmelden ist mit diesem Konto nicht möglich.
          {
            name: "Rezeption (Demo)",
            email: `rezeption-${crypto.randomBytes(6).toString("hex")}@demo.sorrida.invalid`,
            passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("base64url"), 10),
            role: "staff",
          },
        ],
      },
    },
    include: { users: true },
  });
  const author = practice.users.find((u) => u.role === "admin") ?? practice.users[0];
  const zuschussJahr = defaultZuschussJahr(now);

  const template = await prisma.serviceTemplate.findFirst({
    where: { practiceId: null, fach: "zahn", name: "Kontrolluntersuchung" },
    include: { items: { include: { catalogItem: true }, orderBy: { position: "asc" } } },
  });

  const created: { id: string; firstName: string; lastName: string; birthDate: string; insuranceType: "GKV" | "PKV"; geschlecht: "W" | "M" }[] = [];
  // Feste Beispielpatienten nur, wenn sie zum Fach passen: keine Männer in der
  // Frauenheilkunde oder Hebammenhilfe, keine Erwachsenen beim Kinderarzt, keine
  // Kinder in reinen Erwachsenenfächern. Das Alter wird in den Bereich des Fachs gelegt.
  const profil = fachprofil(spec ? spec.id : DENTAL_ID);
  const passende = PATIENTS.filter((p) => !profil.nurGeschlecht || p.geschlecht === profil.nurGeschlecht).filter((p) => {
    const a = age(p.birthDate, now);
    const kind = a < 18;
    return profil.alter[1] < 18 ? kind : !(kind && profil.alter[0] >= 14);
  }).map((p) => {
    const a = age(p.birthDate, now);
    if (a >= profil.alter[0] && a <= profil.alter[1]) return p;
    const ziel = Math.min(profil.alter[1], Math.max(profil.alter[0], profil.alter[2]));
    return { ...p, birthDate: `${now.getFullYear() - ziel}${p.birthDate.slice(4)}` };
  });
  for (const p of passende) {
    const patient = await prisma.patient.create({
      data: {
        practiceId: practice.id,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: new Date(p.birthDate),
        geschlecht: p.geschlecht,
        insuranceType: p.insuranceType,
        insuranceName: p.insuranceName,
        notes: `Beispiel (${profil.person.sg}) im Gastzugang, erfundene Daten`,
      },
    });

    if (p.lastName === "Krüger") {
      // Ausgefüllte digitale Anamnese als Beispiel für Hinweise und Übernahme in den Vorschlag.
      await prisma.anamnesisForm.create({
        data: {
          practiceId: practice.id,
          patientId: patient.id,
          expiresAt: now,
          viewedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
          submittedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
          answers: {
            q: Object.fromEntries(
              QUESTIONS.map((q) => [
                q.key,
                q.key === "blutverduenner"
                  ? { yes: true, detail: "ASS 100" }
                  : q.key === "allergien"
                    ? { yes: true, detail: "Penicillin" }
                    : { yes: q.key === "knirschen" || q.key === "medikamente", detail: q.key === "medikamente" ? "ASS 100, Ramipril" : undefined },
              ]),
            ),
            wishes: ["hell"],
            confirmName: "Anna Krüger",
          },
        },
      });
    }

    let reportId: string | null = null;
    created.push({ id: patient.id, firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate, insuranceType: p.insuranceType, geschlecht: p.geschlecht });
    if (dental && p.lastName === "Weber" && template) {
      const entries = template.items.map((it, i) => ({
        catalogItemId: it.catalogItemId,
        // Bei Dubletten GOZ/BEMA nur die zur Kassenart passende Position als erbracht.
        performed: it.catalogItem.system === "GOZ" ? !template.items.some((o) => o.catalogItem.system === "BEMA" && o.catalogItem.title === it.catalogItem.title) : true,
        toothNumbers: null,
        quantity: 1,
        note: null,
        position: i,
        catalogItem: it.catalogItem,
      }));
      const report = await prisma.report.create({
        data: {
          practiceId: practice.id,
          patientId: patient.id,
          authorId: author.id,
          type: "BEFUND",
          treatmentDate: now,
          serviceTemplateId: template.id,
          serviceSummary: buildServiceSummary(entries),
          reviewConfirmed: true,
          generatedText: DEMO_REPORT_TEXT,
          serviceEntries: {
            create: entries.map(({ catalogItem: _c, ...e }) => e),
          },
        },
      });
      reportId = report.id;
    }

    if (dental && p.proposal) {
      const input: ProposalInput = {
        ...p.proposal.input,
        patient: {
          age: age(p.birthDate, now),
          insurance: p.insuranceType,
          bonusYears: p.proposal.bonusYears,
          haertefall: false,
          erstattungProzent: p.insuranceType === "PKV" ? 80 : 0,
          zuschussJahr,
        },
      };
      const computed = computeProposal({
        input,
        choices: p.proposal.choices ?? {},
        prices: DEFAULT_PRICES,
        patientName: `${p.firstName} ${p.lastName}`,
        practiceName: DEMO_PRACTICE_NAME,
        date: now,
      });
      await prisma.treatmentProposal.create({
        data: {
          practiceId: practice.id,
          patientId: patient.id,
          authorId: author.id,
          status: p.proposal.status,
          input: input as unknown as Prisma.InputJsonValue,
          reportId,
          ...computed,
          ...(p.proposal.patientResponse && {
            shareTokenHash: crypto.randomBytes(32).toString("hex"),
            shareExpiresAt: new Date(now.getTime() + DEMO_TTL_MS),
            shareCreatedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
            patientViewedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
            patientWantsInstallments: true,
            patientResponse: p.proposal.patientResponse.response,
            patientChoices: p.proposal.choices ?? {},
            patientNote: p.proposal.patientResponse.note,
            patientRespondedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          }),
        },
      });
    }
  }

  if (spec) await seedMedicalProposals(spec, practice.id, author.id, practice.name, created, now);
  // Überschaubare Größe: 30 bis 80 Patienten mit Vorschlägen, Links, Anamnesen (lib/demoKennzahlen.ts).
  await seedBulkDemo({ practiceId: practice.id, practiceName: practice.name, authorId: author.id, fach: spec ? spec.id : DENTAL_ID, existing: created.length, now });
  await eingangAusBestand(practice.id, now).catch((e) => console.error("Demo-Eingang", e));
  await verteileStamm(practice.id, author.id, practice.users.find((u) => u.name.startsWith("Lea Brandt"))?.id, new Set(created.map((c) => c.id)));
  return { email, password, practiceId: practice.id };
}

/** Beispielvorschläge für eine Arztpraxis: offen, mit Rückruf-Wunsch und angenommen. */
async function seedMedicalProposals(
  spec: Specialty,
  practiceId: string,
  authorId: string,
  practiceName: string,
  patients: { id: string; firstName: string; lastName: string; birthDate: string; insuranceType: "GKV" | "PKV"; geschlecht: "W" | "M" }[],
  now: Date,
) {
  const by = (n: string) => patients.find((p) => p.lastName === n);
  const order = (
    spec.id === "uro" ? [by("Schulz"), by("Weber")] : spec.id === "gyn" || spec.id === "hebamme" ? [by("Weber"), by("Krüger")] : spec.id === "kinder" ? [by("Hoffmann")] : [by("Weber"), by("Schulz"), by("Krüger")]
  ).filter((p): p is NonNullable<typeof p> => !!p);
  for (const [i, p] of order.entries()) {
    // Nur Anlässe, die zu Geschlecht und Alter dieser Person passen
    const anlaesse = spec.anlaesse.filter((a) => !a.nurAufWunsch && passtZuPerson(a, { geschlecht: p.geschlecht, alter: age(p.birthDate, now) })).map((a) => a.id);
    if (!anlaesse.length) continue;
    const plans: { status: string; anlaesse: string[]; pickIgel: boolean; response?: boolean }[] = [
      { status: "ENTWURF", anlaesse, pickIgel: false },
      { status: "BESPROCHEN", anlaesse: anlaesse.slice(0, 1), pickIgel: true, response: true },
      { status: "ANGENOMMEN", anlaesse: anlaesse.slice(0, 1), pickIgel: true },
    ];
    const plan = plans[i] ?? plans[0];
    const input: ProposalInput = {
      teeth: {},
      globals: {},
      patient: { age: age(p.birthDate, now), insurance: p.insuranceType, bonusYears: 0, haertefall: false, erstattungProzent: p.insuranceType === "PKV" ? 80 : 0 },
      fach: spec.id,
      anlaesse: plan.anlaesse,
      med: { prices: {}, custom: [] },
    };
    const items = buildProposal(input, DEFAULT_PRICES);
    const choices = plan.pickIgel
      ? Object.fromEntries(items.filter((it, n) => !it.zusatz || n % 2 === 1).map((it) => [it.key, it.options.find((o) => o.type === "igel")?.id ?? it.options[0].id]))
      : {};
    const computed = computeProposal({ input, choices, prices: DEFAULT_PRICES, patientName: `${p.firstName} ${p.lastName}`, practiceName, date: now });
    await prisma.treatmentProposal.create({
      data: {
        practiceId,
        patientId: p.id,
        authorId,
        status: plan.status,
        input: input as unknown as Prisma.InputJsonValue,
        ...computed,
        ...(plan.response && {
          shareTokenHash: crypto.randomBytes(32).toString("hex"),
          shareExpiresAt: new Date(now.getTime() + DEMO_TTL_MS),
          shareCreatedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
          patientViewedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          patientResponse: "RUECKRUF",
          patientChoices: computed.choices,
          patientNote: "Was zahlt meine Kasse davon?",
          patientRespondedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        }),
      },
    });
  }
}

/**
 * Demo: Patientenstamm auf zwei Behandelnde verteilen (etwa 55 % Gast, 35 %
 * Kollegin, 10 % ohne feste Zuordnung). Vorschläge der Patientinnen und
 * Patienten der Kollegin stammen dann auch von ihr, damit Umsatz und
 * Annahmequote in "Mein Bereich" getrennt sind. Die festen Beispielpatienten
 * bleiben beim Gast.
 */
async function verteileStamm(practiceId: string, gastId: string, kolleginId: string | undefined, fest: Set<string>) {
  const ids = (await prisma.patient.findMany({ where: { practiceId }, select: { id: true } })).map((p) => p.id);
  const gast: string[] = [];
  const kollegin: string[] = [];
  ids.forEach((id) => {
    const r = parseInt(id.slice(-4), 36) % 20;
    if (fest.has(id) || r < 11 || !kolleginId) gast.push(id);
    else if (r < 18) kollegin.push(id);
  });
  await prisma.patient.updateMany({ where: { id: { in: gast } }, data: { behandlerId: gastId } });
  if (kolleginId && kollegin.length) {
    await prisma.patient.updateMany({ where: { id: { in: kollegin } }, data: { behandlerId: kolleginId } });
    await prisma.treatmentProposal.updateMany({ where: { practiceId, patientId: { in: kollegin } }, data: { authorId: kolleginId } });
    await prisma.report.updateMany({ where: { practiceId, patientId: { in: kollegin } }, data: { authorId: kolleginId } });
  }
}
