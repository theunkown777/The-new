import { describe, expect, it } from "vitest";
import { morgenMailText, morgenSumme } from "./morgenmail";

describe("Morgen-Mail", () => {
  const z = { eingang: { Vorschläge: 3, Geld: 1 }, rueckrufe: 1, ungeoeffnet: 2, ueberfaellig: 0 };
  it("nennt nur Zahlen, keine Namen", () => {
    const m = morgenMailText(z, { practiceName: "Praxis <Sonne>", baseUrl: "https://sorrida.test" });
    expect(m.subject).toBe("Sorrida: 6 Punkte warten in Ihrer Praxis");
    expect(m.zeilen).toEqual(["1 Patient bittet um Rückruf", "2 Rückmeldungen zu Vorschlägen", "1 Meldung zu Zahlungen", "2 Patienten-Links seit über drei Tagen nicht geöffnet"]);
    expect(m.html).toContain("https://sorrida.test/eingang");
    expect(m.html).toContain("Praxis &lt;Sonne&gt;");
  });
  it("zählt alles zusammen", () => {
    expect(morgenSumme(z)).toBe(6);
    expect(morgenSumme({ eingang: {}, rueckrufe: 0, ungeoeffnet: 0, ueberfaellig: 0 })).toBe(0);
  });
});
