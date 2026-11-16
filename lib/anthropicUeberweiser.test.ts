import { afterEach, describe, expect, it, vi } from "vitest";
import { REPORT_TYPE_LABELS } from "@/lib/reportLabels";

const ALT = process.env.ANTHROPIC_API_KEY;
afterEach(() => {
  vi.doUnmock("@anthropic-ai/sdk");
  vi.resetModules();
  if (ALT === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ALT;
});

const eingabe = {
  fach: "hno",
  reportType: "UEBERWEISER" as const,
  practiceName: "HNO-Praxis am Markt",
  authorName: "Dr. Beispiel",
  patient: { firstName: "Erika", lastName: "Mustermann", birthDate: "03.04.1961", insuranceName: "Musterkasse", insuranceNumber: "A123456789" },
  treatmentDate: "16.11.2026",
  serviceSummary: "- Hörtest (Tonaudiogramm)",
  additionalContext: "Erika Mustermann hört links schlechter, Kontrolle in 6 Monaten, Tel. 0171 2345678",
};

describe("Bericht an die überweisende Praxis", () => {
  it("hat eine Bezeichnung für Listen und Auswahl", () => {
    expect(REPORT_TYPE_LABELS.UEBERWEISER).toBe("Bericht an die überweisende Praxis");
  });

  it("ohne Schlüssel: Testmodus-Text aus den erfassten Angaben, ohne erfundenen Fließtext", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "dummy-key-for-build";
    const { generateReportText, REPORT_TYPES } = await import("@/lib/anthropic");
    expect(REPORT_TYPES).toContain("UEBERWEISER");
    const text = await generateReportText(eingabe);
    expect(text).toContain("[TESTMODUS");
    expect(text).toContain("Bericht an die überweisende Praxis");
    expect(text).toContain("Hörtest (Tonaudiogramm)");
    expect(text).toContain("hört links schlechter");
  });

  it("mit Schlüssel: strenger Auftrag, nichts zu ergänzen; keine Namen und Kontaktdaten an den Dienst", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "sk-ant-echter-key";
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Sehr geehrte Kolleginnen und Kollegen, [VORNAME] [NACHNAME] stellte sich bei [PRAXIS] vor." }] });
    class FakeAnthropic { messages = { create }; }
    vi.doMock("@anthropic-ai/sdk", () => ({ default: FakeAnthropic }));
    const { generateReportText, TYPE_ZUSATZREGELN } = await import("@/lib/anthropic");

    const text = await generateReportText(eingabe);
    const auftrag = create.mock.calls[0][0] as { system: string; messages: { content: string }[] };
    expect(auftrag.system).toContain("Bericht an die überweisende Praxis");
    expect(auftrag.system).toContain(TYPE_ZUSATZREGELN.UEBERWEISER!);
    expect(auftrag.system).toMatch(/Ergänze nichts: keine Anamnese, keinen Befund, keine Diagnose, keine Beurteilung, keine Empfehlung/);
    expect(auftrag.system).toMatch(/lass den Abschnitt weg/);
    const gesendet = JSON.stringify(auftrag);
    expect(gesendet).not.toMatch(/Erika|Mustermann|1961|A123456789|0171|HNO-Praxis am Markt|Dr\. Beispiel/);
    expect(gesendet).toContain("hört links schlechter");
    // Nach der Antwort setzt Sorrida die echten Angaben wieder ein.
    expect(text).toBe("Sehr geehrte Kolleginnen und Kollegen, Erika Mustermann stellte sich bei HNO-Praxis am Markt vor.");
  });

  it("die strengeren Regeln gelten nur für diesen Berichtstyp", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "sk-ant-echter-key";
    const create = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Text" }] });
    class FakeAnthropic { messages = { create }; }
    vi.doMock("@anthropic-ai/sdk", () => ({ default: FakeAnthropic }));
    const { generateReportText } = await import("@/lib/anthropic");
    await generateReportText({ ...eingabe, reportType: "BEFUND" });
    expect((create.mock.calls[0][0] as { system: string }).system).not.toContain("Für diesen Bericht gilt vorrangig");
  });

  it("KI nicht erreichbar: Bericht ohne KI mit klarem Hinweis", async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "sk-ant-abgelaufen";
    const create = vi.fn().mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 }));
    class FakeAnthropic { messages = { create }; }
    vi.doMock("@anthropic-ai/sdk", () => ({ default: FakeAnthropic }));
    const { generateReportText } = await import("@/lib/anthropic");
    const text = await generateReportText(eingabe);
    expect(text).toContain("[OHNE KI ERSTELLT");
    expect(text).toContain("Bericht an die überweisende Praxis");
  });
});
