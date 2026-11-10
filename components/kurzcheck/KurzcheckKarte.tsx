import { kurzcheckLesen, kurzcheckText, staerkeWort } from "@/lib/kurzcheck";
import { KoerperFigur, ZahnBogen } from "./Figur";

/** Akte: der zuletzt ausgefüllte Kurz-Fragebogen des Patienten mit Bild, Stärke und den Antworten in Sätzen. */
export function KurzcheckKarte({ eintraege }: { eintraege: { id: string; antworten: unknown; createdAt: Date }[] }) {
  const liste = eintraege.map((e) => ({ ...e, a: kurzcheckLesen(e.antworten) })).filter((e) => e.a);
  const zeit = (d: Date) => d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return (
    <section id="kurzcheck" className="card scroll-mt-4" data-testid="kurzcheck-karte">
      <h2 className="font-semibold text-slate-900">Kurz-Fragebogen vor dem Termin</h2>
      {liste.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600">Noch nicht ausgefüllt. Der Patient findet die fünf Fragen in seinem Patientenlink unter „Vor Ihrem Termin“.</p>
      ) : (
        liste.slice(0, 1).map((e) => {
          const a = e.a!;
          const farbe = (a.staerke ?? 0) <= 3 ? "bg-emerald-600" : (a.staerke ?? 0) <= 6 ? "bg-amber-500" : (a.staerke ?? 0) <= 8 ? "bg-orange-600" : "bg-rose-700";
          return (
            <div key={e.id} className="mt-3 flex flex-col gap-4 sm:flex-row">
              {!a.keine && (
                <div className="flex shrink-0 justify-center gap-2 rounded-2xl bg-[#FBF7F1] p-2 ring-1 ring-[#E9E2DA]">
                  {a.art === "zahn" ? <ZahnBogen gewaehlt={a.orte} klein /> : (
                    <>
                      {a.orte.some((o) => !/^(nacken|ruecken|gesaess|wade)/.test(o)) && <KoerperFigur ansicht="vorn" gewaehlt={a.orte} klein />}
                      {a.orte.some((o) => /^(nacken|ruecken|gesaess|wade)/.test(o)) && <KoerperFigur ansicht="hinten" gewaehlt={a.orte} klein />}
                    </>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-xs text-slate-500">Vom Patienten ausgefüllt am {zeit(e.createdAt)}</p>
                {!a.keine && a.staerke !== null && (
                  <div className="mt-2" aria-label={`Stärke ${a.staerke} von 10`}>
                    <div className="flex items-baseline justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stärke</span><span className="font-medium tabular-nums text-slate-900" data-testid="kurzcheck-staerke">{a.staerke} von 10 · {staerkeWort(a.staerke)}</span></div>
                    <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className={`h-2.5 rounded-full ${farbe}`} style={{ width: `${Math.max(4, a.staerke * 10)}%` }} /></div>
                  </div>
                )}
                <ul className="mt-3 space-y-1 text-slate-800" data-testid="kurzcheck-antworten">{kurzcheckText(a).map((z) => <li key={z}>{z}</li>)}</ul>
                <p className="mt-3 text-xs text-slate-500">Angaben des Patienten, keine Diagnose.{liste.length > 1 ? ` Frühere Fragebögen: ${liste.slice(1, 4).map((x) => zeit(x.createdAt)).join(" · ")}` : ""}</p>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
