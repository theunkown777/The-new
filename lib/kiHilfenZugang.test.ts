import { afterEach, describe, expect, it, vi } from "vitest";

// Die Schranke vor jeder KI-Anfrage: KI-Zugang hinterlegt, Schalter der Praxis an, Grenze je Stunde.
const ALT = process.env.ANTHROPIC_API_KEY;
afterEach(() => {
  vi.doUnmock("@/lib/prisma");
  vi.doUnmock("@/lib/rateLimit");
  vi.resetModules();
  if (ALT === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ALT;
});

async function laden(o: { schluessel: string | null; praxis: { kiHilfen: boolean; isDemo: boolean } | null; frei?: boolean }) {
  vi.resetModules();
  if (o.schluessel === null) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = o.schluessel;
  const findUnique = vi.fn(async (_a: { where: { id: string } }) => o.praxis);
  const consumeAttempt = vi.fn(async (_k: string, _g: number, _f: number) => o.frei ?? true);
  vi.doMock("@/lib/prisma", () => ({ prisma: { practice: { findUnique } } }));
  vi.doMock("@/lib/rateLimit", () => ({ consumeAttempt }));
  const { kiHilfenZugang } = await import("@/lib/kiHilfen");
  return { kiHilfenZugang, findUnique, consumeAttempt };
}

describe("kiHilfenZugang", () => {
  it("ohne KI-Zugang: 503, ohne Blick in die Datenbank und ohne Zählung", async () => {
    for (const schluessel of [null, "dummy-key-for-build"]) {
      const t = await laden({ schluessel, praxis: { kiHilfen: true, isDemo: false } });
      expect(await t.kiHilfenZugang("p1", "anlass")).toMatchObject({ ok: false, status: 503 });
      expect(t.findUnique).not.toHaveBeenCalled();
      expect(t.consumeAttempt).not.toHaveBeenCalled();
    }
  });
  it("Schalter der Praxis aus: 409 und keine Zählung", async () => {
    const t = await laden({ schluessel: "sk-ant-echt", praxis: { kiHilfen: false, isDemo: false } });
    const r = await t.kiHilfenZugang("p1", "hilfe");
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(!r.ok && r.error).toContain("Einstellungen → Sicherheit");
    expect(t.consumeAttempt).not.toHaveBeenCalled();
  });
  it("unbekannte Praxis: wie ausgeschaltet", async () => {
    const t = await laden({ schluessel: "sk-ant-echt", praxis: null });
    expect(await t.kiHilfenZugang("gibt-es-nicht", "hilfe")).toMatchObject({ ok: false, status: 409 });
  });
  it("Schalter an: Anfrage wird je Praxis und Art gezählt", async () => {
    const t = await laden({ schluessel: "sk-ant-echt", praxis: { kiHilfen: true, isDemo: false } });
    expect(await t.kiHilfenZugang("p1", "preisliste")).toEqual({ ok: true });
    expect(t.findUnique.mock.calls[0][0].where).toEqual({ id: "p1" });
    expect(t.consumeAttempt).toHaveBeenCalledWith("ki-hilfe:preisliste:p1", 20, 3_600_000);
  });
  it("Gastzugang bekommt eine kleinere Grenze", async () => {
    const t = await laden({ schluessel: "sk-ant-echt", praxis: { kiHilfen: true, isDemo: true } });
    await t.kiHilfenZugang("p1", "preisliste");
    expect(t.consumeAttempt).toHaveBeenCalledWith("ki-hilfe:preisliste:p1", 3, 3_600_000);
  });
  it("Grenze überschritten: 429", async () => {
    const t = await laden({ schluessel: "sk-ant-echt", praxis: { kiHilfen: true, isDemo: false }, frei: false });
    expect(await t.kiHilfenZugang("p1", "anlass")).toMatchObject({ ok: false, status: 429 });
  });
});
