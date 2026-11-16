import { fehlerAufbereiten } from "@/lib/fehlerlog";

// Meldet einen Fehler aus dem Browser an das eigene Fehlerlog (POST /api/fehler, gleiche Herkunft).
// Schon im Browser bereinigt (lib/fehlerlog.ts): Der Pfad ohne Abfrage-Teil und Token, die Meldung gekürzt
// und ohne Namen, Adressen oder Nummern. Je Seitenaufruf wird derselbe Fehler nur einmal gemeldet.

const gemeldet = new Set<string>();

export function fehlerMelden(error: (Error & { digest?: string }) | null | undefined): void {
  try {
    if (typeof window === "undefined" || !error) return;
    // Fehler vom Server (mit Kennung) stehen schon im Fehlerlog (instrumentation.ts).
    if (error.digest) return;
    const f = fehlerAufbereiten({ quelle: "browser", ort: window.location.pathname, meldung: error.message, stack: error.stack });
    if (gemeldet.has(f.fingerabdruck) || gemeldet.size >= 5) return;
    gemeldet.add(f.fingerabdruck);
    void fetch("/api/fehler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ort: f.ort, meldung: f.meldung, stack: f.stack || undefined }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Das Melden darf die Fehlerseite nie stören.
  }
}
