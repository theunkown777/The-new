"use client";

import { useState } from "react";
import { Haken } from "@/components/Haken";
import { useRouter } from "next/navigation";
import { WhatsappSenden } from "@/components/WhatsappSenden";
import { EINWILLIGUNG_WEGE, einwilligungsText, vermerkText, type EinwilligungVermerk, type EinwilligungWeg } from "@/lib/kontakt";

const escHtml = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Kontakt, Stammdaten und Einwilligungen. Die Einwilligungen stehen im Wortlaut aus lib/kontakt.ts da: Die Praxis liest
// ihn vor oder druckt ihn aus. Gespeichert wird je Einwilligung, wann, von wem und auf welchem Weg sie aufgenommen wurde.
export function PatientKontakt({ patientId, email, phone, einwilligungAm, whatsappAm = null, nachfassAm = null, vermerk = {}, praxisName = "", patientName = "", whatsappDirekt = false, geschlecht = null, geburtsdatum = null }: { /** "JJJJ-MM-TT" oder null, wenn keines hinterlegt ist */ geburtsdatum?: string | null; whatsappDirekt?: boolean; patientId: string; email: string | null; phone: string | null; einwilligungAm: string | null; whatsappAm?: string | null; /** Einwilligung, an offene Vorschläge erinnert zu werden */ nachfassAm?: string | null; /** wer die Einwilligungen aufgenommen hat und wie */ vermerk?: EinwilligungVermerk; praxisName?: string; patientName?: string; geschlecht?: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({ email: email ?? "", phone: phone ?? "", einwilligung: !!einwilligungAm, whatsapp: !!whatsappAm, nachfassen: !!nachfassAm, weg: "muendlich" as EinwilligungWeg, geschlecht: geschlecht ?? "", geburtsdatum: geburtsdatum ?? "" });
  const texte = {
    email: einwilligungsText("email", { praxis: praxisName, email: f.email }),
    whatsapp: einwilligungsText("whatsapp", { praxis: praxisName, nummer: f.phone }),
    nachfassen: einwilligungsText("nachfassen", { praxis: praxisName }),
  };
  // Formular zum Unterschreiben: eigenes Fenster nur mit dem Wortlaut, damit nicht die ganze Akte gedruckt wird.
  function drucken() {
    const w = window.open("", "_blank");
    if (!w) return;
    const absatz = (titel: string, text: string) => `<h2>${escHtml(titel)}</h2><p>☐ ${escHtml(text)}</p>`;
    w.document.write(
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Einwilligung</title></head><body><h1>Einwilligung in Nachrichten</h1><p>${escHtml(praxisName)}${patientName ? ` · ${escHtml(patientName)}` : ""}</p>${absatz("E-Mail", texte.email)}${absatz("WhatsApp", texte.whatsapp)}${absatz("Erinnerung an offene Vorschläge", texte.nachfassen)}<p><br><br>Ort, Datum: ____________________ &nbsp; Unterschrift: ______________________________</p></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/patients/${patientId}/kontakt`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Gespeichert." } : { ok: false, text: (await res.json().catch(() => ({}))).error ?? "Speichern fehlgeschlagen." });
    if (res.ok) router.refresh();
  }
  return (
    <form onSubmit={save} className="card space-y-3" data-testid="kontakt">
      <h2 className="font-semibold text-slate-900">Kontakt und Stammdaten</h2>
      {!geburtsdatum && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="kontakt-geburtsdatum-hinweis">
          <b>Geburtsdatum fehlt.</b> Das Patientenportal fragt es ab, bevor unterschrieben oder eine Lastschrift erteilt wird. Ohne Geburtsdatum werden Unterschriften als „ohne Geburtsdatum-Prüfung“ vermerkt, und Lastschrift wird im Portal nicht angeboten. Bitte hier nachtragen.
        </p>
      )}
      <label className="block text-sm text-slate-700 sm:max-w-xs">
        Geburtsdatum
        <input className="input mt-1 w-full" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={f.geburtsdatum} onChange={(e) => setF({ ...f, geburtsdatum: e.target.value })} data-testid="kontakt-geburtsdatum" />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <select className="input w-full" value={f.geschlecht} onChange={(e) => setF({ ...f, geschlecht: e.target.value })} aria-label="Geschlecht" data-testid="kontakt-geschlecht">
          <option value="">Geschlecht nicht angegeben</option>
          <option value="W">weiblich</option>
          <option value="M">männlich</option>
          <option value="D">divers</option>
        </select>
        <input className="input w-full" type="email" placeholder="E-Mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="E-Mail" data-testid="kontakt-email" />
        <input className="input w-full" type="tel" placeholder="Mobilnummer" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Mobilnummer" />
      </div>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3" data-testid="kontakt-einwilligungen">
        <legend className="px-1 text-sm font-medium text-slate-800">Einwilligungen des Patienten</legend>
        <p className="text-xs text-slate-500">
          Lesen Sie den Text vor oder drucken Sie ihn zum Unterschreiben aus. Setzen Sie das Häkchen erst, wenn der Patient zugestimmt hat.
          Häkchen entfernen heißt Widerruf.
        </p>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={f.einwilligung} onChange={(e) => setF({ ...f, einwilligung: e.target.checked })} data-testid="kontakt-einwilligung" />
          <span>
            <b className="font-medium">E-Mail:</b> „{texte.email}“
            {einwilligungAm && <span className="block text-xs text-slate-500" data-testid="kontakt-vermerk-email">{vermerkText(einwilligungAm, vermerk.email)}</span>}
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.checked })} data-testid="kontakt-whatsapp" />
          <span>
            <b className="font-medium">WhatsApp:</b> „{texte.whatsapp}“
            {whatsappAm && <span className="block text-xs text-slate-500" data-testid="kontakt-vermerk-whatsapp">{vermerkText(whatsappAm, vermerk.whatsapp)}</span>}
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={f.nachfassen} onChange={(e) => setF({ ...f, nachfassen: e.target.checked })} data-testid="kontakt-nachfassen" />
          <span>
            <b className="font-medium">Erinnerung an offene Vorschläge:</b> „{texte.nachfassen}“
            {nachfassAm && <span className="block text-xs text-slate-500" data-testid="kontakt-vermerk-nachfassen">{vermerkText(nachfassAm, vermerk.nachfassen)}</span>}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            Neue Einwilligung aufgenommen:
            <select className="input w-auto py-1" value={f.weg} onChange={(e) => setF({ ...f, weg: e.target.value as EinwilligungWeg })} data-testid="kontakt-weg">
              {(Object.keys(EINWILLIGUNG_WEGE) as EinwilligungWeg[]).map((w) => (
                <option key={w} value={w}>{EINWILLIGUNG_WEGE[w]}</option>
              ))}
            </select>
          </label>
          <button type="button" className="text-brand-700 underline" onClick={drucken} data-testid="kontakt-einwilligung-drucken">
            Formular zum Unterschreiben drucken
          </button>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-start gap-3">
        <button className="btn-secondary" disabled={busy}>Speichern</button>
        {whatsappAm && phone && <WhatsappSenden art="portal-link" id={patientId} label="Persönlichen Link per WhatsApp senden" className="btn-secondary" direkt={whatsappDirekt} />}
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`} data-testid="kontakt-meldung">{msg.ok && <Haken />}{msg.text}</span>}
      </div>
    </form>
  );
}
