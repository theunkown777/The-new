import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportTeam } from "@/lib/supportTeam";
import { FEHLER_GRENZE_24H } from "@/lib/fehlerlog";
import { FehlerErledigtButton } from "@/components/FehlerErledigtButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Betrieb" };

const TAGE = 14;
const FILTER = [
  ["offen", "Offen"],
  ["erledigt", "Erledigt"],
] as const;

// Fehler aus dem Betrieb (Server und Browser) der letzten 14 Tage. Nur für Konten aus
// SUPPORT_TEAM_EMAILS mit bestätigter Adresse; alle anderen sehen 404.
// Die Einträge sind vor dem Speichern bereinigt (lib/fehlerlog.ts): keine Namen, Adressen, Nummern oder Tokens.
export default async function BetriebPage(props: { searchParams: Promise<{ f?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!(await isSupportTeam(session?.user.id))) notFound();
  const f = FILTER.find(([k]) => k === searchParams.f)?.[0] ?? "offen";
  const seit = new Date(Date.now() - TAGE * 864e5);
  const where: Prisma.FehlerEintragWhereInput = { zuletztAt: { gte: seit }, erledigtAt: f === "erledigt" ? { not: null } : null };
  const [list, offen, tag] = await Promise.all([
    prisma.fehlerEintrag.findMany({ where, orderBy: { zuletztAt: "desc" }, take: 200 }),
    prisma.fehlerEintrag.count({ where: { zuletztAt: { gte: seit }, erledigtAt: null } }),
    prisma.fehlerEintrag.count({ where: { zuletztAt: { gte: new Date(Date.now() - 864e5) } } }),
  ]);
  const fmt = (d: Date) => d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  return (
    <div className="space-y-6" data-testid="betrieb">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Betrieb</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fehler der letzten {TAGE} Tage aus Server und Browser. <span data-testid="betrieb-offen">{offen}</span> offen, <span data-testid="betrieb-24h">{tag}</span> verschiedene in den letzten 24 Stunden
          (Grenze im Statusbericht: {FEHLER_GRENZE_24H}). Nur für das Sorrida-Team sichtbar.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Die Einträge enthalten keine Patientendaten: Ort ohne Abfrage-Teil und Token, Meldung gekürzt und bereinigt. Gelöscht 30 Tage nach dem letzten Auftreten.
        </p>
        <p className="mt-1 text-sm"><Link href="/anfragen" className="text-brand-700 underline">Zu den Anfragen</Link></p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Ansicht">
        {FILTER.map(([k, l]) => (
          <Link key={k} href={`/betrieb?f=${k}`} aria-current={k === f ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${k === f ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {list.length === 0 && <p className="card text-sm text-slate-500" data-testid="betrieb-leer">Keine Einträge in dieser Ansicht.</p>}
      <ul className="grid gap-4 xl:grid-cols-2">
        {list.map((e) => (
          <li key={e.id} className="card space-y-3" data-testid="fehler-eintrag">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.quelle === "browser" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-800"}`}>{e.quelle === "browser" ? "Browser" : "Server"}</span>
                <p className="mt-2 break-words font-mono text-sm font-semibold text-slate-900" data-testid="fehler-ort">{e.ort}</p>
              </div>
              <p className="rounded-full bg-white px-2 py-0.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-200" data-testid="fehler-zaehler" aria-label={`${e.zaehler} mal aufgetreten`}>{e.zaehler}×</p>
            </div>
            <p className="break-words text-sm text-slate-700" data-testid="fehler-meldung">{e.meldung}</p>
            {e.stack && <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-600">{e.stack}</pre>}
            <dl className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div><dt>Zuerst</dt><dd className="text-slate-700">{fmt(e.createdAt)}</dd></div>
              <div><dt>Zuletzt</dt><dd className="text-slate-700">{fmt(e.zuletztAt)}</dd></div>
              {e.practiceId && <div className="col-span-2"><dt>Praxis (nur ID)</dt><dd className="break-all font-mono text-slate-700">{e.practiceId}</dd></div>}
            </dl>
            <FehlerErledigtButton id={e.id} erledigt={!!e.erledigtAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}
