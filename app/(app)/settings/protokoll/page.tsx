import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/audit";
import { LOESCHFRISTEN, NICHT_AUTOMATISCH } from "@/lib/loeschfristen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Protokoll" };

const GRUPPEN: Record<string, { label: string; actions: AuditAction[] }> = {
  alle: { label: "Alle", actions: [] },
  anmeldung: { label: "Anmeldungen", actions: ["login", "login.fehlgeschlagen", "2fa.an", "2fa.aus"] },
  patienten: { label: "Patientendaten", actions: ["patient.export", "patient.geloescht"] },
  berichte: { label: "Berichte", actions: ["bericht.ki", "bericht.freigegeben", "bericht.zurueckgezogen"] },
  team: { label: "Team und Schnittstellen", actions: ["team.rolle", "team.entfernt", "team.einladung", "schnittstelle.schluessel"] },
  geld: { label: "Rechnungen", actions: ["rechnung.status"] },
};

export default async function ProtokollPage({ searchParams }: { searchParams: { gruppe?: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-3xl text-slate-900">Protokoll nur für Admins</h1>
        <p className="mt-3 text-slate-600">Das Protokoll enthält Anmeldungen und Änderungen aller Mitarbeitenden und ist deshalb der Praxisleitung vorbehalten.</p>
      </div>
    );
  }
  const practiceId = session.user.practiceId;
  const gruppe = GRUPPEN[searchParams.gruppe ?? "alle"] ? (searchParams.gruppe ?? "alle") : "alle";
  const actions = GRUPPEN[gruppe].actions;
  const [entries, team, fehl] = await Promise.all([
    prisma.auditLog.findMany({
      where: { practiceId, ...(actions.length ? { action: { in: actions } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({ where: { practiceId }, select: { id: true, name: true, role: true, totpEnabled: true }, orderBy: { name: "asc" } }),
    prisma.auditLog.count({ where: { practiceId, action: "login.fehlgeschlagen", createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
  ]);
  const ohne2fa = team.filter((u) => !u.totpEnabled);

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="protokoll">
      <div>
        <Link href="/settings" className="ziel text-sm text-slate-500 hover:text-brand-700">← Einstellungen</Link>
        <h1 className="mt-2 font-display text-3xl text-slate-900">Protokoll und Datenschutz</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sicherheitsrelevante Vorgänge der letzten Zeit. Das Protokoll enthält keine Gesundheitsdaten und keine Patientennamen, nur Art, Person und Zeitpunkt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`card ${ohne2fa.length ? "border-amber-300" : ""}`} data-testid="zwei-faktor-stand">
          <p className="text-sm text-slate-500">Zwei-Faktor-Anmeldung</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{team.length - ohne2fa.length} / {team.length}</p>
          <p className="mt-1 text-xs text-slate-600">
            {ohne2fa.length ? `Ohne 2FA: ${ohne2fa.map((u) => u.name).join(", ")}. Bei Gesundheitsdaten dringend empfohlen.` : "Alle Konten sind geschützt."}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Fehlgeschlagene Anmeldungen, 7 Tage</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${fehl > 5 ? "text-red-700" : "text-slate-900"}`}>{fehl}</p>
          <p className="mt-1 text-xs text-slate-600">Nach 5 Fehlversuchen sperrt Sorrida das Konto für 15 Minuten.</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">KI-Berichte</p>
          <p className="mt-1 text-sm text-slate-800">Name, Geburtsdatum und Versichertennummer gehen nicht an den KI-Dienst. Jeder Bericht bleibt Entwurf bis zur Freigabe.</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter">
        {Object.entries(GRUPPEN).map(([k, g]) => (
          <Link key={k} href={`/settings/protokoll?gruppe=${k}`} aria-current={k === gruppe ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 ring-1 ${k === gruppe ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:text-brand-700"}`}>
            {g.label}
          </Link>
        ))}
      </nav>

      <div className="card overflow-x-auto p-0">
        {entries.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">Noch keine Einträge. Das Protokoll beginnt mit dieser Version von Sorrida.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Zeitpunkt</th><th className="px-4 py-2">Person</th><th className="px-4 py-2">Vorgang</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0" data-testid="protokoll-eintrag">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">
                    {e.createdAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })}
                  </td>
                  <td className="px-4 py-2 text-slate-800">{e.userName ?? "–"}</td>
                  <td className={`px-4 py-2 ${e.action === "login.fehlgeschlagen" || e.action === "patient.geloescht" ? "text-red-800" : "text-slate-800"}`}>
                    {e.summary}
                    {e.entityId && e.entityType === "Bericht" && (
                      <Link href={`/reports/${e.entityId}`} className="ml-2 text-xs text-brand-700 underline">ansehen</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <section className="card space-y-4" data-testid="sicherung">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Datensicherung</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Gesamtexport aller Praxisdaten als JSON-Datei, für Ihre eigene Sicherung und für die Rückgabe der Daten bei Vertragsende.
              Dokumentdateien laden Sie einzeln aus der Akte. Die Datenbank selbst sichert der Hoster (Neon, Frankfurt) mit Wiederherstellung auf einen Zeitpunkt;
              den Zeitraum legt der gebuchte Tarif fest.
            </p>
          </div>
          <a href="/api/settings/export" className="btn-secondary whitespace-nowrap" data-testid="gesamtexport">Gesamtexport herunterladen</a>
        </div>
      </section>

      <section className="card" data-testid="loeschfristen">
        <h2 className="font-semibold text-slate-900">Löschfristen</h2>
        <p className="mt-1 text-sm text-slate-600">Das löscht Sorrida täglich selbst:</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-1 pr-4">Daten</th><th className="py-1 pr-4">Frist</th><th className="py-1">Grund</th></tr></thead>
            <tbody>
              {LOESCHFRISTEN.map((f) => (
                <tr key={f.id} className="border-t border-slate-100 align-top"><td className="py-2 pr-4 text-slate-800">{f.daten}</td><td className="whitespace-nowrap py-2 pr-4 text-slate-800">{f.frist}</td><td className="py-2 text-slate-600">{f.grund}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-600">Nicht automatisch gelöscht wird:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">{NICHT_AUTOMATISCH.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="mt-3 text-xs text-slate-500">Die Fristen sind Vorschläge von Sorrida. Bitte mit Ihrem Datenschutzbeauftragten abstimmen.</p>
      </section>

      <p className="text-xs text-slate-500">Angezeigt werden die letzten 200 Einträge. {Object.keys(AUDIT_ACTIONS).length} Vorgangsarten werden erfasst.</p>
    </div>
  );
}
