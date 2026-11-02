import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CatalogSettings } from "@/components/CatalogSettings";

export default async function CatalogSettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Katalog</h1>
      {session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nur Admin-Konten der Praxis können Punktzahl/Festbetrag ändern. Sie sehen die
          aktuellen Werte hier nur lesend.
        </p>
      )}
      <CatalogSettings readOnly={session!.user.role !== "admin"} />
    </div>
  );
}
