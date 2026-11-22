"use client";

import { useState } from "react";
import { fachText } from "@/lib/fachText";

// Empfangs-Tablet: eigene Kontaktdaten prüfen und berichtigen, Einwilligung in Nachrichten geben oder zurücknehmen.
export function EmpfangKontakt({ email: e0, phone: p0, mail: m0, whatsapp: w0, praxis, fach }: { email: string; phone: string; mail: boolean; whatsapp: boolean; praxis: string; /** Fach der Praxis: „in der Apotheke widerrufen“ (lib/fachText.ts) */ fach?: string | null }) {
  const [email, setEmail] = useState(e0);
  const [phone, setPhone] = useState(p0);
  const [mail, setMail] = useState(m0);
  const [whatsapp, setWhatsapp] = useState(w0);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [fehler, setFehler] = useState<string | null>(null);

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setFehler(null);
    const res = await fetch("/api/empfang/patient/kontakt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() || null, phone: phone.trim() || null, einwilligung: mail && !!email.trim(), whatsapp: whatsapp && !!phone.trim() }) }).catch(() => null);
    if (res?.ok) return setState("done");
    const d = await res?.json().catch(() => null);
    setState("idle");
    if (res?.status === 401) { window.location.replace("/uebergabe"); return; }
    setFehler(d?.error ?? "Speichern fehlgeschlagen. Bitte versuchen Sie es noch einmal.");
  }
  const geaendert = () => { if (state === "done") setState("idle"); };

  return (
    <form onSubmit={speichern} className="mt-4 space-y-3" data-testid="kontakt-formular">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">E-Mail-Adresse</span>
          <input className="input" type="email" inputMode="email" autoComplete="off" maxLength={200} value={email} onChange={(e) => { setEmail(e.target.value); geaendert(); }} data-testid="kontakt-email" /></label>
        <label className="block"><span className="label">Mobilnummer</span>
          <input className="input" type="tel" inputMode="tel" autoComplete="off" maxLength={40} value={phone} onChange={(e) => { setPhone(e.target.value); geaendert(); }} data-testid="kontakt-mobil" /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={mail} disabled={!email.trim()} onChange={(e) => { setMail(e.target.checked); geaendert(); }} data-testid="kontakt-mail-ok" /><span>{praxis} darf mir Nachrichten zu Terminen und Rechnungen per E-Mail schicken.</span></label>
      <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={whatsapp} disabled={!phone.trim()} onChange={(e) => { setWhatsapp(e.target.checked); geaendert(); }} data-testid="kontakt-whatsapp-ok" /><span>{praxis} darf mir solche Nachrichten per WhatsApp schicken. <span className="text-slate-500">WhatsApp ist ein Dienst von Meta.</span></span></label>
      <p className="text-xs text-slate-500">{fachText("Beides ist freiwillig. Sie können es jederzeit in der Praxis widerrufen.", fach)}</p>
      {fehler && <p className="text-sm text-red-700" role="alert" data-testid="kontakt-fehler">{fehler}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={state === "busy"} data-testid="kontakt-speichern">{state === "busy" ? "Speichert …" : "Stimmt so – speichern"}</button>
        {state === "done" && <span className="text-sm font-medium text-salbei-800" role="status" data-testid="kontakt-gespeichert">✓ Gespeichert</span>}
      </div>
    </form>
  );
}
