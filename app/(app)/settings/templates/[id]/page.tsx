import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sichtbarFuer } from "@/lib/katalogScope";
import { TemplateEditor } from "@/components/TemplateEditor";

export default async function TemplateEditorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const tpl = await prisma.serviceTemplate.findFirst({ where: { id: params.id, ...(await sichtbarFuer(session!.user.practiceId)) }, select: { practiceId: true } });
  if (!tpl) notFound();
  const vorgabe = !tpl.practiceId;
  const readOnly = session!.user.role !== "admin" || vorgabe;

  return (
    <div className="mx-auto max-w-4xl">
      {vorgabe ? (
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Vorgabe von Sorrida für Ihr Fach, schreibgeschützt. Für eigene Abläufe legen Sie unter „Vorlagen“ einen eigenen Sitzungstyp an.
        </p>
      ) : session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nur Admin-Konten der Praxis können diese Vorlage bearbeiten. Sie sehen die Positionen
          hier nur lesend.
        </p>
      )}
      <TemplateEditor templateId={params.id} readOnly={readOnly} />
    </div>
  );
}
