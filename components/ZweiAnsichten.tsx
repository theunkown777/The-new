// Zwei Ansichten, ein System: Patienten-Link auf dem Handy und die Praxis-App
// am Bildschirm. Als HTML nachgebaut (keine Bilder), damit es scharf bleibt
// und die Inhalte zum echten Produkt passen.

const ZEILEN: [string, string, string, string, string][] = [
  ["Weber, Martina", "31.10.2026 09:12", "12.03.1980", "Rückmeldung", "bg-emerald-100 text-emerald-800"],
  ["Yılmaz, Elif", "31.10.2026 08:47", "04.07.1991", "Anamnese neu", "bg-sky-100 text-sky-800"],
  ["Schulz, Peter", "30.10.2026 17:20", "22.09.1968", "Link ungeöffnet", "bg-orange-100 text-orange-800"],
  ["Nowak, Piotr", "30.10.2026 15:03", "18.02.1955", "Vorschlag offen", "bg-amber-100 text-amber-800"],
  ["Krüger, Anna", "30.10.2026 11:41", "02.04.1975", "Angenommen", "bg-slate-100 text-slate-600"],
  ["Haddad, Omar", "29.10.2026 16:28", "30.06.1978", "Neuer Patient", "bg-brand-100 text-brand-800"],
  ["Fischer, Ingrid", "29.10.2026 10:05", "11.11.1949", "Vorschlag offen", "bg-amber-100 text-amber-800"],
  ["Demir, Can", "29.10.2026 09:14", "15.05.1987", "Rückmeldung", "bg-emerald-100 text-emerald-800"],
  ["Lange, Sabine", "28.10.2026 14:52", "27.08.1962", "Anamnese neu", "bg-sky-100 text-sky-800"],
  ["Rossi, Giulia", "28.10.2026 11:30", "09.01.2001", "Neuer Patient", "bg-brand-100 text-brand-800"],
];

