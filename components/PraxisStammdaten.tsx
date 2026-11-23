"use client";

import { useState } from "react";
import { Haken } from "@/components/Haken";
import { useRouter } from "next/navigation";
import type { Stammdaten } from "@/lib/praxisStammdaten";

import { useAppText } from "@/components/FachKontext";
const FELDER: { key: keyof Stammdaten; label: string; hilfe?: string; type?: string; placeholder?: string }[] = [
  { key: "inhaber", label: "Inhaberin, Inhaber oder Rechtsform", placeholder: "z. B. Dr. Anna Beispiel oder MVZ Beispiel GmbH" },
  { key: "strasse", label: "Straße und Hausnummer" },
  { key: "plzOrt", label: "PLZ und Ort" },
  { key: "telefon", label: "Telefon", type: "tel" },
  { key: "email", label: "E-Mail-Adresse der Praxis", type: "email" },
  // Beispiele je Fach kommen vom Server (stammdatenBeispiele in lib/praxisStammdaten.ts).
  { key: "berufsbezeichnung", label: "Berufsbezeichnung und Staat der Verleihung" },
  { key: "kammer", label: "Zuständige Kammer" },
  { key: "aufsicht", label: "Zuständige Aufsicht" },
  { key: "berufsordnungUrl", label: "Link zur Berufsordnung", type: "url", placeholder: "https://" },
  { key: "impressumUrl", label: "Link zum Impressum Ihrer Praxis", type: "url", placeholder: "https://", hilfe: "Falls Ihre Praxis eine eigene Website hat." },
  { key: "datenschutzUrl", label: "Link zu den Datenschutzhinweisen Ihrer Praxis", type: "url", placeholder: "https://", hilfe: "Die Information für Ihre Patienten nach Art. 13 DSGVO." },
];

/** Einstellungen: Angaben der Praxis, die Patienten im Portal, im Patienten-Link, im Anamnesebogen und in E-Mails sehen. */
export function PraxisStammdaten({ start, fehlt, beispiele }: { start: Stammdaten; fehlt: string[]; beispiele: { berufsbezeichnung: string; aufsicht: string } }) {
  const ft = useAppText();
  const router = useRouter();
  const [f, setF] = useState<Stammdaten>(start);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/praxis/stammdaten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg({ ok: false, text: (await res?.json().catch(() => null))?.error ?? "Speichern fehlgeschlagen." });
    setMsg({ ok: true, text: "Gespeichert." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4" data-testid="praxis-stammdaten" data-hilfe="praxis-angaben">
      {fehlt.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="stammdaten-fehlt">
          <b>Es fehlt noch:</b> {ft(fehlt.join(", "))}{ft(". Gegenüber Ihren Patienten sind Sie der Anbieter des Portals. Diese Angaben gehören deshalb auf jede Seite, die Ihre Patienten sehen.")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {FELDER.map((f0) => ({ ...f0, ...(f0.key === "berufsbezeichnung" ? { placeholder: beispiele.berufsbezeichnung } : f0.key === "aufsicht" ? { hilfe: beispiele.aufsicht } : {}) })).map((x) => (
          <label key={x.key} className="block text-sm text-slate-700">
            {ft(x.label)}
            <input
              className="input mt-1 w-full"
              type={x.type ?? "text"}
              value={f[x.key]}
              placeholder={x.placeholder}
              onChange={(e) => setF({ ...f, [x.key]: e.target.value })}
              data-testid={`stammdaten-${x.key}`}
            />
            {x.hilfe && <span className="mt-1 block text-xs text-slate-500">{ft(x.hilfe)}</span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy} data-testid="stammdaten-speichern">
          {busy ? "Wird gespeichert …" : "Speichern"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`} data-testid="stammdaten-meldung">
            {msg.ok && <Haken />}
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
