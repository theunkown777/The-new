import { describe, expect, it } from "vitest";
import { PATIENT_LANGS, uiFuer } from "@/lib/patientI18n";
import { ALLE_SPECIALTIES, isDental, specialty } from "@/lib/specialties";
import { ZAHN_BEGRIFFE, ZAHN_BEGRIFFE_FREMD } from "@/lib/zahnBegriffe";

// Einleitung im Patienten-Link (components/PatientProposalView.tsx): „Entschieden wird erst im Gespräch mit …“.
// Früher fiel sie ohne Dativ der Fachrichtung (Fach „andere“) auf die Zahnärztin zurück, in allen Sprachen.
// Die Seiten übergeben specialty(fach)?.arztDativ und isDental(fach) (app/p/[token], app/p/[token]/lesen, Portal).

const SPRACHEN = [...PATIENT_LANGS.map((l) => ({ name: l, ui: uiFuer(l, false) })), { name: "de-einfach", ui: uiFuer("de", true) }];
const einleitung = (ui: (typeof SPRACHEN)[number]["ui"], fach: string) => ui.intro(specialty(fach)?.arztDativ, isDental(fach));

describe("Einleitung im Patienten-Link je Fach", () => {
  it("gibt es in 8 Sprachen", () => {
    expect(SPRACHEN).toHaveLength(8);
  });

  it.each(SPRACHEN)("$name: keine Zahnärztin außerhalb der Zahnmedizin, auch nicht bei „andere“", ({ ui }) => {
    for (const fach of [...ALLE_SPECIALTIES.map((s) => s.id), "andere"]) {
      const t = einleitung(ui, fach);
      expect(t, fach).not.toMatch(ZAHN_BEGRIFFE);
      expect(t, fach).not.toMatch(ZAHN_BEGRIFFE_FREMD);
      expect(t, fach).not.toContain("undefined");
    }
  });

  it.each(SPRACHEN)("$name: Gegenprobe Zahnmedizin nennt die Zahnärztin", ({ ui }) => {
    expect(einleitung(ui, "zahn")).toMatch(new RegExp(`${ZAHN_BEGRIFFE.source}|${ZAHN_BEGRIFFE_FREMD.source}`, "i"));
  });

  it("deutsch: Fach „andere“ spricht von Ihrer Praxis, bekannte Fächer von ihrer Fachrichtung", () => {
    expect(uiFuer("de", false).intro(undefined, false)).toContain("im Gespräch mit Ihrer Praxis.");
    expect(uiFuer("de", true).intro(undefined, false)).toContain("im Gespräch mit Ihrer Praxis.");
    expect(einleitung(uiFuer("de", false), "augen")).toContain("Ihrer Augenärztin oder Ihrem Augenarzt");
  });
});
