import { Behandlungsweg } from "@/components/Behandlungsweg";

// Die echte Patientenansicht (Behandlungsweg im Patientenlink), in Originalgröße eines Handy-Bildschirms
// (375 × 812), als Blatt auf dem Tisch. Salbei, weil sie dem Patienten gehört.
export function PatientenKarte() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute inset-0 translate-x-5 translate-y-4 rotate-[4deg] rounded-[1.6rem] bg-salbei-200/70" aria-hidden="true" />
      <div className="absolute inset-0 translate-x-2.5 translate-y-2 rotate-[1.8deg] rounded-[1.6rem] bg-salbei-100" aria-hidden="true" />
      <div className="relative" data-testid="handy-mockup" aria-hidden="true">
        <div className="j-blatt relative flex aspect-[375/812] w-full flex-col overflow-hidden rounded-[1.6rem] bg-[#FFFDFB] ring-1 ring-salbei-200">
          <svg viewBox="0 0 375 40" className="block w-full shrink-0">
            <path d="M0 0 H375 V8 Q187.5 46 0 8 Z" className="fill-salbei-600" />
          </svg>
          <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 pt-1">
            <div className="flex flex-col items-center gap-0.5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/sorrida-mark.webp" alt="" className="h-7 w-7" />
              <p className="text-[11px] text-slate-600">Hautarztpraxis am Markt</p>
            </div>
            <div className="rounded-[1.3rem] bg-salbei-50 px-4 pb-4 pt-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-salbei-700">Ihr Behandlungsweg</p>
              <div className="mt-2"><Behandlungsweg erreicht={2} aktuell={2} size="gross" animate /></div>
              <p className="font-display mt-1 text-[1.7rem] leading-tight text-slate-900">Guten Tag, Martina</p>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_10px_30px_-22px_rgba(52,72,50,.9)]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-salbei-700">Als Nächstes</span>
                  <span className="block text-[15px] leading-snug text-slate-900">Ihren Vorschlag ansehen und wählen.</span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-salbei-600 text-white">→</span>
              </div>
            </div>
            {[
              ["Hautkrebs-Screening", "Kassenleistung", "0 €", true, "Alle zwei Jahre ab 35 Jahren"],
              ["Auflichtmikroskopie", "Selbstzahlerleistung", "35 €", false, "Bei verdächtigen Malen zahlt die Kasse"],
            ].map(([n, art, v, sel, hint]) => (
              <div key={n as string} className={`rounded-2xl border bg-white p-3 ${sel ? "border-salbei-500 ring-2 ring-salbei-500" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium text-slate-900">{n}</p>
                    <p className="text-[13px] text-slate-500">{art}</p>
                  </div>
                  <b className="text-base tabular-nums text-slate-900">{v}</b>
                </div>
                <p className={`mt-1 text-[13px] ${sel ? "text-salbei-700" : "text-slate-600"}`}>{hint}</p>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-salbei-100 bg-white px-4 pb-4 pt-3">
            <div className="flex items-baseline justify-between text-[13px] text-slate-600">
              Ihr Eigenanteil <b className="text-xl tabular-nums text-slate-900">0 €</b>
            </div>
            <div className="mt-2.5 rounded-xl bg-salbei-600 py-3 text-center text-[15px] font-semibold text-white">Diese Auswahl besprechen</div>
          </div>
        </div>
      </div>
    </div>
  );
}
