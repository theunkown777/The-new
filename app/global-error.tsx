"use client";

import { useEffect } from "react";
import { fehlerMelden } from "@/components/fehlerMelden";

// Letzte Fehlerseite: greift, wenn der Rahmen der ganzen Seite (app/layout.tsx) nicht geladen werden kann.
// Sie ersetzt den Rahmen und bringt deshalb <html> und <body> selbst mit; die Gestaltung steht direkt hier,
// weil das Stylesheet in diesem Fall fehlen kann. Keine Technik für Besucher; der Fehler geht bereinigt an das eigene Fehlerlog.
export default function GlobalerFehler({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { fehlerMelden(error); }, [error]);
  return (
    <html lang="de">
      <body style={{ margin: 0, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F2EE", color: "#24201F", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "64px 16px", boxSizing: "border-box", textAlign: "center" }}>
        <main style={{ maxWidth: 448 }} data-testid="fehlerseite-global">
          <h1 style={{ fontSize: 32, lineHeight: 1.2, fontWeight: 600, margin: 0 }}>Das hat nicht geklappt</h1>
          <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, color: "#5C5450" }}>
            Beim Laden ist ein Fehler aufgetreten. Ihre Daten sind nicht verloren. Bitte versuchen Sie es noch einmal. Wenn es wieder passiert, rufen Sie bitte in Ihrer Praxis an oder schreiben Sie uns.
          </p>
          <button
            type="button"
            onClick={reset}
            data-testid="fehler-nochmal"
            style={{ marginTop: 24, minHeight: 44, padding: "10px 20px", fontSize: 16, fontWeight: 600, color: "#ffffff", background: "#5A1D1D", border: 0, borderRadius: 8, cursor: "pointer" }}
          >
            Noch einmal versuchen
          </button>
        </main>
      </body>
    </html>
  );
}
