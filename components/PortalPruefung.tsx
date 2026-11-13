"use client";

import { useId, useState } from "react";
import { pruefFehlerText, pruefText } from "@/lib/portalPruefung";

// Geburtsdatum bestätigen, bevor im Patientenportal unterschrieben oder eine
// Lastschrift erteilt wird (S5). Drei Felder statt eines Datumsfelds: Auf dem
// Handy öffnet sich der Ziffernblock, und niemand muss im Kalender 50 Jahre
// zurückblättern. Geprüft wird auf dem Server; die Bestätigung liegt danach
// als httpOnly-Cookie vor, diese Komponente erfährt nur "bestätigt".
export function GeburtsdatumPruefung({
  pruefUrl,
  lang,
  grund,
  hinweis,
  demoDatum,
  autoFocus,
  onBestaetigt,
  className = "",
}: {
  /** POST-Adresse: /api/portal/<token>/pruefung */
  pruefUrl: string;
  lang: string;
  grund: "unterschrift" | "lastschrift";
  /** z. B. "Ihre Bestätigung ist abgelaufen" */
  hinweis?: string | null;
  /** Nur in Demo-Praxen: das erfundene Geburtsdatum des Beispielpatienten */
  demoDatum?: string | null;
  autoFocus?: boolean;
  onBestaetigt: () => void;
  className?: string;
}) {
  const t = pruefText(lang);
  const id = useId();
  const [f, setF] = useState({ tag: "", monat: "", jahr: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fehlerId = `${id}-fehler`;
  const grundId = `${id}-grund`;

  const ziffern = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
  const vollstaendig = /^\d{1,2}$/.test(f.tag) && /^\d{1,2}$/.test(f.monat) && /^\d{4}$/.test(f.jahr);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!vollstaendig) return setError(t.unvollstaendig);
    setBusy(true);
    setError(null);
    const res = await fetch(pruefUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok && d?.ok) return onBestaetigt();
    setError(pruefFehlerText(t, d));
  }

  const feld = "input mt-1 !py-3 text-center !text-base tabular-nums";
  const beschreibung = `${grundId}${error ? ` ${fehlerId}` : ""}`;

  return (
    <form onSubmit={submit} noValidate className={`space-y-4 ${className}`} lang={pruefText(lang) === pruefText("de") ? "de" : lang} data-testid="geburtsdatum-pruefung">
      <div>
        <h2 className="font-display text-2xl leading-tight text-slate-900">{t.titel}</h2>
        {hinweis && <p className="mt-2 rounded-lg bg-salbei-50 px-3 py-2 text-sm text-salbei-800" role="status">{hinweis}</p>}
        <p id={grundId} className="mt-2 text-sm leading-relaxed text-slate-600">{grund === "unterschrift" ? t.grundUnterschrift : t.grundLastschrift}</p>
      </div>
      <fieldset aria-describedby={beschreibung}>
        <legend className="text-sm font-medium text-slate-800">{t.feld}</legend>
        <div className="mt-2 grid grid-cols-[1fr_1fr_1.4fr] gap-3">
          <label className="block text-sm text-slate-700" htmlFor={`${id}-tag`}>
            {t.tag}
            <input id={`${id}-tag`} className={feld} inputMode="numeric" pattern="[0-9]*" autoComplete="bday-day" maxLength={2} placeholder={t.platzhalter[0]} value={f.tag} onChange={(e) => setF({ ...f, tag: ziffern(e.target.value, 2) })} aria-invalid={error ? true : undefined} required autoFocus={autoFocus} data-testid="geb-tag" />
          </label>
          <label className="block text-sm text-slate-700" htmlFor={`${id}-monat`}>
            {t.monat}
            <input id={`${id}-monat`} className={feld} inputMode="numeric" pattern="[0-9]*" autoComplete="bday-month" maxLength={2} placeholder={t.platzhalter[1]} value={f.monat} onChange={(e) => setF({ ...f, monat: ziffern(e.target.value, 2) })} aria-invalid={error ? true : undefined} required data-testid="geb-monat" />
          </label>
          <label className="block text-sm text-slate-700" htmlFor={`${id}-jahr`}>
            {t.jahr}
            <input id={`${id}-jahr`} className={feld} inputMode="numeric" pattern="[0-9]*" autoComplete="bday-year" maxLength={4} placeholder={t.platzhalter[2]} value={f.jahr} onChange={(e) => setF({ ...f, jahr: ziffern(e.target.value, 4) })} aria-invalid={error ? true : undefined} required data-testid="geb-jahr" />
          </label>
        </div>
      </fieldset>
      {demoDatum && <p className="rounded-lg border border-dashed border-salbei-300 px-3 py-2 text-xs text-slate-600" data-testid="geb-demo">{t.demo(demoDatum)}</p>}
      {error && <p id={fehlerId} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="geb-fehler">{error}</p>}
      <button className="w-full rounded-xl bg-salbei-600 px-4 py-3 text-base font-semibold text-white hover:bg-salbei-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-salbei-700 focus-visible:ring-offset-2 disabled:opacity-60" disabled={busy} data-testid="geb-senden">
        {busy ? t.laeuft : t.senden}
      </button>
    </form>
  );
}

/** Kleine Zeile nach erfolgreicher Prüfung. */
export function GeburtsdatumBestaetigt({ lang, className = "" }: { lang: string; className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-sm text-salbei-700 ${className}`} role="status" data-testid="geb-bestaetigt">
      <span aria-hidden="true">✓</span>
      {pruefText(lang).bestaetigt}
    </p>
  );
}
