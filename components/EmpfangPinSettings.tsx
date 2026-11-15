"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Einstellungen: vierstellige Empfangs-PIN festlegen oder ändern.
export function EmpfangPinSettings({ admin, gesetzt }: { admin: boolean; gesetzt: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [nochmal, setNochmal] = useState("");
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setMeldung({ art: "fehler", text: "Bitte genau vier Ziffern eingeben." });
    if (pin !== nochmal) return setMeldung({ art: "fehler", text: "Die beiden Eingaben sind verschieden." });
    setBusy(true); setMeldung(null);
    const res = await fetch("/api/settings/empfang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMeldung({ art: "fehler", text: d?.error ?? "Das hat nicht geklappt." });
    setPin(""); setNochmal("");
    setMeldung({ art: "ok", text: "Die Empfangs-PIN ist gespeichert." });
    router.refresh();
  }

  return (
    <section className="card space-y-4" data-testid="empfang-pin">
      <div>
        <h2 className="font-semibold text-slate-900">Empfangs-PIN</h2>
        <p className="mt-1 text-sm text-slate-600" data-testid="empfang-pin-stand">{gesetzt ? "Eine PIN ist festgelegt. Sie können sie hier ändern." : "Noch keine PIN festgelegt. Ohne PIN lässt sich das Tablet nicht an Patienten übergeben."}</p>
      </div>
      {meldung && <p role={meldung.art === "fehler" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${meldung.art === "fehler" ? "bg-red-50 text-red-800" : "bg-salbei-50 text-salbei-900"}`} data-testid="empfang-pin-meldung">{meldung.text}</p>}
      {admin ? (
        <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block"><span className="label">{gesetzt ? "Neue PIN (vier Ziffern)" : "PIN (vier Ziffern)"}</span>
            <input className="input" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} data-testid="empfang-pin-neu" /></label>
          <label className="block"><span className="label">PIN wiederholen</span>
            <input className="input" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" value={nochmal} onChange={(e) => setNochmal(e.target.value.replace(/\D/g, "").slice(0, 4))} data-testid="empfang-pin-nochmal" /></label>
          <button className="btn btn-primary" disabled={busy || pin.length !== 4 || nochmal.length !== 4} data-testid="empfang-pin-speichern">{busy ? "Speichert …" : "Speichern"}</button>
        </form>
      ) : (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Nur die Geschäftsführung kann die Empfangs-PIN festlegen.</p>
      )}
      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
        <li>Die PIN gilt für die ganze Praxis. Geben Sie sie nur an das Team am Empfang.</li>
        <li>Nach 5 falschen Eingaben ist die PIN 5 Minuten gesperrt. Nach der dritten Sperre in Folge hilft nur die Anmeldung mit E-Mail und Passwort.</li>
        <li>Gespeichert wird die PIN nicht lesbar. Wer sie vergisst, legt hier eine neue fest.</li>
      </ul>
    </section>
  );
}
