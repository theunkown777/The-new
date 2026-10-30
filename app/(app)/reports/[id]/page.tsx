import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadReportEditorProps } from "@/lib/reportView";
import { ReportEditor } from "@/components/ReportEditor";

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const props = await loadReportEditorProps(params.id, session!.user.practiceId);
  if (!props) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <ReportEditor {...props} />
    </div>
  );
}
