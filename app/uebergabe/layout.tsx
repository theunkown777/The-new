import type { Metadata } from "next";
import { geparkteSitzung, uebergabeAktuell } from "@/lib/empfangServer";
import { LEERLAUF_MINUTEN } from "@/lib/empfang";
import { EmpfangWaechter } from "@/components/EmpfangWaechter";
import { EmpfangSperre } from "@/components/EmpfangSperre";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Empfang", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Patientenansicht am Empfangs-Tablet. Kein Menü, keine anderen Patienten, keine Praxiszahlen.
// Zugang nur mit gültigem Übergabe-Token (httpOnly-Cookie); die Praxis ist auf dem Gerät so lange
// nicht angemeldet. Ohne gültiges Token zeigt jede Seite hier nur die Sperre mit der PIN-Eingabe.
export default async function UebergabeLayout({ children }: { children: React.ReactNode }) {
  const a = await uebergabeAktuell();
  if (!a) {
    const geparkt = await geparkteSitzung();
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EE] px-4 py-10">
        <EmpfangSperre mitPin={!!geparkt} />
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-[#F5F2EE]" data-testid="uebergabe">
      <header className="sticky top-0 z-20 border-b border-[#E9E2DA] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 text-sm">
            <span className="block truncate font-medium text-brand-700">{a.patient.practice.name}</span>
            <span className="block truncate text-slate-600" data-testid="uebergabe-name">{a.patient.firstName} {a.patient.lastName}</span>
          </p>
          <EmpfangWaechter restSekunden={Math.max(0, Math.floor((a.uebergabe.bis - Date.now()) / 1000))} leerlaufMinuten={LEERLAUF_MINUTEN} />
        </div>
      </header>
      {children}
    </div>
  );
}
