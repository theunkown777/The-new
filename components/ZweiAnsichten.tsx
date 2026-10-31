import { Behandlungsweg, Laechelbogen } from "@/components/Behandlungsweg";

// "Ein Weg, zwei Seiten": Sorridas eigener Aufbau. Oben der Behandlungsweg
// mit dem, was Praxis und Patient an jeder Station tun. Links das Portal auf
// einem Handy in echter Größe, rechts die Arbeitsliste der Praxis mit dem
// nächsten Schritt je Patient.

const STATIONEN_TEXT: [string, string, string][] = [
  ["Gespräch", "Befund oder Anlass wählen, ein Klick", "Hört zu, fragt nach"],
  ["Vorschlag", "Kasse zuerst, Alternativen begründet, Link per SMS", "Bekommt den Link aufs Handy"],
  ["Entscheidung", "Sieht Rückmeldung und Wunsch nach Raten", "Vergleicht zu Hause, tippt eine Antwort"],
  ["Vereinbart", "Vereinbarung und Rechnung mit einem Klick", "Weiß vorher, was die Kasse zahlt"],
  ["Bezahlt", "Eingang bestätigen, nichts abtippen", "Zahlt per GiroCode, ohne Konto"],
];

const LISTE: [string, number, number, string, "aktiv" | "achtung" | "warten" | "erledigt"][] = [
  ["Weber, Martina", 3, 3, "Rückruf gewünscht: heute anrufen", "achtung"],
  ["Yılmaz, Elif", 0, 0, "Anamnese liegt vor: Vorschlag erstellen", "aktiv"],
  ["Schulz, Peter", 2, 2, "Link seit Tagen ungeöffnet: kurz anrufen", "achtung"],
  ["Nowak, Piotr", 2, 2, "Vorschlag angesehen: Rückmeldung abwarten", "warten"],
  ["Krüger, Anna", 4, 4, "Vereinbart: Rechnung erstellen", "aktiv"],
  ["Haddad, Omar", 5, -1, "Abgeschlossen", "erledigt"],
];
const TONE = { aktiv: "text-brand-700", achtung: "text-red-700", warten: "text-slate-600", erledigt: "text-salbei-700" };

