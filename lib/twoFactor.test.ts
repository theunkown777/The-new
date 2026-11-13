import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { bestaetigePasswortUndCode, createTotpSecret, currentTotpToken, generateBackupCodes, consumeBackupCode } from "@/lib/twoFactor";

describe("generateBackupCodes", () => {
  it("erzeugt 10 eindeutige Codes im Format XXXX-XXXX", async () => {
    const { plain, hashesJoined } = await generateBackupCodes();

    expect(plain).toHaveLength(10);
    expect(new Set(plain).size).toBe(10);
    for (const code of plain) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
    expect(hashesJoined.split(",")).toHaveLength(10);
  });
});

describe("consumeBackupCode", () => {
  it("akzeptiert einen gültigen Code und entfernt ihn aus der verbleibenden Liste", async () => {
    const { plain, hashesJoined } = await generateBackupCodes();
    const target = plain[3];

    const remaining = await consumeBackupCode(target, hashesJoined);

    expect(remaining).not.toBeNull();
    expect(remaining!.split(",")).toHaveLength(9);
  });

  it("ist case-insensitive (Kleinbuchstaben werden akzeptiert)", async () => {
    const { plain, hashesJoined } = await generateBackupCodes();
    const target = plain[0].toLowerCase();

    const remaining = await consumeBackupCode(target, hashesJoined);

    expect(remaining).not.toBeNull();
  });

  it("lehnt einen unbekannten Code ab", async () => {
    const { hashesJoined } = await generateBackupCodes();

    const remaining = await consumeBackupCode("ZZZZ-ZZZZ", hashesJoined);

    expect(remaining).toBeNull();
  });

  it("lehnt denselben Code beim zweiten Versuch ab (Einmalnutzung)", async () => {
    const { plain, hashesJoined } = await generateBackupCodes();
    const target = plain[5];

    const afterFirstUse = await consumeBackupCode(target, hashesJoined);
    const afterSecondUse = await consumeBackupCode(target, afterFirstUse);

    expect(afterSecondUse).toBeNull();
  });

  it("gibt null zurück, wenn keine Backup-Codes hinterlegt sind", async () => {
    const remaining = await consumeBackupCode("ABCD-EFGH", null);
    expect(remaining).toBeNull();
  });
});

describe("bestaetigePasswortUndCode", () => {
  const konto = async () => {
    const totpSecret = createTotpSecret();
    const { plain, hashesJoined } = await generateBackupCodes();
    return { plain, konto: { passwordHash: await bcrypt.hash("geheim-123", 4), totpSecret, totpBackupCodes: hashesJoined } };
  };

  it("verlangt Passwort und Code", async () => {
    const { konto: k } = await konto();
    expect((await bestaetigePasswortUndCode(k, "", "123456")).ok).toBe(false);
    expect((await bestaetigePasswortUndCode(k, "geheim-123", undefined)).ok).toBe(false);
  });
  it("lehnt falsches Passwort ab, auch mit gültigem Code", async () => {
    const { konto: k } = await konto();
    const r = await bestaetigePasswortUndCode(k, "falsch", await currentTotpToken(k.totpSecret));
    expect(r).toEqual({ ok: false, error: "Passwort ist falsch." });
  });
  it("lehnt falschen Code ab, auch mit richtigem Passwort", async () => {
    const { konto: k } = await konto();
    expect((await bestaetigePasswortUndCode(k, "geheim-123", "ZZZZ-ZZZZ")).ok).toBe(false);
  });
  it("akzeptiert Passwort mit aktuellem Code; die Backup-Codes bleiben", async () => {
    const { konto: k } = await konto();
    const r = await bestaetigePasswortUndCode(k, "geheim-123", await currentTotpToken(k.totpSecret));
    expect(r).toEqual({ ok: true, backupCodes: k.totpBackupCodes });
  });
  it("akzeptiert ersatzweise einen Backup-Code und verbraucht ihn", async () => {
    const { konto: k, plain } = await konto();
    const r = await bestaetigePasswortUndCode(k, "geheim-123", plain[2]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backupCodes!.split(",")).toHaveLength(9);
  });
});
