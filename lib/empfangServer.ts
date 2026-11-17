import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GEPARKT_COOKIE, UEBERGABE_COOKIE, sitzungHolen, uebergabeLesen, type Uebergabe, type UebergabeZweck } from "@/lib/empfang";
import { portalProposalWhere } from "@/lib/portalAuth";
import { agreementContext } from "@/lib/agreementContext";

// Serverseite des Empfangsmodus: Wer ist gerade „am Tablet“? Maßgeblich ist allein das Übergabe-Token
// im httpOnly-Cookie. Es nennt Praxis und Patient; jede Abfrage wird auf beide eingegrenzt.

export const cookieSicher = () => process.env.NODE_ENV === "production";

/** Aktuelle Übergabe samt Patient, oder null (kein Token, abgelaufen, Patient gehört nicht zur Praxis). */
export async function uebergabeAktuell() {
  const jar = await cookies();
  const uebergabe = uebergabeLesen(jar.get(UEBERGABE_COOKIE)?.value);
  if (!uebergabe) return null;
  const patient = await prisma.patient.findFirst({
    where: { id: uebergabe.patientId, practiceId: uebergabe.practiceId },
    select: { id: true, practiceId: true, firstName: true, lastName: true, email: true, phone: true, contactConsentAt: true, whatsappConsentAt: true, birthDate: true, geschlecht: true, practice: { select: { name: true, specialty: true, isDemo: true } } },
  });
  return patient ? { uebergabe, patient } : null;
}

/** Wie uebergabeAktuell, aber nur, wenn die Übergabe diesen Schritt freigibt. */
export async function uebergabeFuer(zweck: UebergabeZweck) {
  const a = await uebergabeAktuell();
  return a && a.uebergabe.zwecke.includes(zweck) ? a : null;
}

/** Liegt eine geparkte Praxis-Sitzung im Browser (dann führt die PIN zurück)? */
export async function geparkteSitzung() {
  const jar = await cookies();
  return sitzungHolen(jar.get(GEPARKT_COOKIE)?.value);
}

/** Einverständnisse, die der Patient unterschreiben kann: dieselbe Auswahl wie im Patientenportal. */
export const offeneEinverstaendnisseWhere = (patientId: string) => ({
  ...portalProposalWhere(patientId),
  status: { in: ["ENTWURF", "BESPROCHEN", "ANGENOMMEN"] },
  agreedAt: null,
});

/** Was ist für diesen Patienten in dieser Übergabe zu tun, was schon erledigt? */
export async function uebergabeSchritte(u: Uebergabe) {
  const seit = new Date(u.von);
  const now = new Date();
  const [anamneseOffen, anamneseFertig, vorschlaege, unterschrieben] = await Promise.all([
    u.zwecke.includes("anamnese") ? prisma.anamnesisForm.findFirst({ where: { practiceId: u.practiceId, patientId: u.patientId, submittedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, select: { id: true } }) : null,
    u.zwecke.includes("anamnese") ? prisma.anamnesisForm.count({ where: { practiceId: u.practiceId, patientId: u.patientId, submittedAt: { gte: seit } } }) : 0,
    u.zwecke.includes("unterschrift")
      ? prisma.treatmentProposal.findMany({
          where: { practiceId: u.practiceId, ...offeneEinverstaendnisseWhere(u.patientId) }, orderBy: { createdAt: "desc" }, take: 10,
          select: { id: true, status: true, createdAt: true, input: true, choices: true, patientChoices: true, practice: { select: { name: true, proposalPrices: true } } },
        })
      : [],
    u.zwecke.includes("unterschrift") ? prisma.treatmentProposal.count({ where: { practiceId: u.practiceId, patientId: u.patientId, agreedAt: { gte: seit } } }) : 0,
  ]);
  const einverstaendnisse = vorschlaege.filter((p) => agreementContext(p)).map((p) => ({ id: p.id, vom: p.createdAt }));
  return { anamneseOffen: anamneseOffen?.id ?? null, anamneseFertig: anamneseFertig > 0, einverstaendnisse, unterschrieben };
}
