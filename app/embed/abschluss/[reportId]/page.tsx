import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WrapUpSummary } from "@/components/WrapUpSummary";

export default async function EmbedWrapUpResultPage({ params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions);
  const report = await prisma.report.findFirst({
    where: { id: params.reportId, practiceId: session!.user.practiceId },
    select: { patientId: true },
  });
  if (!report) notFound();

  return (
    <WrapUpSummary
      reportId={params.reportId}
      practiceId={session!.user.practiceId}
      links={{
        report: `/embed/report/${params.reportId}`,
        proposal: "/embed/proposal/:id",
        patient: `/embed/patient/${report.patientId}?view=verlauf`,
        newWrapUp: `/embed/patient/${report.patientId}?view=abschluss`,
      }}
    />
  );
}
