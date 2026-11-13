"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";

// Fehlerseite für den angemeldeten Bereich (sonst wie app/error.tsx). Wird eine Sitzung beendet
// (Passwort zurückgesetzt, Konto entfernt, Rolle geändert), merkt das beim
// Wechsel zwischen Seiten erst die Seite selbst, nicht das Layout: Dann führt
// der Weg zur Anmeldung statt zu einer Fehlermeldung.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [angemeldet, setAngemeldet] = useState<boolean | null>(null);

  useEffect(() => {
    getSession()
      .then((s) => {
        if (s) setAngemeldet(true);
        else window.location.assign("/login");
      })
      .catch(() => setAngemeldet(true));
  }, []);

  if (!angemeldet) return <p className="card mx-auto max-w-xl text-sm text-slate-500">Einen Moment…</p>;
  return (
    <div className="card mx-auto max-w-xl space-y-3" data-testid="app-fehler">
      <h1 className="font-display text-2xl text-slate-900">Das hat nicht geklappt</h1>
      <p className="text-sm text-slate-600">
        Beim Laden ist ein Fehler aufgetreten. Ihre Daten sind nicht verloren. Bitte versuchen Sie es noch einmal; wenn es wieder passiert, schreiben Sie uns über „Hilfe“.
      </p>
      <button type="button" onClick={reset} className="btn-primary">Noch einmal versuchen</button>
    </div>
  );
}