export function ZweiAnsichten() {
  return (
    <section className="mt-20" aria-labelledby="ansichten" data-testid="zwei-ansichten">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-700"><Laechelbogen className="h-2 w-8" />Der Behandlungsweg</p>
        <h2 id="ansichten" className="font-display mt-1 text-4xl leading-tight text-slate-900 sm:text-5xl">Ein Weg, zwei Seiten.</h2>
        <p className="mt-3 text-lg text-slate-600">
          Praxis und Patient sehen denselben Weg vom Gespräch bis zur Zahlung. Jeder mit seinem nächsten Schritt, nichts geht verloren.
        </p>
      </div>

      {/* Fünf Stationen auf dem Lächelbogen */}
      <div className="mt-8 rounded-3xl bg-white p-5 sm:p-8" data-testid="weg-band">
        <div className="mx-auto hidden max-w-2xl md:block">
          <Behandlungsweg erreicht={5} aktuell={null} size="gross" labels={["", "", "", "", ""]} />
        </div>
        <ol className="grid gap-4 md:mt-2 md:grid-cols-5">
          {STATIONEN_TEXT.map(([name, praxis, patient], i) => (
            <li key={name} className="rounded-2xl bg-[#F5F2EE] p-4">
              <p className="font-display text-2xl text-slate-900"><span className="text-brand-600">{i + 1}</span> {name}</p>
              <p className="mt-2 text-sm text-slate-700"><b className="text-brand-700">Praxis:</b> {praxis}</p>
              <p className="mt-1 text-sm text-slate-700"><b className="text-salbei-700">Patient:</b> {patient}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(31rem,5fr)_minmax(0,8fr)]">
      {/* Patient */}
      <div className="flex flex-col overflow-hidden rounded-3xl bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-salbei-700">Für Patienten</p>
        <h3 className="font-display mt-1 text-3xl text-slate-900">Der nächste Schritt, auf dem eigenen Handy</h3>
        <p className="mt-3 text-slate-600">
          Ohne App und ohne Konto, auf Deutsch oder Englisch. Kasse zuerst, dann die Alternativen mit dem eigenen Anteil.
        </p>
        {/* Echte Handygröße: Bildschirm 375 × 812 CSS-Pixel (logische Größe eines iPhone 13 mini / X), Schrift wie im echten Patienten-Link. */}
        <div
          className="mx-auto mt-8 w-full max-w-[399px] rounded-[3.2rem] border-[12px] border-slate-900 bg-slate-900 shadow-2xl"
          data-testid="handy-mockup"
          aria-hidden="true"
        >
          <div className="relative flex aspect-[375/812] w-full flex-col overflow-hidden rounded-[2.5rem] bg-[#F5F2EE]">
            {/* Statusleiste mit Kameraaussparung */}
            <div className="relative flex h-11 shrink-0 items-center justify-between px-7 text-[15px] font-semibold text-slate-900">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2.5 h-7 w-28 -translate-x-1/2 rounded-full bg-slate-900" />
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2" width="3" height="10" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <span className="inline-block h-3 w-6 rounded-[4px] border border-slate-900 p-[1.5px]"><span className="block h-full w-4/5 rounded-[2px] bg-slate-900" /></span>
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 pt-3">
              <p className="text-sm font-medium text-brand-700">Hautarztpraxis am Markt</p>
              <div>
                <p className="font-display text-[2rem] leading-tight text-slate-900">Guten Tag, Martina</p>
                <p className="mt-1 text-base text-slate-700"><b className="text-brand-700">Als Nächstes:</b> Ihren Vorschlag ansehen und wählen.</p>
              </div>
              <Behandlungsweg erreicht={2} aktuell={2} size="gross" />
              {[
                ["Hautkrebs-Screening", "Kassenleistung", "0 €", true, "Alle zwei Jahre ab 35 Jahren"],
                ["Auflichtmikroskopie", "Selbstzahlerleistung", "35 €", false, "Bei verdächtigen Malen zahlt die Kasse"],
                ["Videodermatoskopie", "Selbstzahlerleistung", "90 €", false, "Ohne Verdacht ist ein Zusatznutzen nicht belegt"],
              ].map(([n, art, v, sel, hint]) => (
                <div key={n as string} className={`rounded-2xl border bg-white p-4 ${sel ? "border-brand-600 ring-2 ring-brand-600" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-slate-900">{n}</p>
                      <p className="text-sm text-slate-500">{art}</p>
                    </div>
                    <b className="text-lg tabular-nums text-slate-900">{v}</b>
                  </div>
                  <p className={`mt-2 text-sm ${sel ? "text-emerald-800" : "text-slate-600"}`}>{hint}</p>
                </div>
              ))}
            </div>
            {/* Fester Bereich unten wie im echten Patienten-Link */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-2 pt-3">
              <div className="flex items-baseline justify-between text-sm text-slate-600">
                Ihr Eigenanteil <b className="text-2xl tabular-nums text-slate-900">0 €</b>
              </div>
              <div className="mt-3 rounded-xl bg-brand-600 py-3.5 text-center text-base font-semibold text-white">Diese Auswahl besprechen</div>
              <div className="mx-auto mt-3 h-[5px] w-[134px] rounded-full bg-slate-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Praxis: Arbeitsliste statt Tabelle */}
      <div className="flex flex-col rounded-3xl bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-brand-700">Für die Praxis</p>
        <h3 className="font-display mt-1 text-3xl text-slate-900">Heute: wer als Nächstes dran ist</h3>
        <p className="mt-3 max-w-2xl text-slate-600">
          Keine Spalten voller Zustände. Jeder Patient steht auf seinem Weg, daneben steht, was jetzt zu tun ist. Rot heißt: heute.
        </p>
        <ul className="mt-6 space-y-2" aria-hidden="true">
          {LISTE.map(([name, erreicht, aktuell, text, tone]) => (
            <li key={name} className="grid items-center gap-x-4 gap-y-1 rounded-2xl bg-[#F5F2EE] px-4 py-3 sm:grid-cols-[minmax(0,11rem)_7.5rem_minmax(0,1fr)]">
              <span className="flex items-center gap-3">
                <span className="font-display grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-brand-700">{name.charAt(0)}</span>
                <span className="font-medium text-slate-900">{name}</span>
              </span>
              <Behandlungsweg erreicht={erreicht} aktuell={aktuell < 0 ? null : aktuell} className="hidden sm:block" />
              <span className={`text-sm ${TONE[tone]}`}>{tone === "achtung" && "● "}{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-6 text-sm text-slate-500">Aus der Demo-Praxis: erfundene Beispielpatienten.</p>
      </div>
      </div>
    </section>
  );
}
