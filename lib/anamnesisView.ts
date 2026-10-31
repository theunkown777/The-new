import { prisma } from "@/lib/prisma";
import { anamnesisFlags, anamnesisProposalGlobals, parseAnamnesis, type AnamnesisFlag } from "@/lib/anamnesis";
import type { GlobalCode } from "@/lib/proposals";

export type AnamnesisSummary = {
  submittedAt: string | null;
  open: { createdAt: string; viewedAt: string | null; expiresAt: string } | null;
  flags: AnamnesisFlag[];
  globals: GlobalCode[];
  answers: ReturnType<typeof parseAnamnesis>;
};

/** Letzte ausgefüllte Anamnese und ein ggf. offener Link für einen Patienten der Praxis. */
export async function loadAnamnesis(practiceId: string, patientId: string): Promise<AnamnesisSummary> {
  const [done, open] = await Promise.all([
    prisma.anamnesisForm.findFirst({
      where: { practiceId, patientId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.anamnesisForm.findFirst({
      where: { practiceId, patientId, submittedAt: null, tokenHash: { not: null }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const answers = done ? parseAnamnesis(done.answers) : null;
  return {
    submittedAt: done?.submittedAt?.toISOString() ?? null,
    open: open ? { createdAt: open.createdAt.toISOString(), viewedAt: open.viewedAt?.toISOString() ?? null, expiresAt: open.expiresAt.toISOString() } : null,
    flags: answers ? anamnesisFlags(answers) : [],
    globals: answers ? anamnesisProposalGlobals(answers) : [],
    answers,
  };
}
