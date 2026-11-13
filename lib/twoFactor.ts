import { generateSecret, generate, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ISSUER = "Sorrida";

export function createTotpSecret(): string {
  return generateSecret();
}

export async function totpQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(uri);
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: token.trim() });
    return result.valid;
  } catch {
    return false;
  }
}

// Nur für Tests/Diagnose - erzeugt den aktuell gültigen Code zu einem Secret.
export async function currentTotpToken(secret: string): Promise<string> {
  return generate({ secret });
}

const BACKUP_CODE_COUNT = 10;

// Einmal-Backup-Codes für den Fall, dass der Zugriff auf die Authenticator-
// App verloren geht (§ siehe README "Bekannte offene Punkte" - vorher gar
// nicht vorhanden). Format XXXX-XXXX aus großgeschriebenen Base32-ähnlichen
// Zeichen (ohne 0/O/1/I zur Verwechslungsvermeidung beim Abtippen).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export async function generateBackupCodes(): Promise<{ plain: string[]; hashesJoined: string }> {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, randomCode);
  const hashes = await Promise.all(plain.map((code) => bcrypt.hash(code, 10)));
  return { plain, hashesJoined: hashes.join(",") };
}

// Prüft einen eingegebenen Code gegen die gespeicherten Hashes und gibt bei
// Erfolg die um den verbrauchten Code bereinigte Hash-Liste zurück, damit
// derselbe Code nicht zweimal nutzbar ist. `null` = kein Treffer.
export async function consumeBackupCode(
  input: string,
  hashesJoined: string | null
): Promise<string | null> {
  if (!hashesJoined) return null;
  const hashes = hashesJoined.split(",").filter(Boolean);
  const normalized = input.trim().toUpperCase();

  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return remaining.join(",");
    }
  }
  return null;
}

/**
 * Erneute Bestätigung vor heiklen Änderungen bei aktiver 2FA (neues Gerät,
 * neue Backup-Codes): aktuelles Passwort und ein gültiger Code aus der App,
 * ersatzweise ein Backup-Code (wird dabei verbraucht). Eine übernommene
 * Sitzung allein reicht damit nicht, um die 2FA auszuhebeln.
 * `backupCodes` ist die Liste, die danach zu speichern ist.
 */
export async function bestaetigePasswortUndCode(
  konto: { passwordHash: string; totpSecret: string | null; totpBackupCodes: string | null },
  password: unknown,
  code: unknown,
): Promise<{ ok: true; backupCodes: string | null } | { ok: false; error: string }> {
  const pw = typeof password === "string" ? password : "";
  const c = typeof code === "string" ? code.trim() : "";
  if (!pw || !c) return { ok: false, error: "Bitte das aktuelle Passwort und einen aktuellen Code eingeben." };
  if (!(await bcrypt.compare(pw, konto.passwordHash))) return { ok: false, error: "Passwort ist falsch." };
  if (konto.totpSecret && (await verifyTotpToken(c, konto.totpSecret))) return { ok: true, backupCodes: konto.totpBackupCodes };
  const rest = await consumeBackupCode(c, konto.totpBackupCodes);
  if (rest === null) return { ok: false, error: "Der Code ist ungültig oder abgelaufen." };
  return { ok: true, backupCodes: rest || null };
}
