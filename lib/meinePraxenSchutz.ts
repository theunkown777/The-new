import { GEPARKT_COOKIE, UEBERGABE_COOKIE, istSitzungCookie } from "@/lib/empfang";
import { BEREICH_COOKIE } from "@/lib/bereichSchutz";

// Darf das Portal anbieten, die Praxis „auf diesem Gerät“ zu merken? Website, Praxis-App und Portal laufen unter
// derselben Adresse und teilen sich den Speicher des Browsers (proxy.ts). Auf einem Gerät der Praxis (angemeldetes
// Konto, Empfangs-Tablet mit Übergabe, geparkte Sitzung, entsperrter „Mein Bereich“) soll keine Liste mit
// Patienten-Links entstehen. Deshalb entscheidet der Server anhand der Cookie-Namen; die Werte liest er dafür nicht.
// Nur auf dem Server benutzen: lib/empfang.ts und lib/bereichSchutz.ts brauchen Node-Krypto.

/** Cookies, die zeigen, dass das Gerät gerade einer Praxis dient. */
export const PRAXIS_GERAET_COOKIES = [UEBERGABE_COOKIE, GEPARKT_COOKIE, BEREICH_COOKIE] as const;

export function praxisGeraet(cookieNamen: readonly string[]): boolean {
  return cookieNamen.some((n) => istSitzungCookie(n) || (PRAXIS_GERAET_COOKIES as readonly string[]).includes(n));
}

/** Knopf „Diese Praxis auf diesem Gerät merken“ und der Link zur Liste erscheinen nur auf Geräten ohne Praxis-Sitzung. */
export const darfAufGeraetMerken = (cookieNamen: readonly string[]) => !praxisGeraet(cookieNamen);