export function ZweiAnsichten() {
  return (
    <section className="mt-20 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]" aria-labelledby="ansichten" data-testid="zwei-ansichten">
      <h2 id="ansichten" className="sr-only">
        Patientenansicht und Praxisansicht
      </h2>

      {/* Patient */}
      <div className="flex flex-col overflow-hidden rounded-3xl bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-brand-700">Für Patienten</p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Der Vorschlag auf dem Handy</h3>
        <p className="mt-3 text-slate-600">
          Ohne App und ohne Konto: Optionen vergleichen, den eigenen Anteil sehen und mit einem Tipp zurückmelden. Auf Deutsch oder
          Englisch.
        </p>
        <div className="mx-auto mt-8 w-full max-w-[290px] translate-y-6 rounded-[2.4rem] border-[9px] border-slate-900 bg-[#F5F2EE] shadow-xl">
          <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-slate-900" />
          <div className="space-y-3 p-4 pb-0">
            <p className="text-[11px] font-semibold text-brand-700">Hautarztpraxis am Markt</p>
            <p className="text-lg font-semibold leading-tight text-slate-900">Hallo Martina</p>
            <p className="text-xs text-slate-500">Ihr Vorschlag: Hautkrebs-Früherkennung</p>
            {[
              ["Hautkrebs-Screening", "Kasse", true],
              ["Auflichtmikroskopie", "35 €", false],
              ["Videodermatoskopie", "90 €", false],
            ].map(([n, v, sel]) => (
              <div key={n as string} className={`flex justify-between rounded-xl border bg-white px-3 py-2 text-xs ${sel ? "border-brand-600 ring-1 ring-brand-600" : "border-slate-200"}`}>
                <span className="text-slate-800">{n}</span>
                <b className="tabular-nums text-slate-900">{v}</b>
              </div>
            ))}
            <p className="text-[10px] leading-snug text-emerald-800">Kasse zahlt: bei verdächtigen Malen auch die Auflichtmikroskopie.</p>
            <div className="rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white">Diese Auswahl besprechen</div>
            <div className="flex items-baseline justify-between border-t border-slate-200 py-3 text-[11px] text-slate-500">
              Ihr Eigenanteil <b className="text-base text-slate-900">0 €</b>
            </div>
          </div>
        </div>
      </div>

      {/* Praxis */}
      <div className="flex flex-col overflow-hidden rounded-3xl bg-white p-6 sm:p-10">
        <p className="text-sm font-semibold text-brand-700">Für die Praxis</p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Alle Patienten und Vorgänge an einem Ort</h3>
        <p className="mt-3 max-w-2xl text-slate-600">
          Wer hat sich zurückgemeldet, wer hat den Link noch nicht geöffnet, wo ist die Anamnese neu? Der Status steht in jeder Zeile, die
          nächsten Schritte rechts daneben.
        </p>
        <div className="mt-auto hidden pt-8 sm:block" aria-hidden="true">
        <div className="overflow-hidden rounded-2xl border-[10px] border-slate-900 bg-white shadow-xl">
          <div className="grid grid-cols-[8.5rem_minmax(0,1fr)_10rem] text-[10px]">
            <div className="border-r border-slate-100 bg-white p-3">
              <p className="font-brand mb-3 text-[11px] text-brand-700">SORRIDA</p>
              {["Übersicht", "Patienten", "Vorschläge", "Abschließen", "Einstellungen"].map((n) => (
                <p key={n} className={`mb-1 rounded-md px-2 py-1 ${n === "Patienten" ? "bg-brand-600 text-white" : "text-slate-600"}`}>
                  {n}
                </p>
              ))}
            </div>
            <div className="min-w-0 bg-[#FBFAF8] p-3">
              <div className="mb-2 flex gap-1.5">
                {["Alle", "Offen", "Rückmeldung"].map((f, i) => (
                  <span key={f} className={`rounded-full px-2 py-0.5 ${i === 0 ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}>
                    {f}
                  </span>
                ))}
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-slate-400">Suche nach Name</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[8px] uppercase tracking-wider text-slate-400">
                    <th className="py-1 font-semibold">Patient</th>
                    <th className="py-1 font-semibold">Letzte Änderung</th>
                    <th className="hidden py-1 font-semibold md:table-cell">Geburtsdatum</th>
                    <th className="py-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ZEILEN.map(([n, d, g, s, c]) => (
                    <tr key={n} className={`border-t border-slate-100 ${n.startsWith("Weber") ? "bg-brand-50" : ""}`}>
                      <td className="py-1.5 text-slate-800">{n}</td>
                      <td className="py-1.5 tabular-nums text-slate-500">{d}</td>
                      <td className="hidden py-1.5 tabular-nums text-slate-500 md:table-cell">{g}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 ${c}`}>{s}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-l border-slate-100 bg-white p-3">
              <p className="mb-2 font-semibold text-slate-900">Weber, Martina</p>
              <div className="grid grid-cols-2 gap-1 text-center text-[9px]">
                <span className="rounded-md bg-brand-600 py-2 text-white">Abschließen</span>
                <span className="rounded-md bg-brand-50 py-2 text-brand-800">Vorschlag</span>
                <span className="rounded-md bg-brand-50 py-2 text-brand-800">Anamnese</span>
                <span className="rounded-md bg-brand-50 py-2 text-brand-800">Link</span>
              </div>
              <p className="mt-3 text-[8px] uppercase tracking-wider text-slate-400">Persönliche Daten</p>
              <p className="mt-1 text-slate-600">12.03.1980 (46)</p>
              <p className="text-slate-600">Techniker Krankenkasse</p>
              <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">Möchte besprechen: Auflicht</p>
            </div>
          </div>
        </div>
        <div className="mx-auto h-10 w-28 bg-gradient-to-b from-slate-300 to-slate-200" />
        <div className="mx-auto h-2 w-48 rounded-t-lg bg-slate-300" />
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-slate-600 sm:hidden">
          <li>Status je Patient: Rückmeldung, Link ungeöffnet, Anamnese neu</li>
          <li>Rechts die nächsten Schritte mit einem Klick</li>
        </ul>
      </div>
    </section>
  );
}
