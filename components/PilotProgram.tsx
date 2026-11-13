"use client";

import { useState } from "react";
import Link from "next/link";
import { LEAD_PVS_DENTAL, LEAD_PVS_MEDICAL, LEAD_PVS_THERAPIE } from "@/lib/leads";

// Neukundengewinnung je Fach: Pilotprogramm mit Anfrageformular. Schickt an
// /api/leads (Honeypot, Rate-Limit, Benachrichtigung an LEAD_NOTIFY_EMAIL).
export function PilotProgram({ fach, kurz, dental = false, therapie = false }: { fach: string; kurz: string; dental?: boolean; therapie?: boolean }) {
  const [form, setForm] = useState({ practiceName: "", contactName: "", dentists: "1", contact: "", pvs: "", callbackTime: "egal", website: "" });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const pvsList: readonly string[] = dental ? LEAD_PVS_DENTAL : therapie ? LEAD_PVS_THERAPIE : LEAD_PVS_MEDICAL;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return setError("Bitte der Speicherung Ihrer Angaben zustimmen.");
    setState("sending");
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pvs: form.pvs || undefined, specialty: fach }),
    }).catch(() => null);
    if (res?.ok) return setState("done");
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Senden hat nicht geklappt. Bitte später erneut versuchen.");
    setState("idle");
  }

  return (
    <section id="pilot" className="mt-14 grid scroll-mt-6 gap-8 rounded-3xl bg-white p-6 sm:p-10 lg:grid-cols-2" data-testid="pilot-program">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-brand-700">Pilotprogramm {kurz}</p>
        <h2 className="font-display text-4xl text-slate-900">Wir suchen zehn Pilotpraxen in Ihrem Fach</h2>
        <p className="text-slate-600">
          Sorrida ist neu. Bevor wir es breit anbieten, prüfen wir es mit zehn Praxen je Fach im echten Alltag und schärfen das Regelwerk
          gemeinsam mit Ihnen.
        </p>
        <ul className="space-y-2 text-slate-700">
          <li><b>Drei Monate kostenlos</b>, danach dauerhaft 30 % günstiger</li>
          <li><b>Persönliche Einrichtung</b> mit Ihren Leistungen und Preisen</li>
          <li><b>Ihr Fach-Regelwerk</b> mitgestalten: was Patienten am häufigsten fragen, steht danach im Vorschlag</li>
          <li><b>Ihr Teil:</b> ein 30-Minuten-Gespräch im Monat, in dem Sie sagen, was stört</li>
        </ul>
        <p className="text-sm text-slate-500">
          Lieber erst selbst ansehen?{" "}
          <Link href={`/demo?fach=${fach}`} className="text-brand-700 underline">
            Demo-Praxis öffnen
          </Link>
          , ohne Anmeldung.
        </p>
      </div>

      {state === "done" ? (
        <div className="self-center rounded-2xl bg-emerald-50 p-6 text-emerald-900" role="status">
          <b>Danke, Ihre Anfrage ist angekommen.</b>
          <p className="mt-1 text-sm">Wir melden uns innerhalb von zwei Werktagen zu Ihrer Wunschzeit.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div>
            <label className="label" htmlFor="p-praxis">Praxis</label>
            <input id="p-praxis" className="input" required value={form.practiceName} onChange={set("practiceName")} placeholder={`z. B. ${kurz} am Markt`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-name">Ihr Name</label>
              <input id="p-name" className="input" required value={form.contactName} onChange={set("contactName")} />
            </div>
            <div>
              <label className="label" htmlFor="p-beh">{dental ? "Behandler" : therapie ? "Therapeutinnen und Therapeuten" : "Ärztinnen und Ärzte"}</label>
              <select id="p-beh" className="input" value={form.dentists} onChange={set("dentists")}>
                {["1", "2–3", "4–5", "mehr als 5"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="p-kontakt">Telefon oder E-Mail</label>
            <input id="p-kontakt" className="input" required value={form.contact} onChange={set("contact")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-pvs">Praxissoftware</label>
              <select id="p-pvs" className="input" value={form.pvs} onChange={set("pvs")}>
                <option value="">bitte wählen</option>
                {[...pvsList, "andere", "weiß nicht"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-zeit">Rückruf am besten</label>
              <select id="p-zeit" className="input" value={form.callbackTime} onChange={set("callbackTime")}>
                {["egal", "vormittags", "mittags", "nachmittags"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div aria-hidden="true" className="absolute -left-[9999px]">
            <label htmlFor="p-web">Website</label>
            <input id="p-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Ich bin einverstanden, dass Sorrida meine Angaben speichert, um mich wegen des Pilotprogramms zu kontaktieren (
              <Link href="/datenschutz" className="underline">Datenschutz</Link>).
            </span>
          </label>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={state === "sending"}>
            {state === "sending" ? "Wird gesendet …" : "Pilotplatz anfragen"}
          </button>
        </form>
      )}
    </section>
  );
}
