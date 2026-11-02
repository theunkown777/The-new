import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TemplateList } from "@/components/TemplateList";

export default async function TemplatesSettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Vorlagen</h1>
      {session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nur Admin-Konten der Praxis können Vorlagen anlegen oder bearbeiten. Sie sehen die
          vorhandenen Vorlagen hier nur lesend.
        </p>
      )}
      <TemplateList readOnly={session!.user.role !== "admin"} />
    </div>
  );
}
