import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STANDARD_GOZ_PUNKTWERT_CENT } from "@/lib/billing";
import { buildServiceSummary } from "@/lib/serviceSummary";
import { DEFAULT_PRICES, defaultZuschussJahr, type ProposalInput } from "@/lib/proposals";
import { computeProposal } from "@/lib/proposalSchema";

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
  birthDate: string;
  insuranceType: "GKV" | "PKV";
  insuranceName: string;
  proposal?: { input: Omit<ProposalInput, "patient">; bonusYears: 0 | 5 | 10; status: string; choices?: Record<string, string> };
};

const PATIENTS: DemoPatient[] = [
  {
    firstName: "Martina",
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
  { firstName: "Peter", lastName: "Schulz", birthDate: "1968-09-22", insuranceType: "GKV", insuranceName: "AOK" },
  { firstName: "Lena", lastName: "Hoffmann", birthDate: "2014-06-30", insuranceType: "GKV", insuranceName: "Barmer" },
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
      prisma.treatmentProposal.deleteMany({ where: { practiceId: id } }),
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
export async function createDemoPractice(now = new Date()): Promise<{ email: string; password: string }> {
  const suffix = crypto.randomBytes(6).toString("hex");
  const email = `gast-${suffix}@demo.sorrida.invalid`;
  const password = crypto.randomBytes(24).toString("base64url");

  const practice = await prisma.practice.create({
    data: {
      name: DEMO_PRACTICE_NAME,
      isDemo: true,
      demoExpiresAt: new Date(now.getTime() + DEMO_TTL_MS),
      gozPunktwertCent: STANDARD_GOZ_PUNKTWERT_CENT,
      users: {
        create: {
          name: "Gast (Dr. Demo)",
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: "admin",
          emailVerifiedAt: now,
        },
      },
    },
    include: { users: true },
  });
  const author = practice.users[0];
  const zuschussJahr = defaultZuschussJahr(now);

  const template = await prisma.serviceTemplate.findFirst({
    where: { practiceId: null, name: "Kontrolluntersuchung" },
    include: { items: { include: { catalogItem: true }, orderBy: { position: "asc" } } },
  });

  for (const p of PATIENTS) {
    const patient = await prisma.patient.create({
      data: {
        practiceId: practice.id,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: new Date(p.birthDate),
        insuranceType: p.insuranceType,
        insuranceName: p.insuranceName,
        notes: "Beispielpatient im Gastzugang (erfundene Daten)",
      },
    });

    let reportId: string | null = null;
    if (p.lastName === "Weber" && template) {
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

    if (p.proposal) {
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
        },
      });
    }
  }

  return { email, password };
}
