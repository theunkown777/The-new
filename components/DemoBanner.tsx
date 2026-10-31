import Link from "next/link";
import { DemoPatientButton } from "@/components/DemoPatientButton";
import { DemoRoleSwitch } from "@/components/DemoRoleSwitch";

// Hinweis im Gastzugang: Beispieldaten, automatische Löschung, Weg zur eigenen Praxis.
export function DemoBanner({ expiresAt, role, userName }: { expiresAt: Date; role: string; userName?: string | null }) {
  return (
    <div className="border-b border-brand-200 bg-brand-50">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-brand-800 sm:px-6 lg:px-10">
        <span>
          <b>Gastzugang</b> · angemeldet als <b data-testid="demo-rolle-aktiv">{role === "admin" ? "Geschäftsführung" : `Mitarbeiterin · ${userName ?? "Rezeption"}`}</b> · erfundene Beispielpatienten. Bitte keine echten Patientendaten eingeben.
          Wird am {expiresAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} gelöscht.
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
