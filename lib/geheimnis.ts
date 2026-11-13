// Schlüssel für eigene Signaturen (Vorschau-Cookie, "Mein Bereich", Stripe-Verbindung):
// das NEXTAUTH_SECRET. Lokal und in Tests gibt es ohne Secret einen festen
// Ersatzwert. In Produktion (NODE_ENV=production auf Vercel) wäre dieser Wert
// ein öffentlich bekannter Schlüssel, deshalb dort ein Fehler statt des Ersatzes.
// Geprüft wird erst beim Aufruf, nicht beim Laden der Datei und nicht während
// `next build`: Der Build läuft auch ohne Secret durch.
// Ohne Node-Module, weil die Middleware (Edge) dies ebenfalls nutzt.

const ERSATZ_LOKAL = "dev-secret-nur-lokal";

export function signaturSecret(env: Record<string, string | undefined> = process.env): string {
  if (env.NEXTAUTH_SECRET) return env.NEXTAUTH_SECRET;
  if (env.NODE_ENV === "production" && env.VERCEL_ENV && env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("NEXTAUTH_SECRET fehlt: In Vercel als Environment Variable setzen und neu deployen.");
  }
  return ERSATZ_LOKAL;
}
