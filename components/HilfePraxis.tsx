"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HILFE_WISSEN, hilfeHinweis, type HilfeArt, type HilfeEintrag, type HinweisArt } from "@/lib/hilfeWissen";
import { hilfeText, sichtbareHilfe, sucheHilfe } from "@/lib/hilfeSuche";
import { seiteErlaubt, zeigZiel } from "@/lib/hilfeZeiger";
import type { MenueRechte } from "@/lib/rollen";
import { hilfeZeigen } from "@/components/HilfeZeiger";

interface KiAntwort { passt: boolean; antwort: string; quellen: { id: string; frage: string; pfad: string; href: string }[] }

const GRUPPEN: [HilfeArt, string][] = [
  ["bedienung", "Bedienung"],
  ["praxismanager", "Praxismanager"],
  ["fehler", "Meldungen der App"],
];

/**
 * „Frag Sorrida“ als Seite: dieselbe Suche wie im Chat (lib/hilfeSuche.ts), gefiltert nach Fach und Rechten,
 * mit „Zeig mir wo“. Mit eingeschalteten KI-Hilfen zusätzlich eine Antwort als Entwurf.
 */
export function HilfePraxis({ fach, hinweisArt, ki, rechte, personPl = "Patienten", abschluss = "Behandlung" }: { fach: "zahn" | "andere"; hinweisArt?: HinweisArt; ki: boolean; rechte?: MenueRechte; personPl?: string; abschluss?: string }) {
  const pfad = usePathname() ?? "/hilfe-praxis";
  const [frage, setFrage] = useState("");
  const [kiAntwort, setKiAntwort] = useState<KiAntwort | null>(null);
  const [kiLaeuft, setKiLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const woerter = { personPl, abschluss };

  const treffer = useMemo(() => sucheHilfe(frage, HILFE_WISSEN, { anzahl: 3, fach, rechte }), [frage, fach, rechte]);
  const alle = useMemo(() => sichtbareHilfe(HILFE_WISSEN, { fach, rechte }), [fach, rechte]);
  const gefragt = frage.trim().length >= 3;

  async function mitKi() {
    setKiLaeuft(true);
    setFehler(null);
    setKiAntwort(null);
    const res = await fetch("/api/ki/hilfe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frage }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setKiLaeuft(false);
    if (!res?.ok || typeof d?.passt !== "boolean") return setFehler(d?.error ?? "Die Antwort mit KI hat nicht geklappt. Die Einträge unten stehen weiter bereit.");
    setKiAntwort({ passt: d.passt, antwort: String(d.antwort ?? ""), quellen: Array.isArray(d.quellen) ? d.quellen : [] });
  }

  const zeigKnopf = (e: Pick<HilfeEintrag, "anker" | "href" | "pfad">) => {
    const z = zeigZiel(e, { pfad, rechte, fach });
    if (!z) return null;
    return (
      <button
        type="button"
        className="font-medium text-brand-700 underline"
        onClick={() => hilfeZeigen({ ...z, name: z.name.replace("{P}", personPl).replace("{A}", abschluss), pfad: hilfeText({ frage: "", antwort: "", pfad: z.pfad }, woerter).pfad })}
        data-testid="hilfe-eintrag-zeigen"
      >
        Zeig mir wo
      </button>
    );
  };
  const oeffnen = (e: HilfeEintrag) =>
    seiteErlaubt(e.href, { rechte, fach }) ? (
      <Link href={e.href} className="font-medium text-brand-700 underline" data-testid="hilfe-eintrag-link">Seite öffnen</Link>
    ) : null;

  return (
    <div className="space-y-6" data-testid="hilfe-praxis">
      <form className="card space-y-3" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="label" htmlFor="hilfe-frage">Ihre Frage zur Bedienung</label>
        <input
          id="hilfe-frage"
          type="search"
          className="input w-full"
          value={frage}
          maxLength={500}
          autoComplete="off"
          placeholder="z. B. Wie lege ich einen Vorschlag an?"
          aria-describedby="hilfe-frage-hinweis"
          onChange={(e) => { setFrage(e.target.value); setKiAntwort(null); setFehler(null); }}
          data-testid="hilfe-frage"
          data-hilfe="hilfe-frage"
        />
        <p id="hilfe-frage-hinweis" className="text-xs text-slate-500">Bitte keine Patientendaten eingeben: keine Namen, keine Geburtsdaten, keine Befunde. Fehlermeldungen können Sie wörtlich einfügen.</p>
        {ki && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-secondary" disabled={!gefragt || kiLaeuft} onClick={mitKi} data-testid="hilfe-ki">
              {kiLaeuft ? "KI formuliert …" : "Mit KI beantworten"}
            </button>
            <span className="text-xs text-slate-500">Schickt Ihre Frage und die Hilfetexte an den KI-Dienst. Die Antwort ist ein Entwurf und stützt sich nur auf diese Texte.</span>
          </div>
        )}
      </form>

      {fehler && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{fehler}</p>}

      {kiAntwort && (
        <section className="card border-amber-200 bg-amber-50" aria-labelledby="hilfe-ki-titel" data-testid="hilfe-ki-antwort">
          <h2 id="hilfe-ki-titel" className="text-xs font-semibold uppercase tracking-wide text-amber-900">Entwurf der KI, bitte am Eintrag prüfen</h2>
          {kiAntwort.passt ? (
            <>
              <p className="mt-2 text-sm text-slate-800">{kiAntwort.antwort}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">Quelle:</p>
              <ul className="mt-1 space-y-1 text-sm">
                {kiAntwort.quellen.map((q, i) => {
                  const e = HILFE_WISSEN.find((x) => x.id === q.id);
                  return (
                    <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={q.href} className="text-brand-700 underline">{q.frage}</Link> <span className="text-xs text-slate-500">({q.pfad})</span>
                      {i === 0 && e && zeigKnopf(e)}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-800">Zu dieser Frage steht nichts in der Hilfe. Die KI antwortet nur aus den Hilfetexten und rät nicht.</p>
          )}
        </section>
      )}

      <section aria-labelledby="hilfe-treffer-titel" aria-live="polite" data-testid="hilfe-treffer">
        <h2 id="hilfe-treffer-titel" className="mb-2 text-sm font-semibold text-slate-900">{gefragt ? "Passende Einträge" : "Stellen Sie oben Ihre Frage"}</h2>
        {gefragt && treffer.length === 0 && (
          <p className="card text-sm text-slate-600" data-testid="hilfe-kein-treffer">
            Dazu gibt es keinen Eintrag. Versuchen Sie ein anderes Wort, sehen Sie unten alle Themen durch oder schreiben Sie uns über die{" "}
            <Link href="/hilfe" className="text-brand-700 underline">Hilfe-Seite</Link>.
          </p>
        )}
        <ul className="space-y-3">
          {gefragt && treffer.map(({ eintrag }) => {
            const e = hilfeText(eintrag, woerter);
            return (
              <li key={e.id} className="card" data-testid="hilfe-eintrag">
                <h3 className="font-medium text-slate-900">{e.frage}</h3>
                <p className="mt-1 text-sm text-slate-700">{e.antwort}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>Menü: {e.pfad}</span>
                  {zeigKnopf(eintrag)}
                  {oeffnen(eintrag)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="rounded-lg bg-[#F5F2EE] px-3 py-2 text-sm text-slate-600" data-testid="hilfe-hinweis">{hilfeHinweis(hinweisArt ?? (fach === "zahn" ? "zahn" : "andere"))}</p>

      <details className="card" data-testid="hilfe-alle">
        <summary className="cursor-pointer text-sm font-medium text-slate-900">Alle Themen ({alle.length})</summary>
        {GRUPPEN.map(([art, titel]) => {
          const liste = alle.filter((e) => (e.art ?? "bedienung") === art);
          if (!liste.length) return null;
          return (
            <div key={art} className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titel} ({liste.length})</h3>
              <ul className="mt-2 space-y-3">
                {liste.map((roh) => {
                  const e = hilfeText(roh, woerter);
                  return (
                    <li key={e.id} className="text-sm">
                      <p className="font-medium text-slate-900">{e.frage}</p>
                      <p className="mt-0.5 text-slate-700">{e.antwort}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span>Menü: {e.pfad}</span>
                        {zeigKnopf(roh)}
                        {oeffnen(roh)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </details>
    </div>
  );
}
