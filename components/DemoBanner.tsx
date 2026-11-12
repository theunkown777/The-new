import Link from "next/link";
import { DemoPatientButton } from "@/components/DemoPatientButton";
import { DemoRoleSwitch } from "@/components/DemoRoleSwitch";

// Hinweis im Gastzugang: Beispieldaten, automatische Löschung, Weg zur eigenen Praxis.
export function DemoBanner({ expiresAt, role, userName }: { expiresAt: Date; role: string; userName?: string | null }) {
  return (
    <div className="border-b border-brand-200 bg-brand-50">
      {/* Handy: eine Zeile, der Rest aufklappbar, damit der Hinweis nicht ein Viertel des Bildschirms belegt */}
      <details className="px-4 py-2 text-sm text-brand-800 sm:hidden" data-testid="demo-banner-handy">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate"><b>Gastzugang</b> · {role === "admin" ? "Geschäftsführung" : "Mitarbeiterin"} · Beispieldaten</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-brand-200">Mehr</span>
        </summary>
        <p className="mt-2">Erfundene Beispielpatienten. Bitte keine echten Patientendaten eingeben. Wird am {expiresAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })} gelöscht.</p>
        <div className="mt-2 flex flex-col items-start gap-1 [&>*]:min-h-[2.25rem] [&>*]:text-left">
          <DemoRoleSwitch role={role} />
          <DemoPatientButton />
          <Link href="/register" className="flex items-center font-medium underline">Eigene Praxis registrieren</Link>
        </div>
      </details>
      <div className="hidden flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-brand-800 sm:flex sm:px-6 lg:px-10">
        <span>
          <b>Gastzugang</b> · angemeldet als <b data-testid="demo-rolle-aktiv">{role === "admin" ? "Geschäftsführung" : `Mitarbeiterin · ${userName ?? "Rezeption"}`}</b> · erfundene Beispielpatienten. Bitte keine echten Patientendaten eingeben.
          Wird am {expiresAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })} gelöscht.
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <DemoRoleSwitch role={role} />
          <DemoPatientButton />
          <Link href="/register" className="font-medium underline">Eigene Praxis registrieren</Link>
        </span>
      </div>
    </div>
  );
}
