import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadReportEditorProps } from "@/lib/reportView";
import { ReportEditor } from "@/components/ReportEditor";

export default async function EmbedReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const [props, report] = await Promise.all([
    loadReportEditorProps(params.id, practiceId),
    prisma.report.findFirst({ where: { id: params.id, practiceId }, select: { patientId: true } }),
  ]);
  if (!props || !report) notFound();

  return (
    <div className="max-w-3xl space-y-3">
      <Link href={`/embed/patient/${report.patientId}?view=verlauf`} className="text-sm text-brand-600 hover:underline">
        ← Zurück zum Patienten
      </Link>
      <ReportEditor {...props} />
    </div>
  );
}
