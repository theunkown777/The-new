import { prisma } from "@/lib/prisma";
import { anamneseZeilen, anamnesisFlags, anamnesisProposalGlobals, anliegenTexte, parseAnamnesis, type AnamneseZeile, type AnamnesisFlag } from "@/lib/anamnesis";
import type { GlobalCode } from "@/lib/proposals";

export type AnamnesisSummary = {
  submittedAt: string | null;
  open: { createdAt: string; viewedAt: string | null; expiresAt: string } | null;
  flags: AnamnesisFlag[];
  /** Übernahme in den zahnärztlichen Vorschlag; in anderen Fächern leer. */
  globals: GlobalCode[];
  /** Zum Nachlesen: nur beantwortete Fragen, Anliegen als Text. */
  answers: { zeilen: AnamneseZeile[]; anliegen: string[]; note?: string; confirmName: string; eltern: boolean } | null;
};

/** Letzte ausgefüllte Anamnese und ein ggf. offener Link für einen Patienten der Praxis. */
export async function loadAnamnesis(practiceId: string, patientId: string): Promise<AnamnesisSummary> {
  const [done, open, praxis] = await Promise.all([
    prisma.anamnesisForm.findFirst({
      where: { practiceId, patientId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.anamnesisForm.findFirst({
      where: { practiceId, patientId, submittedAt: null, tokenHash: { not: null }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } }),
  ]);
  const a = done ? parseAnamnesis(done.answers) : null;
  return {
    submittedAt: done?.submittedAt?.toISOString() ?? null,
    open: open ? { createdAt: open.createdAt.toISOString(), viewedAt: open.viewedAt?.toISOString() ?? null, expiresAt: open.expiresAt.toISOString() } : null,
    flags: a ? anamnesisFlags(a) : [],
    // Ältere Bögen ohne Fach: das Fach beim Anlegen, sonst das der Praxis.
    globals: a ? anamnesisProposalGlobals(a, done?.fach ?? praxis?.specialty) : [],
    answers: a ? { zeilen: anamneseZeilen(a), anliegen: anliegenTexte(a), ...(a.note ? { note: a.note } : {}), confirmName: a.confirmName, eltern: a.ansprache === "eltern" } : null,
  };
}
