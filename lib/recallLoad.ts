import { prisma } from "@/lib/prisma";
import { RECALL_RULES, recallFor } from "@/lib/recall";
import { ageFromBirthDate } from "@/lib/proposals";

/** Patienten, deren Vorsorge fällig ist (Seite /vorsorge und Praxismanager). */
export async function loadRecallDue(practiceId: string, now = new Date()) {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true, name: true } });
  const fach = practice?.specialty ?? "zahn";
  const rules = RECALL_RULES[fach] ?? [];

  const patients = rules.length
    ? await prisma.patient.findMany({
        where: { practiceId },
        select: {
          id: true, firstName: true, lastName: true, birthDate: true, createdAt: true, recallSentAt: true, insuranceType: true,
          proposals: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          reports: { orderBy: { treatmentDate: "desc" }, take: 1, select: { treatmentDate: true, createdAt: true } },
          anamnesisForms: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1, select: { submittedAt: true } },
        },
        take: 5000,
      })
    : [];
  const due = patients
    .map((p) => {
      const letzter = new Date(
        Math.max(
          p.createdAt.getTime(),
          p.proposals[0]?.createdAt.getTime() ?? 0,
          (p.reports[0]?.treatmentDate ?? p.reports[0]?.createdAt)?.getTime() ?? 0,
          p.anamnesisForms[0]?.submittedAt?.getTime() ?? 0,
        ),
      );
      const r = recallFor({ fach, age: ageFromBirthDate(p.birthDate), letzterKontakt: letzter, erinnertAm: p.recallSentAt }, now);
      return r ? { p, r, letzter } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.r.tage - a.r.tage);
  return { practice, fach, rules, due, now };
}
