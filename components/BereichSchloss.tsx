"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Modus = "setzen" | "entsperren" | "zuruecksetzen" | "aendern";

async function senden(body: Record<string, string>) {
  const res = await fetch("/api/mein-bereich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (res?.ok) return null;
  const d = await res?.json().catch(() => null);
  return (d?.error as string) ?? "Das hat nicht geklappt. Bitte erneut versuchen.";
}

/** Schloss vor "Mein Bereich": Passwort vergeben, entsperren oder zurücksetzen. */
export function BereichSchloss({ start, demo, name }: { start: "setzen" | "entsperren"; demo: boolean; name: string }) {
  const router = useRouter();
  const [modus, setModus] = useState<Modus>(start);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [login, setLogin] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const neu = modus === "setzen" || modus === "zuruecksetzen";

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler("");
    if (neu && pw !== pw2) return setFehler("Die beiden Eingaben stimmen nicht überein.");
    setLaeuft(true);
    const f =
      modus === "setzen"
        ? await senden({ aktion: "setzen", passwort: pw, ...(demo ? {} : { anmeldePasswort: login }) })
        : modus === "zuruecksetzen"
          ? await senden({ aktion: "zuruecksetzen", neu: pw, ...(demo ? {} : { anmeldePasswort: login }) })
          : await senden({ aktion: "entsperren", passwort: pw });
    setLaeuft(false);
    if (f) return setFehler(f);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-8" data-testid="bereich-schloss">
      <div className="card">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <h1 className="font-display text-3xl text-slate-900">Mein Bereich</h1>
        <p className="mt-1 text-sm text-slate-600">
          {modus === "setzen" && `${name}, legen Sie ein eigenes Passwort fest. Ohne dieses Passwort sieht niemand Ihren Patientenstamm und Ihren Umsatz, auch nicht am selben Rechner.`}
          {modus === "entsperren" && `Ihr Patientenstamm und Ihr Umsatz sind geschützt. Bitte geben Sie Ihr Bereichs-Passwort ein.`}
          {modus === "zuruecksetzen" && "Neues Passwort für Mein Bereich festlegen."}
        </p>
        <form onSubmit={absenden} className="mt-4 space-y-3">
          <label className="block">
            <span className="label">{neu ? "Neues Bereichs-Passwort" : "Bereichs-Passwort"}</span>
            <input type="password" className="input" autoComplete={neu ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={neu ? 6 : 1} autoFocus />
          </label>
          {neu && (
            <label className="block">
              <span className="label">Noch einmal eingeben</span>
              <input type="password" className="input" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            </label>
          )}
          {neu && !demo && (
            <label className="block">
              <span className="label">Zur Bestätigung: Ihr Anmeldepasswort</span>
              <input type="password" className="input" autoComplete="current-password" value={login} onChange={(e) => setLogin(e.target.value)} required />
            </label>
          )}
          {neu && <p className="text-xs text-slate-500">Mindestens 6 Zeichen. Nach 5 Fehlversuchen ist der Bereich 15 Minuten gesperrt; nach 30 Minuten schließt er sich von selbst.</p>}
          {neu && demo && <p className="text-xs text-slate-500">Im Gastzugang reicht das neue Passwort. In der echten Praxis bestätigen Sie es mit Ihrem Anmeldepasswort.</p>}
          {fehler && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {fehler}
            </p>
          )}
          <button className="btn-primary w-full py-2.5" disabled={laeuft}>
            {modus === "entsperren" ? "Öffnen" : "Passwort speichern und öffnen"}
          </button>
        </form>
        {modus === "entsperren" && (
          <button type="button" className="mt-3 text-sm text-brand-700 underline" onClick={() => { setModus("zuruecksetzen"); setFehler(""); setPw(""); }}>
            Passwort vergessen?
          </button>
        )}
        {modus === "zuruecksetzen" && (
          <button type="button" className="mt-3 text-sm text-slate-500 underline" onClick={() => { setModus("entsperren"); setFehler(""); }}>
            Zurück
          </button>
        )}
      </div>
    </div>
  );
}

/** Kopfzeile im geöffneten Bereich: sperren und Passwort ändern. */
export function BereichAktionen() {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="bereich-aktionen">
      <button
        type="button"
        className="btn-secondary py-1.5"
        onClick={async () => {
          await senden({ aktion: "sperren" });
          router.refresh();
        }}
      >
        Bereich sperren
      </button>
      <button type="button" className="text-slate-500 underline" onClick={() => setOffen(!offen)} aria-expanded={offen}>
        Passwort ändern
      </button>
      {offen && (
        <form
          className="flex w-full flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = await senden({ aktion: "aendern", passwort: alt, neu });
            setMsg(f ?? "Gespeichert.");
            if (!f) {
              setAlt("");
              setNeu("");
            }
          }}
        >
          <input type="password" className="input w-44 py-1.5" placeholder="bisheriges" aria-label="Bisheriges Passwort" value={alt} onChange={(e) => setAlt(e.target.value)} required />
          <input type="password" className="input w-44 py-1.5" placeholder="neues (mind. 6)" aria-label="Neues Passwort" value={neu} onChange={(e) => setNeu(e.target.value)} required minLength={6} />
          <button className="btn-primary py-1.5">Speichern</button>
          {msg && <span className="text-xs text-slate-600" role="status">{msg}</span>}
        </form>
      )}
    </div>
  );
}
