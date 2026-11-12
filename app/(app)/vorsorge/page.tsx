import { fachprofil } from "@/lib/fachprofile";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageFromBirthDate } from "@/lib/proposals";
import { loadRecallDue } from "@/lib/recallLoad";
import { specialty } from "@/lib/specialties";
import { Laechelbogen } from "@/components/Behandlungsweg";
import { RecallButton } from "@/components/RecallButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vorsorge fällig" };

// Vorsorge, die die Kasse bezahlt und die fällig ist. Kasse zuerst: Hier
// geht es um Kassenleistungen, die Patienten sonst vergessen.
export default async function VorsorgePage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const { practice, fach, rules, due, now } = await loadRecallDue(practiceId);
  const shown = due.slice(0, 60);
  const fmt = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6" data-testid="vorsorge">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Vorsorge fällig</h1>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
          <Laechelbogen className="h-2 w-8 text-salbei-600" />
          Kassenleistungen, an die Ihre {fachprofil(fach).person.pl} erinnert werden möchten. Kasse zuerst, auch hier.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="card text-sm text-slate-600">
          Für {specialty(fach)?.name ?? "Ihr Fach"} gibt es noch keine regelmäßige Kassen-Vorsorge in Sorrida. Schreiben Sie uns, welche Erinnerung Sie brauchen:{" "}
          <Link href="/hilfe" className="text-brand-700 underline">Hilfe</Link>.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {rules.map((r) => (
              <div key={r.leistung} className="rounded-3xl bg-salbei-50 p-5">
                <p className="font-display text-2xl text-slate-900">{r.leistung}</p>
                <p className="mt-1 text-sm text-slate-700">{r.hinweis}</p>
              </div>
            ))}
            <div className="rounded-3xl bg-white p-5">
              <p className="text-sm text-slate-500">Jetzt oder in 14 Tagen fällig</p>
              <p className="font-display text-4xl text-slate-900" data-testid="vorsorge-anzahl">{due.length.toLocaleString("de-DE")}</p>
            </div>
          </div>

          {due.length === 0 ? (
            <p className="card text-sm text-slate-600">Gerade ist niemand fällig.</p>
          ) : (
            <ul className="space-y-2" data-testid="vorsorge-liste">
              {shown.map(({ p, r, letzter }) => (
                <li key={p.id} className="grid items-center gap-3 rounded-2xl bg-white px-4 py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
                  <Link href={`/patients?sel=${p.id}`} className="flex min-w-0 items-center gap-3">
                    <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F5F2EE] text-lg text-brand-700">{p.lastName.charAt(0)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{p.lastName}, {p.firstName}</span>
                      <span className="block text-xs text-slate-500">{ageFromBirthDate(p.birthDate) ?? "–"} J. · zuletzt {fmt(letzter)}</span>
                    </span>
                  </Link>
                  <span className="text-sm">
                    <b className="text-salbei-700">{r.leistung}</b>
                    <span className={r.tage > 30 ? " text-red-700" : " text-slate-600"}>
                      {" "}· {r.tage >= 0 ? `fällig seit ${r.tage} Tagen` : `fällig am ${fmt(r.faellig)}`}
                    </span>
                    {p.recallSentAt && <span className="text-slate-500"> · zuletzt erinnert {fmt(p.recallSentAt)}</span>}
                  </span>
                  <RecallButton patientId={p.id} firstName={p.firstName} practiceName={practice?.name ?? ""} leistung={r.leistung} hinweis={r.hinweis} />
                </li>
              ))}
            </ul>
          )}
          {due.length > shown.length && <p className="text-sm text-slate-500">Die {shown.length} am längsten Fälligen sind gezeigt.</p>}
        </>
      )}
    </div>
  );
}
