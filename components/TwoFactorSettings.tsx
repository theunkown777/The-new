"use client";

import { useState } from "react";

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // Ist die 2FA schon aktiv, verlangen Gerätewechsel und neue Backup-Codes das
  // aktuelle Passwort und einen aktuellen Code; die Felder erscheinen erst dann.
  const [bestaetigung, setBestaetigung] = useState<"geraet" | "codes" | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

  function bestaetigungSchliessen() {
    setBestaetigung(null);
    setConfirmPassword("");
    setConfirmCode("");
  }

  // Erst-Einrichtung ohne Zusatzabfrage; bei aktiver 2FA mit Passwort und Code.
  async function startSetup(nachweis?: { password: string; token: string }) {
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nachweis ?? {}),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Setup konnte nicht gestartet werden.");
      return;
    }
    bestaetigungSchliessen();
    setBackupCodes(null);
    setSetupData(data);
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Code konnte nicht bestätigt werden.");
      return;
    }
    setMessage(
      enabled
        ? "Das neue Gerät ist eingerichtet. Das bisherige Gerät und die alten Backup-Codes gelten nicht mehr."
        : "Zwei-Faktor-Authentifizierung ist jetzt aktiv.",
    );
    setEnabled(true);
    setSetupData(null);
    setCode("");
    setBackupCodes(data.backupCodes ?? null);
  }

  async function regenerateBackupCodes(nachweis: { password: string; token: string }) {
    setRegenerating(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/2fa/backup-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nachweis),
    });
    const data = await res.json();
    setRegenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Neue Codes konnten nicht erzeugt werden.");
      return;
    }
    bestaetigungSchliessen();
    setBackupCodes(data.backupCodes);
    setMessage("Neue Backup-Codes erzeugt. Die vorherigen Codes sind ab sofort ungültig.");
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Deaktivieren fehlgeschlagen.");
      return;
    }
    setEnabled(false);
    setPassword("");
    setBackupCodes(null);
    setSetupData(null);
    bestaetigungSchliessen();
    setMessage("Zwei-Faktor-Authentifizierung wurde deaktiviert.");
  }

  function bestaetigen(e: React.FormEvent) {
    e.preventDefault();
    const nachweis = { password: confirmPassword, token: confirmCode };
    if (bestaetigung === "codes") void regenerateBackupCodes(nachweis);
    else void startSetup(nachweis);
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-slate-900">Zwei-Faktor-Authentifizierung (2FA)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Zusätzlich zum Passwort wird beim Anmelden ein Code aus einer Authenticator-App
            (z. B. Google Authenticator, Authy) verlangt.
          </p>
        </div>
        <span
          className={
            enabled
              ? "shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
              : "shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          }
        >
          {enabled ? "Aktiv" : "Inaktiv"}
        </span>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      {!enabled && !setupData && (
        <button onClick={() => startSetup()} disabled={loading} className="btn-primary">
          2FA einrichten
        </button>
      )}

      {setupData && (
        <form onSubmit={confirmEnable} className="space-y-3">
          <p className="text-sm text-slate-600">
            QR-Code mit der Authenticator-App scannen (oder den Schlüssel manuell eingeben) und
            anschließend den generierten 6-stelligen Code hier bestätigen:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setupData.qrDataUrl} alt="QR-Code für 2FA-Setup" className="h-40 w-40" />
          <p className="font-mono text-xs text-slate-500 break-all">
            Schlüssel (manuelle Eingabe): {setupData.secret}
          </p>
          <div>
            <label className="label" htmlFor="totp-code">Bestätigungscode</label>
            <input
              id="totp-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {enabled ? "Neues Gerät aktivieren" : "2FA aktivieren"}
          </button>
        </form>
      )}

      {backupCodes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Backup-Codes – jetzt sicher speichern (werden nicht erneut angezeigt)
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Jeder Code funktioniert einmalig als Ersatz für den Authenticator-Code, falls Sie
            keinen Zugriff mehr auf die App haben.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-900">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {enabled && (
        <>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Backup-Codes</p>
              <p className="text-xs text-slate-500">
                Für den Fall, dass die Authenticator-App nicht verfügbar ist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setBestaetigung("codes"); }}
              disabled={regenerating || bestaetigung === "codes"}
              className="btn-secondary shrink-0"
            >
              {regenerating ? "Erzeugt…" : "Neue Codes generieren"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Neues Gerät</p>
              <p className="text-xs text-slate-500">
                Authenticator-App auf einem anderen Gerät einrichten. Das bisherige Gerät gilt, bis das neue bestätigt ist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setBestaetigung("geraet"); }}
              disabled={loading || bestaetigung === "geraet" || !!setupData}
              className="btn-secondary shrink-0"
            >
              Neues Gerät einrichten
            </button>
          </div>

          {bestaetigung && (
            <form onSubmit={bestaetigen} className="space-y-3 rounded-lg border border-slate-200 p-3" data-testid="zwei-faktor-bestaetigung">
              <p className="text-sm text-slate-600">
                {bestaetigung === "codes"
                  ? "Neue Backup-Codes ersetzen die bisherigen. Bitte bestätigen Sie mit Passwort und aktuellem Code."
                  : "Für ein neues Gerät bestätigen Sie bitte mit Passwort und aktuellem Code."}
              </p>
              <div>
                <label className="label" htmlFor="bestaetigung-passwort">Aktuelles Passwort</label>
                <input
                  id="bestaetigung-passwort"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="bestaetigung-code">Aktueller Code aus der App (oder ein Backup-Code)</label>
                <input
                  id="bestaetigung-code"
                  className="input"
                  autoComplete="one-time-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading || regenerating} className="btn-primary">Bestätigen</button>
                <button type="button" onClick={bestaetigungSchliessen} className="btn-secondary">Abbrechen</button>
              </div>
            </form>
          )}

          <form onSubmit={disable} className="space-y-3">
            <div>
              <label className="label" htmlFor="disable-password">
                Passwort zur Bestätigung, um 2FA zu deaktivieren
              </label>
              <input
                id="disable-password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-secondary">
              2FA deaktivieren
            </button>
          </form>
        </>
      )}
    </div>
  );
}
