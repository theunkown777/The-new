"use client";

import { useCallback, useState } from "react";
import { fachText } from "@/lib/fachText";

type Tag = { tag: string; zeiten: string[] };
const tagName = (tag: string) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const tagKurz = (tag: string) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
const uhr = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const termin = (iso: string) => `${new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" })}, ${uhr(iso)} Uhr`;

/**
 * Öffentliche Terminanfrage für neue Patienten: freie Zeit wählen, kurz anmelden, absenden.
 * Es entsteht eine Anfrage; die Praxis bestätigt sie. Kein fremder Dienst, kein Captcha:
 * Schutz über verstecktes Lockfeld, Zeitstempel und Begrenzung auf dem Server.
 */
export function NeupatientTermin(props: { kennung: string; praxis: string; aktiv: boolean; minuten: number; tage: Tag[]; anlaesse: string[]; stempel: string; beispiel: boolean; /** Datenschutzhinweise der Praxis, falls hinterlegt (https-Adresse) */ datenschutzUrl?: string | null; /** Fach der Praxis: „die Apotheke bestätigt“, „beim Pflegedienst“ (lib/fachText.ts) */ fach?: string | null }) {
  const { kennung, praxis, anlaesse, beispiel } = props;
  const ft = (s: string) => fachText(s, props.fach);
  const [tage, setTage] = useState<Tag[]>(props.tage);
  const [aktiv, setAktiv] = useState(props.aktiv);
  const [minuten, setMinuten] = useState(props.minuten);
  const [stempel, setStempel] = useState(props.stempel);
  const [tag, setTag] = useState<string | null>(props.tage[0]?.tag ?? null);
  const [zeit, setZeit] = useState<string | null>(null);
  const [f, setF] = useState({ vorname: "", nachname: "", geburtsdatum: "", mobil: "", email: "", anlass: anlaesse.length === 1 ? anlaesse[0] : "", website: "" });
  const [datenschutz, setDatenschutz] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<string | null>(null);
  const setze = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const laden = useCallback(async () => {
    const res = await fetch(`/api/t/${kennung}`, { cache: "no-store" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok || !d) return;
    setTage(d.tage); setAktiv(d.aktiv); setMinuten(d.minuten); setStempel(d.stempel);
    setTag((t) => (t && d.tage.some((x: Tag) => x.tag === t) ? t : d.tage[0]?.tag ?? null));
  }, [kennung]);

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    if (!zeit) return setFehler("Bitte wählen Sie zuerst eine Zeit.");
    if (!f.mobil.trim() && !f.email.trim()) return setFehler(ft("Bitte tragen Sie eine Mobilnummer oder eine E-Mail-Adresse ein, damit die Praxis Sie erreicht."));
    if (!datenschutz) return setFehler("Bitte bestätigen Sie, dass Sie die Datenschutzhinweise gelesen haben.");
    setBusy(true); setFehler(null);
    const res = await fetch(`/api/t/${kennung}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, start: zeit, datenschutz: true, stempel }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setFehler(d?.error ?? "Die Anfrage hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
      if (d?.stempel) setStempel(d.stempel);
      if (d?.vergeben) { setZeit(null); await laden(); }
      return;
    }
    setFertig(d.start ?? zeit);
  }

  if (fertig) {
    return (
      <div className="rounded-2xl bg-salbei-50 p-5 text-salbei-900" role="status" data-testid="neutermin-fertig">
        <p className="text-lg font-semibold">Ihre Anfrage ist angekommen.</p>
        <p className="mt-2 text-sm">Gewünschte Zeit: <b>{termin(fertig)}</b> bei {praxis}.</p>
        <p className="mt-2 text-sm">{ft("Die Zeit ist 24 Stunden für Sie reserviert. Der Termin gilt erst, wenn die Praxis ihn bestätigt. Die Praxis sieht Ihre Anfrage mit den angegebenen Kontaktdaten.")}</p>
        {beispiel && <p className="mt-2 text-sm">Dies war ein Beispiel. Es meldet sich niemand bei Ihnen.</p>}
      </div>
    );
  }

  const aktuell = tage.find((t) => t.tag === tag) ?? null;
  const heute = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4" data-testid="neutermin">
      {fehler && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800" role="alert" data-testid="neutermin-fehler">{fehler}</p>}

      <section className="rounded-2xl bg-white p-4" aria-labelledby="neutermin-zeiten">
        <h2 id="neutermin-zeiten" className="text-sm font-semibold text-slate-900">1. Freie Zeit wählen</h2>
        {!aktiv ? <p className="mt-2 text-sm text-slate-600" data-testid="neutermin-inaktiv">{praxis} bietet zurzeit keine Online-Termine an. {ft("Bitte rufen Sie in der Praxis an.")}</p>
          : tage.length === 0 ? <p className="mt-2 text-sm text-slate-600" data-testid="neutermin-keine">{ft("In den nächsten Wochen ist online keine Zeit frei. Bitte rufen Sie in der Praxis an.")}</p>
          : (
            <>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Tag">
                {tage.map((t) => (
                  <button key={t.tag} type="button" role="tab" aria-selected={tag === t.tag} onClick={() => { setTag(t.tag); setZeit(null); }} data-testid="neutermin-tag"
                    className={`shrink-0 rounded-xl px-3 py-2 text-center text-sm ring-1 ${tag === t.tag ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-200"}`}>
                    <span className="block font-medium">{tagKurz(t.tag)}</span><span className={`block text-xs ${tag === t.tag ? "text-brand-100" : "text-slate-500"}`}>{t.zeiten.length} frei</span>
                  </button>
                ))}
              </div>
              {aktuell && (
                <>
                  <p className="mt-2 text-sm font-medium text-slate-900">{tagName(aktuell.tag)}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Uhrzeit">
                    {aktuell.zeiten.map((z) => (
                      <button key={z} type="button" role="radio" aria-checked={zeit === z} onClick={() => { setZeit(z); setFehler(null); }} data-testid="neutermin-zeit"
                        className={`rounded-xl py-2.5 text-sm font-medium ring-1 ${zeit === z ? "bg-salbei-600 text-white ring-salbei-600" : "bg-salbei-50 text-salbei-900 ring-salbei-200"}`}>{uhr(z)}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
      </section>

      {aktiv && zeit && (
        <form onSubmit={senden} className="space-y-3 rounded-2xl bg-white p-4" data-testid="neutermin-formular">
          <h2 className="text-sm font-semibold text-slate-900">2. Kurz anmelden</h2>
          <p className="rounded-xl bg-[#F5F2EE] px-3 py-2 text-sm text-slate-900" data-testid="neutermin-wahl"><b>{termin(zeit)}</b>, {minuten} Minuten</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Vorname</span><input className="input" value={f.vorname} onChange={setze("vorname")} required minLength={2} maxLength={60} autoComplete="given-name" data-testid="neutermin-vorname" /></label>
            <label className="block"><span className="label">Nachname</span><input className="input" value={f.nachname} onChange={setze("nachname")} required minLength={2} maxLength={60} autoComplete="family-name" data-testid="neutermin-nachname" /></label>
          </div>
          <label className="block"><span className="label">Geburtsdatum</span><input type="date" className="input" value={f.geburtsdatum} onChange={setze("geburtsdatum")} required min="1900-01-01" max={heute} autoComplete="bday" data-testid="neutermin-geburtsdatum" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Mobilnummer</span><input type="tel" inputMode="tel" className="input" value={f.mobil} onChange={setze("mobil")} maxLength={30} autoComplete="tel" placeholder="z. B. 0171 2345678" data-testid="neutermin-mobil" /></label>
            <label className="block"><span className="label">oder E-Mail</span><input type="email" inputMode="email" className="input" value={f.email} onChange={setze("email")} maxLength={200} autoComplete="email" data-testid="neutermin-email" /></label>
          </div>
          <p className="-mt-1 text-xs text-slate-500">{ft("Eines von beiden genügt. Darüber bestätigt die Praxis Ihren Termin.")}</p>
          <label className="block"><span className="label">Anlass</span>
            <select className="input" value={f.anlass} onChange={setze("anlass")} required data-testid="neutermin-anlass">
              <option value="" disabled>Bitte wählen</option>
              {anlaesse.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          {/* Lockfeld gegen Automaten: für Menschen unsichtbar und nicht mit der Tastatur erreichbar. */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>Website (bitte leer lassen)<input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={setze("website")} /></label>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600" data-testid="neutermin-datenschutz-text">
            <b className="text-slate-800">Datenschutz in Kürze:</b> Verantwortlich für Ihre Daten ist {praxis}. Ihre Angaben werden nur für die Terminvergabe verwendet.
            Kommt kein Termin zustande, werden sie nach spätestens 30 Tagen gelöscht. {ft("Die Seite stellt Sorrida im Auftrag der Praxis technisch bereit.")}{" "}
            {props.datenschutzUrl
              ? <>Die vollständigen <a href={props.datenschutzUrl} target="_blank" rel="noopener noreferrer" className="underline" data-testid="neutermin-datenschutz-link">{ft("Datenschutzhinweise der Praxis")}</a> öffnen sich in einem neuen Fenster.</>
              : ft("Die vollständigen Datenschutzhinweise erhalten Sie von der Praxis.")}
          </div>
          {/* Bestätigt wird nur, was die Seite auch zeigt: mit Link die Hinweise der Praxis, sonst der Hinweis oben. */}
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={datenschutz} onChange={(e) => setDatenschutz(e.target.checked)} required data-testid="neutermin-datenschutz" />
            <span data-testid="neutermin-datenschutz-bestaetigung">{props.datenschutzUrl ? ft("Ich habe die Datenschutzhinweise der Praxis gelesen.") : "Ich habe den Hinweis zum Datenschutz oben gelesen."}</span>
          </label>
          <button className="btn btn-primary w-full" disabled={busy} data-testid="neutermin-senden">{busy ? "Sendet …" : "Termin anfragen"}</button>
          <p className="text-center text-xs text-slate-500">{ft("Die Zeit wird 24 Stunden für Sie reserviert. Der Termin gilt, sobald die Praxis ihn bestätigt.")}</p>
        </form>
      )}
    </div>
  );
}
