import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { LEISTUNGEN } from "@/lib/leistungskatalog";
import { RATGEBER_LINK, rechnerFuer } from "@/lib/leistungRechner";

const hrefs = (l: Parameters<typeof rechnerFuer>[0]) => rechnerFuer(l).map((x) => x.href);
const finde = (p: (l: (typeof LEISTUNGEN)[number]) => boolean) => LEISTUNGEN.find(p)!;

describe("Leistungsseiten: Selbst nachrechnen", () => {
  it("zeigt immer die Übersicht der Rechner, zuletzt", () => {
    for (const l of LEISTUNGEN) {
      const h = hrefs(l);
      expect(h[h.length - 1]).toBe("/rechner");
      expect(new Set(h).size).toBe(h.length);
    }
  });

  it("verlinkt passend zum Thema", () => {
    expect(hrefs(finde((l) => l.bereich === "Zahnmedizin" && l.kategorie === "Zahnersatz (Prothetik)"))).toContain("/rechner/eigenanteil-zahnersatz");
    expect(hrefs(finde((l) => l.bereich === "Zahnmedizin" && l.kategorie === "Implantologie"))).toContain("/rechner/eigenanteil-zahnersatz");
    expect(hrefs(finde((l) => l.bereich === "Therapieberufe (Heilmittel)"))).toContain("/rechner/zuzahlung-2027");
    expect(hrefs(finde((l) => l.bereich === "Hilfsmittel & Gesundheitshandwerk"))).toContain("/rechner/zuzahlung-2027");
    expect(hrefs(finde((l) => l.gebuehrenordnung === "GOÄ (IGeL / Selbstzahler)" && l.kostentraeger_code === "SZ"))).toContain("/rechner/goae-rechnung");
  });

  it("zeigt sonst nur die Übersicht", () => {
    expect(hrefs({ bereich: "Zahnmedizin", kategorie: "Vorsorge & Diagnostik", kostentraeger_code: "GKV", gebuehrenordnung: "BEMA / GOZ" })).toEqual(["/rechner"]);
    expect(hrefs({ bereich: "Innere Medizin", kategorie: "x", kostentraeger_code: "GKV", gebuehrenordnung: "EBM / GOÄ" })).toEqual(["/rechner"]);
    expect(LEISTUNGEN.filter((l) => hrefs(l).length === 1).length).toBeGreaterThan(100);
  });

  it("verweist nur auf Seiten, die es gibt, und nennt keine Preise", () => {
    const alle = new Map(LEISTUNGEN.flatMap((l) => rechnerFuer(l)).concat(RATGEBER_LINK).map((x) => [x.href, x]));
    expect([...alle.keys()].sort()).toEqual(["/ratgeber", "/rechner", "/rechner/eigenanteil-zahnersatz", "/rechner/goae-rechnung", "/rechner/zuzahlung-2027"]);
    for (const [href, x] of alle) {
      expect(existsSync(join(process.cwd(), "app", href, "page.tsx")), href).toBe(true);
      expect(`${x.titel} ${x.text}`).not.toMatch(/€|Euro|günstig|beste/i);
    }
  });
});
