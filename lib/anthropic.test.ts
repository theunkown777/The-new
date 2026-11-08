import { describe, it, expect, vi, afterEach } from "vitest";

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  vi.doUnmock("@anthropic-ai/sdk");
  vi.resetModules();
  if (ORIGINAL_ENV === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
});

const testInput = {
  reportType: "BEFUND" as const,
  practiceName: "Testpraxis",
  authorName: "Dr. Test",
  patient: {
    firstName: "Max",
    lastName: "Mustermann",
    birthDate: null,
    insuranceName: null,
    insuranceNumber: null,
  },
  treatmentDate: "01.01.2026",
  serviceSummary: "- Kontrolle (GOZ 0110)",
  additionalContext: null,
};

describe("generateReportText", () => {
  it("nutzt ohne echten API-Key den kostenlosen Testmodus-Fallback statt eines API-Aufrufs", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "dummy-key-for-build";
    const { generateReportText } = await import("@/lib/anthropic");

    const text = await generateReportText(testInput);

    expect(text).toContain("[TESTMODUS");
    expect(text).toContain("Max Mustermann");
    expect(text).toContain("Kontrolle (GOZ 0110)");
  });

  it("nutzt den Fallback auch ohne gesetzten API-Key (undefined)", async () => {
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    const { generateReportText } = await import("@/lib/anthropic");

    const text = await generateReportText(testInput);

    expect(text).toContain("[TESTMODUS");
  });

  it("ruft mit einem echten API-Key die Anthropic-API auf statt des Fallbacks", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "sk-ant-echter-key";
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Echter KI-Text" }] });
    class FakeAnthropic {
      messages = { create };
    }
    vi.doMock("@anthropic-ai/sdk", () => ({ default: FakeAnthropic }));

    const { generateReportText } = await import("@/lib/anthropic");
    const text = await generateReportText(testInput);

    expect(text).toBe("Echter KI-Text");
    expect(create).toHaveBeenCalledOnce();
  });

  it("speichert den Bericht ohne KI, wenn der Schlüssel ungültig ist; beim Neu-Erzeugen kommt der Fehler", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "sk-ant-abgelaufen";
    const create = vi.fn().mockRejectedValue(new Error("401 invalid x-api-key"));
    class FakeAnthropic {
      messages = { create };
    }
    vi.doMock("@anthropic-ai/sdk", () => ({ default: FakeAnthropic }));

    const { generateReportText } = await import("@/lib/anthropic");
    const text = await generateReportText(testInput);
    expect(text).toContain("[OHNE KI ERSTELLT");
    expect(text).toContain("Kontrolle (GOZ 0110)");
    await expect(generateReportText(testInput, { ausweichen: false })).rejects.toThrow();
  });
});
