// next-auth leitet bei fehlerhafter Server-Konfiguration (z. B. ohne
// NEXTAUTH_SECRET) auf eine leere Fehlerseite um. Vorab prüfen, damit Login
// und Gastzugang stattdessen einen verständlichen Hinweis zeigen.
export async function authServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/providers", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export const AUTH_UNAVAILABLE_MESSAGE =
  "Der Anmeldedienst ist nicht richtig eingerichtet (meist fehlt NEXTAUTH_SECRET in den Vercel-Einstellungen). Details unter /api/status.";
