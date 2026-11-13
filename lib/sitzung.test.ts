import { describe, expect, it, vi, beforeEach } from "vitest";
import type { JWT } from "next-auth/jwt";
import { SITZUNG_MAX_SEKUNDEN, tokenAbgleichen, tokenGueltig, type SitzungsKonto } from "@/lib/sitzung";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

const token = (extra: Partial<JWT> = {}): JWT => ({ id: "u1", role: "staff", practiceId: "p1", practiceName: "Praxis Alt", sessionVersion: 3, ...extra });
const konto = (extra: Partial<SitzungsKonto> = {}): SitzungsKonto => ({
  id: "u1", role: "staff", practiceId: "p1", sessionVersion: 3, totpEnabled: false,
  practice: { name: "Praxis Neu", require2faAll: false, isDemo: false },
  ...extra,
});

describe("tokenAbgleichen", () => {
  it("widerruft die Sitzung, wenn das Konto gelöscht ist", () => {
    expect(tokenAbgleichen(token(), null).widerrufen).toBe(true);
  });
  it("widerruft bei anderem Stand (Passwort-Reset, Rollenwechsel, 2FA) und bei Tokens ohne Stand", () => {
    expect(tokenAbgleichen(token(), konto({ sessionVersion: 4 })).widerrufen).toBe(true);
    expect(tokenAbgleichen(token({ sessionVersion: undefined }), konto({ sessionVersion: 0 })).widerrufen).toBe(true);
  });
  it("übernimmt Rolle und Praxis aus der Datenbank, nicht aus dem Cookie", () => {
    const t = tokenAbgleichen(token({ role: "admin" }), konto({ role: "staff", totpEnabled: true }));
    expect(t.widerrufen).toBeUndefined();
    expect(t.role).toBe("staff");
    expect(t.practiceName).toBe("Praxis Neu");
  });
  it("mfaPending bleibt nach dem Einrichten der 2FA bis zur Neuanmeldung bestehen", () => {
    const t = tokenAbgleichen(token({ role: "admin", mfaPending: true }), konto({ role: "admin", totpEnabled: true }));
    expect(t.mfaPending).toBe(true);
  });
  it("mfaPending entsteht, wenn die Pflicht erst während der Sitzung greift, nicht im Gastzugang", () => {
    expect(tokenAbgleichen(token(), konto({ practice: { name: "P", require2faAll: true, isDemo: false } })).mfaPending).toBe(true);
    expect(tokenAbgleichen(token(), konto({ role: "admin", practice: { name: "P", require2faAll: false, isDemo: true } })).mfaPending).toBe(false);
    expect(tokenAbgleichen(token(), konto()).mfaPending).toBe(false);
  });
  it("ein widerrufenes Token bleibt widerrufen", () => {
    expect(tokenAbgleichen(token({ widerrufen: true }), konto()).widerrufen).toBe(true);
  });
  it("tokenGueltig: nur vorhandene, nicht widerrufene Tokens", () => {
    expect(tokenGueltig(null)).toBe(false);
    expect(tokenGueltig(token({ widerrufen: true }))).toBe(false);
    expect(tokenGueltig(token())).toBe(true);
  });
});

describe("authOptions (lib/auth.ts)", () => {
  beforeEach(() => findUnique.mockReset());
  const laden = async () => (await import("@/lib/auth")).authOptions;

  it("Sitzung läuft nach 12 Stunden ab", async () => {
    expect((await laden()).session?.maxAge).toBe(12 * 60 * 60);
    expect(SITZUNG_MAX_SEKUNDEN).toBe(43_200);
  });
  it("schreibt bei der Anmeldung den Stand des Kontos ins Token", async () => {
    const o = await laden();
    const user = { id: "u1", role: "admin", practiceId: "p1", practiceName: "Praxis", mfaPending: true, sessionVersion: 7 };
    const t = await o.callbacks!.jwt!({ token: {} as JWT, user, account: null, trigger: "signIn" });
    expect(t).toMatchObject({ id: "u1", role: "admin", sessionVersion: 7, mfaPending: true });
    expect(findUnique).not.toHaveBeenCalled();
  });
  it("prüft bei jedem Abruf das Konto und liefert bei Widerruf keine Sitzung", async () => {
    const o = await laden();
    findUnique.mockResolvedValueOnce(konto({ role: "admin", totpEnabled: true }));
    const ok = await o.callbacks!.jwt!({ token: token(), user: undefined as never, account: null });
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(ok.role).toBe("admin");
    const sitzung = { user: { name: "A", email: "a@x.de" }, expires: "" } as never;
    expect(await o.callbacks!.session!({ session: sitzung, token: ok } as never)).toMatchObject({ user: { id: "u1", role: "admin", practiceName: "Praxis Neu" } });

    findUnique.mockResolvedValueOnce(null);
    const weg = await o.callbacks!.jwt!({ token: token(), user: undefined as never, account: null });
    expect(weg.widerrufen).toBe(true);
    // Leere Antwort: getServerSession macht daraus null.
    expect(await o.callbacks!.session!({ session: sitzung, token: weg } as never)).toEqual({});
  });
});
