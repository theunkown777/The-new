import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES, specialty } from "./specialties";
import { passtZuPerson } from "./fachprofile";

describe("Angebote je Fach", () => {
  it("Options-IDs sind je Fach eindeutig", () => {
    for (const s of ALLE_SPECIALTIES) {
      const ids = s.anlaesse.flatMap((a) => a.options.map((o) => o.id));
      expect(new Set(ids).size, s.id).toBe(ids.length);
      expect(new Set(s.anlaesse.map((a) => a.id)).size, s.id).toBe(s.anlaesse.length);
    }
  });
  it("Apotheke bietet mehr als Arzneimittel", () => {
    const ids = specialty("apotheke")!.anlaesse.map((a) => a.id);
    for (const id of ["rezept", "pdl", "impfen_apo", "hilfsmittel_apo", "check_apo", "service_apo"]) expect(ids).toContain(id);
  });
  it("Urologie: Frauen sehen Inkontinenz und Harnwegsinfekte, aber keine Prostata", () => {
    const uro = specialty("uro")!.anlaesse;
    const frau = uro.filter((a) => passtZuPerson(a, { geschlecht: "W", alter: 55 })).map((a) => a.id);
    expect(frau).toContain("inkontinenz");
    expect(frau).toContain("hwi");
    expect(frau).not.toContain("prostata");
    expect(frau).not.toContain("vasektomie");
    expect(uro.filter((a) => passtZuPerson(a, { geschlecht: "M", alter: 55 })).map((a) => a.id)).toContain("prostata");
  });
  it("Jedes Fach hat mindestens zwei Anlässe", () => {
    for (const s of ALLE_SPECIALTIES) expect(s.anlaesse.length, s.id).toBeGreaterThanOrEqual(2);
  });
});
