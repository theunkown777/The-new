import type { JWT } from "next-auth/jwt";
import { zweiFaktorPflicht } from "@/lib/zweiFaktorPflicht";

// Sitzungen laufen als signiertes Token im Cookie. Damit ein entferntes Konto,
// eine geänderte Rolle oder ein zurückgesetztes Passwort sofort wirken, wird
// das Token bei jedem Abruf mit dem Konto abgeglichen (lib/auth.ts).

/** Längste Sitzungsdauer: ein Arbeitstag. */
export const SITZUNG_MAX_SEKUNDEN = 12 * 60 * 60;

export type SitzungsKonto = {
  id: string;
  role: string;
  practiceId: string;
  sessionVersion: number;
  totpEnabled: boolean;
  practice: { name: string; require2faAll: boolean; isDemo: boolean };
};

/**
 * Token gegen den aktuellen Stand des Kontos prüfen. Konto gelöscht oder
 * sessionVersion anders (auch: Token von vor der Einführung, ohne Stand):
 * Sitzung widerrufen. Sonst Rolle und Praxis frisch aus der Datenbank.
 * mfaPending fällt nie ohne Neuanmeldung weg: Wer die Zwei-Faktor-Anmeldung
 * gerade erst eingerichtet hat, meldet sich einmal neu an, diesmal mit Code.
 */
export function tokenAbgleichen(token: JWT, konto: SitzungsKonto | null): JWT {
  if (token.widerrufen) return token;
  if (!konto || token.sessionVersion !== konto.sessionVersion) return { ...token, widerrufen: true };
  const pflichtOffen = !konto.totpEnabled && zweiFaktorPflicht({ role: konto.role, require2faAll: konto.practice.require2faAll, isDemo: konto.practice.isDemo });
  return {
    ...token,
    role: konto.role,
    practiceId: konto.practiceId,
    practiceName: konto.practice.name,
    mfaPending: !!token.mfaPending || pflichtOffen,
  };
}

/** Für Middleware und Layout: Gibt es ein Token, und ist es nicht widerrufen? */
export const tokenGueltig = (token: { widerrufen?: boolean } | null | undefined): boolean => !!token && !token.widerrufen;
