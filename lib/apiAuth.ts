import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

const API_RATE_LIMIT = 60;
const API_RATE_WINDOW_MS = 60 * 1000;

const KEY_PREFIX = "zbk_live_";

// API-Keys sind bereits hochentropische Zufallswerte (kein von Menschen
// gewähltes Passwort), daher genügt ein schneller Hash (SHA-256) statt
// bcrypt - die langsame Kostenfunktion von bcrypt schützt vor Brute-Force
// auf schwache Passwörter, was hier nicht das Bedrohungsmodell ist.
export function generateApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX.length + 8);
}

export interface ApiAuthResult {
  /** fach: Fachrichtung, für die der Schlüssel ausgestellt ist (null bei älteren Schlüsseln). */
  client?: { id: string; name: string; fach: string | null };
  error?: string;
  status?: number;
}

/**
 * Authentifiziert einen Request der Partner-API (Authorization: Bearer <key>).
 * Zustandslos gegenüber Patientendaten - hier wird nur der API-Client
 * selbst nachgeschlagen, keine Praxis-/Patientendaten des Partners.
 */
export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: "Fehlender oder ungültiger Authorization-Header (erwartet: Bearer <API-Key>).", status: 401 };
  }

  const key = match[1].trim();
  const hash = hashApiKey(key);

  const client = await prisma.apiClient.findUnique({ where: { apiKeyHash: hash } });
  if (!client || !client.active) {
    return { error: "Ungültiger oder deaktivierter API-Key.", status: 401 };
  }

  prisma.apiClient
    .update({ where: { id: client.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { client: { id: client.id, name: client.name, fach: client.fach } };
}

/**
 * Kombiniert Authentifizierung und Rate-Limiting (60 Requests/Minute je
 * API-Client) für die Partner-API-Routen - vermeidet doppelten Code in
 * jedem Endpunkt.
 */
export async function authenticateAndRateLimitApiRequest(req: Request): Promise<ApiAuthResult> {
  const auth = await authenticateApiRequest(req);
  if (!auth.client) return auth;

  const rateLimitKey = `apiv1:${auth.client.id}`;
  if (await isRateLimited(rateLimitKey, API_RATE_LIMIT, API_RATE_WINDOW_MS)) {
    return { error: "Rate limit überschritten (60 Anfragen/Minute je API-Key).", status: 429 };
  }
  await recordAttempt(rateLimitKey, API_RATE_WINDOW_MS);

  return auth;
}
