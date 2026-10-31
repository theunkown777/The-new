import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TeamSettings } from "@/components/TeamSettings";

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session!.user.role === "admin";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Team</h1>
      {isAdmin ? (
        <TeamSettings currentUserId={session!.user.id} />
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Die Teamverwaltung ist nur für die Geschäftsführung (Admin) der Praxis verfügbar.
        </p>
      )}
    </div>
  );
}
