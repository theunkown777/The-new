import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createTotpSecret, currentTotpToken, generateBackupCodes } from "@/lib/twoFactor";

// Die Routen unter /api/settings/2fa mit nachgestellter Sitzung und Datenbank:
// Eine offene Sitzung allein darf eine aktive 2FA weder ersetzen noch aushebeln.
type Konto = { id: string; email: string; passwordHash: string; totpSecret: string | null; totpPendingSecret: string | null; totpEnabled: boolean; totpBackupCodes: string | null };
let konto: Konto;
const sitzungenBeenden = vi.fn();

vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: konto.id, name: "Test", practiceId: "p1" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ auditFromSession: async () => {}, audit: async () => {} }));
vi.mock("@/lib/sitzungCookie", () => ({ sitzungenBeenden: (...a: unknown[]) => sitzungenBeenden(...a) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => konto,
      update: async ({ data }: { data: Partial<Konto> }) => Object.assign(konto, data),
    },
  },
}));

const post = (body?: unknown) => new Request("http://localhost/api", { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) });
const setup = async (body?: unknown) => (await import("@/app/api/settings/2fa/setup/route")).POST(post(body));
const enable = async (body?: unknown) => (await import("@/app/api/settings/2fa/enable/route")).POST(post(body));
const codes = async (body?: unknown) => (await import("@/app/api/settings/2fa/backup-codes/route")).POST(post(body));

let nr = 0;
beforeEach(async () => {
  sitzungenBeenden.mockReset();
  konto = { id: `u${++nr}`, email: "a@x.de", passwordHash: await bcrypt.hash("geheim-123", 4), totpSecret: null, totpPendingSecret: null, totpEnabled: false, totpBackupCodes: null };
});

describe("2FA: Erst-Einrichtung", () => {
  it("läuft ohne Zusatzabfrage; aktiv wird die 2FA erst nach gültigem Code", async () => {
    const res = await setup();
    expect(res.status).toBe(200);
    const { secret, qrDataUrl } = await res.json();
    expect(qrDataUrl).toMatch(/^data:image\/png/);
    expect(konto).toMatchObject({ totpPendingSecret: secret, totpSecret: null, totpEnabled: false });

    expect((await enable({ token: "000000" })).status).toBe(400);
    expect(konto.totpEnabled).toBe(false);

    const ok = await enable({ token: await currentTotpToken(secret) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).backupCodes).toHaveLength(10);
    expect(konto).toMatchObject({ totpSecret: secret, totpPendingSecret: null, totpEnabled: true });
    expect(sitzungenBeenden).toHaveBeenCalledWith(konto.id, { eigeneBehalten: true });
  });
  it("ohne gestartete Einrichtung lässt sich nichts aktivieren", async () => {
    expect((await enable({ token: "123456" })).status).toBe(400);
    expect(sitzungenBeenden).not.toHaveBeenCalled();
  });
});

describe("2FA: bereits aktiv", () => {
  let altesSecret: string;
  let alteCodes: string;
  beforeEach(async () => {
    altesSecret = createTotpSecret();
    alteCodes = (await generateBackupCodes()).hashesJoined;
    Object.assign(konto, { totpSecret: altesSecret, totpEnabled: true, totpBackupCodes: alteCodes });
  });

  it("setup ohne Passwort und Code ändert nichts", async () => {
    for (const body of [undefined, {}, { password: "geheim-123" }, { password: "falsch", token: await currentTotpToken(altesSecret) }, { password: "geheim-123", token: "000000" }]) {
      expect((await setup(body)).status).toBe(400);
    }
    expect(konto).toMatchObject({ totpSecret: altesSecret, totpEnabled: true, totpPendingSecret: null, totpBackupCodes: alteCodes });
  });
  it("Gerätewechsel: das alte Gerät gilt, bis das neue bestätigt ist", async () => {
    const res = await setup({ password: "geheim-123", token: await currentTotpToken(altesSecret) });
    expect(res.status).toBe(200);
    const { secret } = await res.json();
    expect(secret).not.toBe(altesSecret);
    expect(konto).toMatchObject({ totpSecret: altesSecret, totpEnabled: true, totpPendingSecret: secret });

    // Ein Code des alten Geräts bestätigt das neue nicht.
    const alterCode = await currentTotpToken(altesSecret);
    if (alterCode !== (await currentTotpToken(secret))) expect((await enable({ token: alterCode })).status).toBe(400);
    expect(konto.totpSecret).toBe(altesSecret);

    expect((await enable({ token: await currentTotpToken(secret) })).status).toBe(200);
    expect(konto).toMatchObject({ totpSecret: secret, totpPendingSecret: null, totpEnabled: true });
    expect(konto.totpBackupCodes).not.toBe(alteCodes);
  });
  it("neue Backup-Codes nur mit Passwort und aktuellem Code", async () => {
    expect((await codes()).status).toBe(400);
    expect((await codes({ password: "geheim-123" })).status).toBe(400);
    expect(konto.totpBackupCodes).toBe(alteCodes);
    const res = await codes({ password: "geheim-123", token: await currentTotpToken(altesSecret) });
    expect(res.status).toBe(200);
    expect((await res.json()).backupCodes).toHaveLength(10);
    expect(konto.totpBackupCodes).not.toBe(alteCodes);
  });
  it("begrenzt das Durchprobieren der Bestätigung", async () => {
    let letzter = 0;
    for (let i = 0; i < 11; i++) letzter = (await codes({ password: "falsch", token: "000000" })).status;
    expect(letzter).toBe(429);
  });
});
