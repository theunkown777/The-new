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
          <Behandlungsweg erreicht={5} aktuell={null} size="gross" labels={["", "", "", "", ""]} animate />
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

      {/* Eigener Aufbau: eine gemeinsame Fläche, links die Praxis (Ausgangspunkt), rechts der Patient (Empfänger),
          verbunden durch einen gestrichelten Lächelbogen "Link per SMS". */}
      <div className="relative mt-6 grid gap-10 rounded-[2.5rem] bg-white p-6 sm:p-10 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-24" data-testid="praxis-zu-patient">
      {/* Praxis: Arbeitsliste statt Tabelle */}
      <div className="flex flex-col" data-testid="seite-praxis">
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
      {/* Patient */}
      <div className="relative flex flex-col" data-testid="seite-patient">
        {/* Verbindung von der Arbeitsliste zur Patientenkarte */}
        <div className="pointer-events-none absolute -left-24 top-72 hidden w-24 xl:block" aria-hidden="true">
          <p className="font-hand -mt-8 text-center text-lg leading-none text-salbei-700">Link per SMS</p>
          <svg viewBox="0 0 100 40" className="h-10 w-24 text-salbei-500">
            <path d="M2 6 Q50 44 92 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" />
            <path d="M84 8 L94 11 L88 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-salbei-700">Für Patienten</p>
        <h3 className="font-display mt-1 text-3xl text-slate-900">Der nächste Schritt, auf dem eigenen Handy</h3>
        <p className="mt-3 text-slate-600">
          Ohne App und ohne Konto, auf Deutsch oder Englisch. Kasse zuerst, dann die Alternativen mit dem eigenen Anteil.
        </p>
        {/* Echte Handygröße: Bildschirm 375 × 812 CSS-Pixel (logische Größe eines iPhone 13 mini / X), Schrift wie im echten Patienten-Link. */}
        {/* Kein Handy-Gerät: die Patientenansicht als Sorrida-Karte in Originalgröße eines Handy-Bildschirms (375 × 812),
            mit Lächelbogen-Ausschnitt oben, gestapelt wie Briefe und mit handschriftlicher Randnotiz. */}
        <div className="relative mx-auto mt-10 w-full max-w-[375px]">
          <p className="font-hand absolute -top-9 right-0 z-10 rotate-[-4deg] text-2xl text-brand-700" aria-hidden="true">
            So sieht es Ihr Patient, in Originalgröße ↓
          </p>
          <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[2.5deg] rounded-[2rem] bg-salbei-100" aria-hidden="true" />
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[1.2deg] rounded-[2rem] bg-salbei-200/70" aria-hidden="true" />
          <div className="relative" data-testid="handy-mockup" aria-hidden="true">
          <div className="relative flex aspect-[375/812] w-full flex-col overflow-hidden rounded-[2rem] bg-[#FFFDFB] shadow-[0_24px_50px_-30px_rgba(52,72,50,.7)] ring-1 ring-salbei-200">
            {/* Lächelbogen als Ausschnitt oben */}
            <svg viewBox="0 0 375 40" className="block w-full shrink-0" aria-hidden="true">
              <path d="M0 0 H375 V8 Q187.5 46 0 8 Z" className="fill-salbei-600" />
            </svg>
            <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 pt-2">
              <div className="flex flex-col items-center gap-0.5 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/sorrida-mark.svg" alt="" className="h-8 w-8" />
                <p className="text-xs text-slate-600">Hautarztpraxis am Markt</p>
              </div>
              <div className="rounded-[1.6rem] bg-salbei-50 px-4 pb-4 pt-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-salbei-700">Ihr Behandlungsweg</p>
                <div className="mt-3"><Behandlungsweg erreicht={2} aktuell={2} size="gross" animate /></div>
                <p className="font-display mt-1 text-[1.9rem] leading-tight text-slate-900">Guten Tag, Martina</p>
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_10px_30px_-22px_rgba(52,72,50,.9)]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-salbei-700">Als Nächstes</span>
                    <span className="block text-base leading-snug text-slate-900">Ihren Vorschlag ansehen und wählen.</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-salbei-600 text-white">→</span>
                </div>
              </div>
              {[
                ["Hautkrebs-Screening", "Kassenleistung", "0 €", true, "Alle zwei Jahre ab 35 Jahren"],
                ["Auflichtmikroskopie", "Selbstzahlerleistung", "35 €", false, "Bei verdächtigen Malen zahlt die Kasse"],
              ].map(([n, art, v, sel, hint]) => (
                <div key={n as string} className={`rounded-2xl border bg-white p-3.5 ${sel ? "border-salbei-500 ring-2 ring-salbei-500" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-slate-900">{n}</p>
                      <p className="text-sm text-slate-500">{art}</p>
                    </div>
                    <b className="text-lg tabular-nums text-slate-900">{v}</b>
                  </div>
                  <p className={`mt-1.5 text-sm ${sel ? "text-salbei-700" : "text-slate-600"}`}>{hint}</p>
                </div>
              ))}
            </div>
            <div className="shrink-0 border-t border-salbei-100 bg-white px-4 pb-4 pt-3">
              <div className="flex items-baseline justify-between text-sm text-slate-600">
                Ihr Eigenanteil <b className="text-2xl tabular-nums text-slate-900">0 €</b>
              </div>
              <div className="mt-3 rounded-xl bg-salbei-600 py-3.5 text-center text-base font-semibold text-white">Diese Auswahl besprechen</div>
            </div>
          </div>
          </div>
          <p className="font-hand mt-4 text-center text-xl text-slate-600" aria-hidden="true">kommt per SMS oder QR-Code, ohne App</p>
        </div>
      </div>

      </div>
    </section>
  );
}
