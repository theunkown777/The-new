import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Schlankes Layout für das Fenster, das die Praxissoftware über den
// Sorrida-Connector öffnet: keine Hauptnavigation, damit es neben der PVS
// als eigenes, kompaktes Fenster funktioniert.
export default async function EmbedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-800 bg-brand-600">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="flex items-center gap-2 truncate text-sm font-semibold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark-hell.webp" alt="" className="h-6 w-auto shrink-0" />
            {session.user.practiceName}
          </span>
          <span className="font-brand shrink-0 text-xs text-brand-200">SORRIDA</span>
        </div>
      </header>
      <main className="px-4 py-4">
        {session.user.mfaPending ? (
          // Ohne Zwei-Faktor-Anmeldung gibt Sorrida keine Patientendaten heraus. Statt eines leeren
          // Formulars sagen, was zu tun ist.
          <div className="card mx-auto max-w-md text-sm text-slate-700" data-testid="embed-2fa-hinweis">
            <h1 className="mb-2 text-base font-semibold text-slate-900">Bitte zuerst die Zwei-Faktor-Anmeldung einrichten</h1>
            <p>Ihr Konto braucht eine Zwei-Faktor-Anmeldung, bevor Sorrida Patientendaten zeigt. Das dauert etwa zwei Minuten.</p>
            <a href="/dashboard" className="btn-primary mt-4 inline-block">Jetzt einrichten</a>
            <p className="mt-3 text-xs text-slate-500">Danach melden Sie sich einmal neu an und öffnen Sorrida wieder aus Ihrer Praxissoftware.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
