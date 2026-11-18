import Link from "next/link";
import { DemoPatientButton } from "@/components/DemoPatientButton";
import { DemoRoleSwitch } from "@/components/DemoRoleSwitch";
import { FuehrungWiederKnopf } from "@/components/FuehrungWiederKnopf";
import { registrierungOffen } from "@/lib/registrierung";
import { rollenLabel } from "@/lib/rollen";

// Hinweis im Gastzugang: Beispieldaten, automatische Löschung, Weg zur eigenen Praxis.
// Eine Zeile; die Einzelheiten stehen hinter „Mehr“ (details/summary, ohne JavaScript bedienbar).
// Die Schritte zum Ausprobieren zeigt components/DemoFuehrung.tsx direkt darunter.
export function DemoBanner({ expiresAt, role, userName, personPl = "Patienten" }: { expiresAt: Date; role: string; userName?: string | null; personPl?: string }) {
  // Solange die Registrierung geschlossen ist (Standard), führt der Weg zur eigenen Praxis über die Pilot-Anfrage auf /register.
  const eigenePraxis = registrierungOffen() ? "Eigene Praxis registrieren" : "Pilotplatz anfragen";
  const geloescht = expiresAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" });
  return (
    <div className="border-b border-brand-200 bg-brand-50">
      {/* Handy: eine Zeile, der Rest aufklappbar, damit der Hinweis nicht ein Viertel des Bildschirms belegt */}
      <details className="px-4 py-2 text-sm text-brand-800 sm:hidden" data-testid="demo-banner-handy">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate"><b>Gastzugang</b> · {rollenLabel(role)} · Beispieldaten</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-brand-200">Mehr</span>
        </summary>
        <p className="mt-2">Erfundene Beispieldaten. Bitte keine echten personenbezogenen Daten eingeben. Wird am {geloescht} gelöscht.</p>
        <div className="mt-2 flex flex-col items-start gap-1 [&>*]:min-h-[2.25rem] [&>*]:text-left">
          <DemoRoleSwitch role={role} />
          <DemoPatientButton personPl={personPl} />
          <FuehrungWiederKnopf />
          <Link href="/register" className="flex items-center font-medium underline">{eigenePraxis}</Link>
        </div>
      </details>
      {/* Ab Tablet: eine Zeile mit Rolle und Rollenwechsel; Löschzeitpunkt und weitere Wege hinter „Mehr“ */}
      <div className="hidden items-center gap-x-4 px-4 py-1.5 text-sm text-brand-800 sm:flex sm:px-6 lg:px-10" data-testid="demo-banner">
        <span className="min-w-0 flex-1 truncate">
          <b>Gastzugang</b> · angemeldet als <b data-testid="demo-rolle-aktiv">{role === "admin" ? rollenLabel(role) : `${rollenLabel(role)} · ${userName ?? "Rezeption"}`}</b> · erfundene Beispieldaten.
          <span className="hidden 2xl:inline"> Bitte keine echten personenbezogenen Daten eingeben.</span>
        </span>
        <span className="shrink-0"><DemoRoleSwitch role={role} /></span>
        <details className="group relative shrink-0" data-testid="demo-banner-mehr">
          <summary className="ziel cursor-pointer list-none rounded-full bg-white px-3 py-0.5 text-xs font-medium ring-1 ring-brand-200 hover:ring-brand-400 [&::-webkit-details-marker]:hidden">
            Mehr
          </summary>
          <div className="ein-dialog absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-brand-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
            <p>
              Bitte keine echten personenbezogenen Daten eingeben. Wird am {geloescht} gelöscht.
            </p>
            <div className="mt-3 flex flex-col items-start gap-2 text-brand-800">
              <DemoPatientButton personPl={personPl} />
              <FuehrungWiederKnopf />
              <Link href="/register" className="font-medium underline" data-testid="demo-eigene-praxis">{eigenePraxis}</Link>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
