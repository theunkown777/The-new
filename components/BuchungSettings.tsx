"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WOCHENTAGE, type Sprechzeiten } from "@/lib/buchung";

type Vorschau = { tag: string; name: string; zeiten: string[] }[];
type Props = {
  admin: boolean;
  start: { buchungAktiv: boolean; sprechzeiten: Sprechzeiten; buchungMinuten: number; buchungVorlaufStd: number; buchungTageVoraus: number };
  kalender: { verbunden: boolean; host: string | null; syncAt: string | null; fehler: string | null; abo: number; datei: number; feed: boolean };
  plaetze: number;
  vorschau: Vorschau;
  demo: boolean;
};
const TAGE = ["1", "2", "3", "4", "5", "6", "7"] as const;

/** Online-Termine: Sprechzeiten, Regeln, Kalender der Praxis übertragen, Sorrida-Termine im eigenen Kalender. */
export function BuchungSettings({ admin, start, kalender, plaetze, vorschau, demo }: Props) {
  const router = useRouter();
  const [aktiv, setAktiv] = useState(start.buchungAktiv);
  const [zeiten, setZeiten] = useState<Sprechzeiten>(start.sprechzeiten);
  const [minuten, setMinuten] = useState(start.buchungMinuten);
  const [vorlauf, setVorlauf] = useState(start.buchungVorlaufStd);
  const [voraus, setVoraus] = useState(start.buchungTageVoraus);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const datei = useRef<HTMLInputElement>(null);

  const setze = (tag: (typeof TAGE)[number], i: number, pos: 0 | 1, wert: string) =>
    setZeiten((z) => ({ ...z, [tag]: (z[tag] ?? []).map((f, j) => (j === i ? (pos === 0 ? [wert, f[1]] : [f[0], wert]) : f)) as [string, string][] }));
  const mehr = (tag: (typeof TAGE)[number]) => setZeiten((z) => ({ ...z, [tag]: [...(z[tag] ?? []), (z[tag]?.length ? ["14:00", "17:00"] : ["08:00", "12:00"]) as [string, string]] }));
  const weg = (tag: (typeof TAGE)[number], i: number) => setZeiten((z) => ({ ...z, [tag]: (z[tag] ?? []).filter((_, j) => j !== i) }));

  async function sende(name: string, anfrage: () => Promise<Response>, erfolg: (d: Record<string, unknown>) => string) {
    setBusy(name); setMeldung(null);
    const res = await anfrage().catch(() => null);
    const d = (await res?.json().catch(() => null)) ?? {};
    setBusy(null);
    if (!res?.ok) { setMeldung({ art: "fehler", text: (d.error as string) ?? "Das hat nicht geklappt." }); return null; }
    setMeldung({ art: "ok", text: erfolg(d) });
    router.refresh();
    return d;
  }
  const json = (methode: string, body: unknown) => () => fetch("/api/settings/buchung", { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const speichern = () => sende("speichern", json("PUT", { buchungAktiv: aktiv, sprechzeiten: zeiten, buchungMinuten: minuten, buchungVorlaufStd: vorlauf, buchungTageVoraus: voraus }), () => "Gespeichert.");
  const aktion = (a: string, extra: Record<string, unknown>, text: (d: Record<string, unknown>) => string) => sende(a, json("POST", { aktion: a, ...extra }), text);

  return (
    <div className="space-y-6">
      {meldung && <p role={meldung.art === "fehler" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${meldung.art === "fehler" ? "bg-red-50 text-red-800" : "bg-salbei-50 text-salbei-900"}`} data-testid="buchung-meldung">{meldung.text}</p>}
      {!admin && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Nur die Geschäftsführung kann diese Einstellungen ändern.</p>}

      <section className="card space-y-4" aria-labelledby="b-regeln">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="b-regeln" className="font-semibold text-slate-900">1. Online-Termine für Patienten</h2>
            <p className="mt-1 text-sm text-slate-600">Patienten buchen über ihren Patientenlink. Sie sehen nur Zeiten, die in Ihrer Sprechzeit liegen und noch frei sind.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-900">
            <input type="checkbox" className="h-5 w-5" checked={aktiv} disabled={!admin} onChange={(e) => setAktiv(e.target.checked)} data-testid="buchung-aktiv" />
            Online-Termine anbieten
          </label>
        </div>
        <div className="space-y-2" data-testid="sprechzeiten">
          {TAGE.map((tag, n) => (
            <div key={tag} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0">
              <span className="w-24 shrink-0 font-medium text-slate-800">{WOCHENTAGE[n]}</span>
              {(zeiten[tag] ?? []).length === 0 && <span className="text-slate-500">geschlossen</span>}
              {(zeiten[tag] ?? []).map((f, i) => (
                <span key={i} className="flex items-center gap-1">
                  <input type="time" className="input w-[7.5rem]" value={f[0]} disabled={!admin} onChange={(e) => setze(tag, i, 0, e.target.value)} aria-label={`${WOCHENTAGE[n]} von`} />
                  <span className="text-slate-500">bis</span>
                  <input type="time" className="input w-[7.5rem]" value={f[1]} disabled={!admin} onChange={(e) => setze(tag, i, 1, e.target.value)} aria-label={`${WOCHENTAGE[n]} bis`} />
                  {admin && <button type="button" className="ziel px-2 text-slate-500 hover:text-red-700" onClick={() => weg(tag, i)} aria-label={`Zeitfenster ${WOCHENTAGE[n]} entfernen`}>✕</button>}
                </span>
              ))}
              {admin && (zeiten[tag] ?? []).length < 4 && <button type="button" className="ziel text-brand-700 underline" onClick={() => mehr(tag)}>+ Zeit</button>}
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="label">Dauer eines Termins</span>
            <select className="input" value={minuten} disabled={!admin} onChange={(e) => setMinuten(Number(e.target.value))}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} Minuten</option>)}</select></label>
          <label className="text-sm"><span className="label">Frühestens buchbar</span>
            <select className="input" value={vorlauf} disabled={!admin} onChange={(e) => setVorlauf(Number(e.target.value))}>{[[0, "sofort"], [2, "in 2 Stunden"], [24, "am nächsten Tag"], [48, "in 2 Tagen"], [72, "in 3 Tagen"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label className="text-sm"><span className="label">Wie weit im Voraus</span>
            <select className="input" value={voraus} disabled={!admin} onChange={(e) => setVoraus(Number(e.target.value))}>{[[7, "1 Woche"], [14, "2 Wochen"], [28, "4 Wochen"], [56, "8 Wochen"], [90, "3 Monate"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        </div>
        <p className="text-xs text-slate-500">
          Gleichzeitig buchbar: {plaetze} {plaetze === 1 ? "Termin" : "Termine"} (Behandlungsplätze Ihrer Standorte, änderbar unter Einstellungen → Standorte). Bundesweite Feiertage sind automatisch gesperrt;
          regionale Feiertage, Urlaub und Fortbildungen tragen Sie als ganztägigen Eintrag in Ihren Kalender ein.
        </p>
        {admin && <button type="button" className="btn-primary" disabled={busy === "speichern"} onClick={speichern} data-testid="buchung-speichern">{busy === "speichern" ? "Speichert …" : "Speichern"}</button>}
      </section>

      <section className="card space-y-3" aria-labelledby="b-kalender">
        <h2 id="b-kalender" className="font-semibold text-slate-900">2. Kalender der Praxis übertragen</h2>
        <p className="text-sm text-slate-600">
          Damit Patienten keine Zeit buchen, die in Ihrem Kalender schon belegt ist, liest Sorrida Ihren Kalender mit. Übernommen werden <b>nur Beginn und Ende</b> der Einträge,
          keine Namen, Titel oder Notizen. Das funktioniert mit jedem Kalender, der das iCalendar-Format (ICS) ausgibt: Google, Outlook, Apple und viele Praxisprogramme.
        </p>
        {kalender.verbunden ? (
          <div className="rounded-xl bg-salbei-50 p-3 text-sm text-salbei-900" data-testid="kalender-verbunden">
            <p><b>Verbunden</b> mit {kalender.host}. {kalender.abo} belegte Zeiten übernommen{kalender.syncAt ? `, zuletzt abgeglichen ${kalender.syncAt}` : ""}. Abgleich automatisch, sobald ein Patient Termine ansieht (höchstens alle 15 Minuten).</p>
            {kalender.fehler && <p className="mt-1 text-red-800">Letzter Abgleich fehlgeschlagen: {kalender.fehler}</p>}
            {admin && <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-sm" disabled={!!busy} onClick={() => aktion("kalender-abgleichen", {}, (d) => `Abgeglichen: ${d.anzahl} belegte Zeiten.`)}>Jetzt abgleichen</button>
              <button type="button" className="btn-secondary text-sm" disabled={!!busy} onClick={() => aktion("kalender-trennen", {}, () => "Kalender getrennt, übernommene Zeiten gelöscht.")}>Trennen</button>
            </div>}
          </div>
        ) : admin && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); aktion("kalender-verbinden", { url }, (d) => `Kalender verbunden: ${d.anzahl} belegte Zeiten übernommen.`).then((d) => d && setUrl("")); }}>
            <label className="min-w-0 flex-1 basis-64 text-sm"><span className="label">Kalender-Adresse (ICS / iCal)</span>
              <input className="input" type="url" inputMode="url" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value={url} onChange={(e) => setUrl(e.target.value)} required data-testid="kalender-url" /></label>
            <button className="btn-primary" disabled={busy === "kalender-verbinden"}>{busy === "kalender-verbinden" ? "Prüft …" : "Verbinden"}</button>
          </form>
        )}
        {demo && !kalender.verbunden && <p className="text-xs text-slate-500">Im Gastzugang ruft Sorrida keine fremde Adresse ab. Zum Ausprobieren eine Kalenderdatei hochladen.</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-700">{kalender.datei > 0 ? `Aus hochgeladener Datei: ${kalender.datei} belegte Zeiten.` : "Oder einmalig eine Kalenderdatei (.ics) hochladen:"}</span>
          {admin && <>
            <input ref={datei} type="file" accept=".ics,text/calendar" className="hidden" data-testid="kalender-datei"
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const text = await f.text(); await sende("datei", () => fetch("/api/settings/buchung/datei", { method: "POST", headers: { "Content-Type": "text/calendar" }, body: text }), (d) => `Datei übernommen: ${d.anzahl} belegte Zeiten.`); e.target.value = ""; }} />
            <button type="button" className="btn-secondary text-sm" disabled={busy === "datei"} onClick={() => datei.current?.click()}>{busy === "datei" ? "Liest …" : "Datei wählen"}</button>
            {kalender.datei > 0 && <button type="button" className="ziel text-slate-500 underline" onClick={() => aktion("datei-entfernen", {}, () => "Zeiten aus der Datei gelöscht.")}>entfernen</button>}
          </>}
        </div>
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer text-brand-700">Wo finde ich die Kalender-Adresse?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Google Kalender:</b> Einstellungen → Kalender auswählen → „Privatadresse im iCal-Format“.</li>
            <li><b>Outlook / Microsoft 365:</b> Einstellungen → Kalender → Freigegebene Kalender → „Kalender veröffentlichen“ → ICS-Link.</li>
            <li><b>Apple iCloud:</b> Kalender → Freigabe → „Öffentlicher Kalender“ → Link kopieren.</li>
            <li><b>Praxisprogramm:</b> Bietet es einen Kalender-Export oder ein Kalender-Abo (iCal, ICS) an, nehmen Sie diese Adresse oder laden die exportierte Datei hoch. Fragen Sie sonst den Support nach „iCal-Export“.</li>
          </ul>
        </details>
      </section>

      <section className="card space-y-3" aria-labelledby="b-abo">
        <h2 id="b-abo" className="font-semibold text-slate-900">3. Sorrida-Termine in Ihrem Kalender sehen</h2>
        <p className="text-sm text-slate-600">Mit diesem Abo erscheinen Termine aus Sorrida, auch online gebuchte, in Ihrem eigenen Kalender. Ohne Patientennamen, weil Kalenderdienste den Link auf ihren Servern abrufen. Den Namen sehen Sie in Sorrida unter Termine.</p>
        {link && <div className="rounded-xl bg-salbei-50 p-3 text-sm"><p className="font-medium text-salbei-900">Ihr Abo-Link. Er wird nur jetzt angezeigt:</p><p className="mt-1 break-all font-mono text-xs text-slate-800" data-testid="abo-link">{link}</p><p className="mt-1 text-xs text-slate-600">In Ihrem Kalender als „Kalender per URL abonnieren“ einfügen.</p></div>}
        {admin && <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" disabled={!!busy} onClick={async () => { const d = await aktion("abo-link", {}, () => "Abo-Link erzeugt."); if (d?.link) setLink(d.link as string); }} data-testid="abo-erzeugen">{kalender.feed ? "Neuen Link erzeugen (alter wird ungültig)" : "Abo-Link erzeugen"}</button>
          {kalender.feed && <button type="button" className="btn-secondary text-sm" disabled={!!busy} onClick={() => { setLink(null); aktion("abo-link-sperren", {}, () => "Abo-Link gesperrt."); }}>Link sperren</button>}
        </div>}
      </section>

      <section className="card" aria-labelledby="b-vorschau" data-testid="buchung-vorschau">
        <h2 id="b-vorschau" className="font-semibold text-slate-900">Das sehen Ihre Patienten</h2>
        {!start.buchungAktiv ? <p className="mt-1 text-sm text-slate-600">Online-Termine sind ausgeschaltet. Patienten sehen im Patientenlink keinen Buchungsknopf.</p>
          : vorschau.length === 0 ? <p className="mt-1 text-sm text-amber-800">Im gewählten Zeitraum ist nichts frei. Bitte Sprechzeiten und Kalender prüfen.</p>
          : <ul className="mt-2 space-y-2 text-sm">{vorschau.slice(0, 5).map((t) => <li key={t.tag}><span className="font-medium text-slate-900">{t.name}:</span> <span className="text-slate-700">{t.zeiten.slice(0, 10).join(" · ")}{t.zeiten.length > 10 ? ` · und ${t.zeiten.length - 10} weitere` : ""}</span></li>)}</ul>}
      </section>
    </div>
  );
}
