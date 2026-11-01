import { describe, expect, it } from "vitest";
import { maskNames, pseudonymize, reidentify, PLATZHALTER } from "./anthropic";

const patient = { firstName: "Anna", lastName: "Müller", birthDate: "03.04.1980", insuranceName: "AOK", insuranceNumber: "A123456789" };
const input = {
  reportType: "BEFUND" as const,
  practiceName: "Praxis X",
  authorName: "Dr. Y",
  patient,
  treatmentDate: "01.11.2026",
  serviceSummary: "Füllung 36",
  additionalContext: "Frau Müller klagt über Schmerzen, Anna Müller wünscht Keramik. Müllerstraße bleibt.",
};

describe("Pseudonymisierung vor dem KI-Aufruf", () => {
  it("schickt weder Name, Geburtsdatum noch Versichertennummer", () => {
    const p = pseudonymize(input);
    const all = JSON.stringify(p);
    expect(all).not.toContain("Anna");
    expect(all).not.toMatch(/Müller(?!straße)/);
    expect(all).not.toContain("1980");
    expect(all).not.toContain("A123456789");
    expect(p.patient.insuranceName).toBe("AOK");
    expect(p.serviceSummary).toBe("Füllung 36");
  });
  it("ersetzt nur ganze Wörter", () => {
    expect(maskNames("Müllerstraße, Herr Müller", patient)).toBe(`Müllerstraße, Herr ${PLATZHALTER.nachname}`);
  });
  it("setzt die echten Angaben nach der Antwort wieder ein", () => {
    const text = `Betreff: [VORNAME] [NACHNAME], geb. [GEBURTSDATUM]. [PATIENT] erschien. Frau [NACHNAME], Nr. [VERSICHERTENNUMMER]`;
    expect(reidentify(text, patient)).toBe("Betreff: Anna Müller, geb. 03.04.1980. Anna Müller erschien. Frau Müller, Nr. A123456789");
  });
  it("lässt fehlende Angaben als Lücke stehen statt zu raten", () => {
    expect(reidentify("geb. [GEBURTSDATUM]", { ...patient, birthDate: null })).toBe("geb. [Geburtsdatum ergänzen]");
  });
});
