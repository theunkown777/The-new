import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportTeam } from "@/lib/supportTeam";
import { SPECIALTY_LABELS } from "@/lib/specialties";
import { LeadDoneButton } from "@/components/LeadDoneButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anfragen" };

const FILTER = [
  ["offen", "Offen"],
  ["hilfe", "Hilfe"],
  ["pilot", "Pilot"],
  ["erledigt", "Erledigt"],
] as const;

// Postfach des Sorrida-Teams: Hilfe-Anfragen ("Fachrichtung nicht gefunden")
// und Pilot-Anfragen. Funktioniert auch ohne Mailversand. Nur für Konten aus
// SUPPORT_TEAM_EMAILS mit bestätigter Adresse; alle anderen sehen 404.
export default async function AnfragenPage({ searchParams }: { searchParams: { f?: string } }) {
  const session = await getServerSession(authOptions);
  if (!(await isSupportTeam(session?.user.id))) notFound();
  const f = FILTER.find(([k]) => k === searchParams.f)?.[0] ?? "offen";
  const where: Prisma.LeadWhereInput =
    f === "offen" ? { handledAt: null } : f === "erledigt" ? { handledAt: { not: null } } : { kind: f, handledAt: null };
  const [list, offen] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.lead.count({ where: { handledAt: null } }),
  ]);
  const fmt = (d: Date) => d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  return (
    <div className="space-y-6" data-testid="anfragen">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Anfragen</h1>
        <p className="mt-1 text-sm text-slate-600">Hilfe- und Pilot-Anfragen von der Website. {offen} offen. Nur für das Sorrida-Team sichtbar.</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {FILTER.map(([k, l]) => (
          <Link key={k} href={`/anfragen?f=${k}`} aria-current={k === f ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${k === f ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {list.length === 0 && <p className="card text-sm text-slate-500">Keine Anfragen in dieser Ansicht.</p>}
      <ul className="grid gap-4 xl:grid-cols-2">
        {list.map((l) => (
          <li key={l.id} className="card space-y-3" data-testid="anfrage">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.kind === "hilfe" ? "bg-sky-100 text-sky-800" : "bg-brand-100 text-brand-800"}`}>{l.kind === "hilfe" ? "Hilfe" : "Pilot"}</span>
                <p className="mt-2 font-semibold text-slate-900">{l.contactName}</p>
                <p className="text-sm text-slate-600">{l.practiceName !== "–" ? l.practiceName : "ohne Praxisangabe"}{l.specialty && l.kind !== "hilfe" ? ` · ${SPECIALTY_LABELS[l.specialty] ?? l.specialty}` : ""}</p>
              </div>
              <p className="text-xs text-slate-500">{fmt(l.createdAt)}</p>
            </div>
            <p className="text-sm">
              <span className="text-slate-500">Erreichbar: </span>
              {l.contact.includes("@") ? <a className="text-brand-700 underline" href={`mailto:${l.contact}`}>{l.contact}</a> : <a className="text-brand-700 underline" href={`tel:${l.contact.replace(/[^\d+]/g, "")}`}>{l.contact}</a>}
              {l.callbackTime && <span className="text-slate-500"> · Rückruf {l.callbackTime}</span>}
              {l.pvs && <span className="text-slate-500"> · {l.pvs}</span>}
              {l.kind !== "hilfe" && <span className="text-slate-500"> · {l.dentists} Behandler</span>}
            </p>
            {l.message && <p className="whitespace-pre-wrap rounded-xl bg-[#FBFAF8] p-3 text-sm text-slate-700">{l.message}</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{l.handledAt ? `erledigt am ${fmt(l.handledAt)}` : "offen"}</span>
              <LeadDoneButton id={l.id} done={!!l.handledAt} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
