import { describe, expect, it } from "vitest";
import { ZWECKBESTIMMUNG } from "./zweckbestimmung";
import { KI_HILFEN_PRO_STUNDE } from "./kiHilfen";

// Die Zweckbestimmung steht auf jeder öffentlichen Seite, im Impressum und bei der Registrierung.
// Sie muss zu dem passen, was die KI im Produkt wirklich tut (lib/kiHilfen.ts).
describe("Zweckbestimmung", () => {
  const ki = ZWECKBESTIMMUNG.find((absatz) => absatz.startsWith("Künstliche Intelligenz"))!;
  it("sagt nicht mehr, die KI formuliere nur Berichtsentwürfe", () => {
    expect(ki).toBeTruthy();
    expect(ki).not.toMatch(/nutzt Sorrida nur,/);
    expect(ki).toContain("Berichtsentwürfe und Kurzfassungen");
  });
  it("nennt jede KI-Hilfe, die es im Produkt gibt, und dass die Praxisleitung sie einschaltet", () => {
    const worte: Record<keyof typeof KI_HILFEN_PRO_STUNDE, RegExp> = { anlass: /Stichworten/, preisliste: /Preisliste/, hilfe: /Fragen zur Bedienung/, uebersetzung: /Übersetzen/ };
    for (const [art, muster] of Object.entries(worte)) expect(ki, art).toMatch(muster);
    expect(ki).toMatch(/Praxisleitung die KI-Hilfen eingeschaltet/);
    expect(ki).toMatch(/als Entwurf gekennzeichnet und wird von der Praxis geprüft/);
    expect(ki).toMatch(/Beträge und die Reihenfolge der Leistungen entstehen aus festen Regeln/);
  });
  it("verspricht keine Therapieempfehlung und nennt Sorrida nicht „kein Medizinprodukt“", () => {
    const alles = ZWECKBESTIMMUNG.join(" ");
    expect(alles).toContain("gibt keine Therapieempfehlungen");
    expect(alles).not.toMatch(/kein Medizinprodukt/i);
  });
});
