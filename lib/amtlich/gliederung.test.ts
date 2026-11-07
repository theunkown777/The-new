import { describe, expect, it } from "vitest";
import { fachFilter, kvFaecher, KV_BEZIRKE, reihenfolge, sortiereSysteme } from "./gliederung";

describe("Ordnung der Leistungen je Fach", () => {
  it("wichtigstes Verzeichnis zuerst", () => {
    expect(reihenfolge("zahn")[0]).toBe("BEMA");
    expect(reihenfolge("hausarzt")[0]).toBe("EBM");
    expect(reihenfolge("physio")[0]).toBe("HEILMITTEL");
    expect(reihenfolge("klinik")[0]).toBe("OPS");
    expect(sortiereSysteme("hausarzt", [{ system: "GOAE" }, { system: "OPS" }, { system: "EBM" }, { system: "KV_REGIONAL" }]).map((x) => x.system)).toEqual(["EBM", "KV_REGIONAL", "GOAE", "OPS"]);
  });

  it("regionale KV-Ziffern nach Inhalt einem Fach zugeordnet", () => {
    const alle = ["hausarzt", "gyn", "augen"];
    expect(kvFaecher("Frühultraschall in der 8. SSW", "Gesund schwanger", alle)).toEqual(["gyn"]);
    expect(kvFaecher("Intravitreale Injektion", null, alle)).toContain("augen");
    expect(kvFaecher("Präventive Untersuchung U 10", null, alle)).toEqual(["kinder", "hausarzt"]);
    expect(kvFaecher("Wegepauschale bei Tage", "Wegepauschalen", alle)).toEqual(alle);
  });

  it("nur regionale Ziffern des eigenen KV-Bezirks", () => {
    expect(KV_BEZIRKE).toHaveLength(17);
    expect(fachFilter("hausarzt", "NO")).toEqual({ faecher: { has: "hausarzt" }, NOT: { system: "KV_REGIONAL", NOT: { kapitel: "KV Nordrhein" } } });
    expect(fachFilter("hausarzt", null)).toEqual({ faecher: { has: "hausarzt" }, NOT: { system: "KV_REGIONAL" } });
  });
});
