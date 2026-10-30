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
            <img src="/brand/sorrida-mark-hell.svg" alt="" className="h-6 w-auto shrink-0" />
            {session.user.practiceName}
          </span>
          <span className="shrink-0 text-xs tracking-[0.2em] text-brand-200">SORRIDA</span>
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
