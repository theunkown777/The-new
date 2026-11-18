import Link from "next/link";
import { EINGANG_ARTEN, eingangAnfragen } from "@/lib/eingang";
import { praxisFach } from "@/lib/katalogScope";
import { fachprofil } from "@/lib/fachprofile";

const zeit = (d: Date) => d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/**
 * Eingang: offene Online-Anfragen neuer Patienten (Buchungsseite /t/<kennung>). Eigene Karte, weil es
 * zu einer Anfrage noch keinen Patienten gibt. Bestätigt oder abgelehnt wird unter Termine; danach
 * verschwindet die Zeile von selbst. Einbau in app/(app)/eingang/page.tsx: <EingangAnfragen practiceId={practiceId} />
 */
export async function EingangAnfragen({ practiceId }: { practiceId: string }) {
  const anfragen = await eingangAnfragen(practiceId);
  if (anfragen.length === 0) return null;
  const a = EINGANG_ARTEN.TERMINANFRAGE;
  const P = fachprofil(await praxisFach(practiceId)).person;
  return (
    <section className="card mt-5 p-0" data-testid="eingang-anfragen">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Online-Anfragen neuer {P.pl} ({anfragen.length})</h2>
      <ul className="divide-y divide-slate-100">
        {anfragen.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4" data-testid="eingang-anfrage">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{a.gruppe}</span>
                <span className="font-medium text-slate-900">{a.titel}</span>
                <span className="text-xs text-slate-500">{zeit(e.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-700"><span className="font-medium">{e.name}</span><span className="text-slate-500"> · {e.hinweis}</span></p>
              <p className="mt-0.5 text-xs text-slate-500">{a.tun}</p>
            </div>
            <Link href={e.ziel} className="btn btn-primary shrink-0" data-testid="eingang-anfrage-ziel">Öffnen</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
