import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadBillingCheck } from "@/lib/billingCheckLoad";
import { ART_TITEL, type BefundArt } from "@/lib/billingCheck";
import { formatCent } from "@/lib/invoices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abrechnungsprüfung" };

const REIHENFOLGE: BefundArt[] = ["ohne_rechnung", "ohne_doku", "faktor", "ausschluss", "frequenz"];

export default async function AbrechnungsPruefungPage() {
  const session = await getServerSession(authOptions);
  const befunde = await loadBillingCheck(session!.user.practiceId);
  const offenCent = befunde.reduce((a, b) => a + (b.betragCent ?? 0), 0);
  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="abrechnungspruefung">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Abrechnungsprüfung</h1>
        <p className="mt-1 text-sm text-slate-600">
          Was in den letzten zwölf Monaten nicht abgerechnet oder fehlerhaft erfasst wurde. Grundlage sind Termine, Berichte, Vorschläge und Rechnungen in Sorrida
          sowie die Regeln Ihres Leistungskatalogs. Die Prüfung ersetzt nicht die Prüfung durch Praxissoftware oder KZV/KV, fängt aber typische Lücken vorher ab.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-slate-500">Hinweise</p><p className="mt-1 text-2xl font-semibold tabular-nums">{befunde.length}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Nicht in Rechnung gestellt</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatCent(offenCent)}</p><p className="mt-1 text-xs text-slate-500">aus angenommenen Vorschlägen</p></div>
        <div className="card"><p className="text-sm text-slate-500">Termine ohne Dokumentation</p><p className="mt-1 text-2xl font-semibold tabular-nums">{befunde.filter((b) => b.art === "ohne_doku").length}</p></div>
      </div>
      {befunde.length === 0 && <p className="card text-sm text-slate-600">Keine Auffälligkeiten gefunden.</p>}
      {REIHENFOLGE.map((art) => {
        const list = befunde.filter((b) => b.art === art);
        if (!list.length) return null;
        return (
          <section key={art} className="space-y-2" data-testid={`pruefung-${art}`}>
            <h2 className="font-semibold text-slate-900">{ART_TITEL[art]} <span className="text-sm font-normal text-slate-500">({list.length})</span></h2>
            <div className="card divide-y divide-slate-100 p-0">
              {list.slice(0, 50).map((b, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <p className="min-w-0 flex-1 basis-full text-slate-800 sm:basis-0">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${b.schwere === "hoch" ? "bg-red-600" : "bg-amber-500"}`} aria-hidden="true" />
                    {b.text}
                  </p>
                  <Link href={b.href} className="btn-secondary whitespace-nowrap text-sm">Prüfen</Link>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
