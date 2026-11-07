import { describe, expect, it } from "vitest";
import { DATEIEN, ladeDatei } from "./import";
import { ebmFaecher } from "./ebm";
import { katalogEintrag } from "./katalog";
import { FACHPROFILE } from "../fachprofile";

const alle = DATEIEN.map((d) => ladeDatei(d));
const nach = (system: string) => alle.find((d) => d.meta.system === system)!.leistungen;

describe("Amtliche Leistungsverzeichnisse", () => {
  it("vollständig geladen, Codes je Verzeichnis eindeutig, jede Position mit Text und Quelle", () => {
    const anzahl = Object.fromEntries(alle.map((d) => [d.meta.system, d.leistungen.length]));
    expect(anzahl).toMatchObject({ GOAE: 2401, GOZ: 215, BEMA: 296, HEBAMME: 85, HEILMITTEL: 164, HKP: 39, SGB_XI: 26, HMV: 2719, APOTHEKE: 15, HEILPRAKTIKER: 147, UVGOAE: 2934, OPS: 34753 });
    for (const d of alle) {
      expect(d.meta.quelle.length, d.meta.system).toBeGreaterThan(20);
      const codes = d.leistungen.map((l) => l.code);
      expect(new Set(codes).size, d.meta.system).toBe(codes.length);
      for (const l of d.leistungen) expect(l.text.length, `${d.meta.system} ${l.code}`).toBeGreaterThan(2);
    }
  });

  it("Beträge stimmen mit den amtlichen Werten überein (Stichproben)", () => {
    const goae = Object.fromEntries(nach("GOAE").map((l) => [l.code, l]));
    expect(goae["1"]).toMatchObject({ text: "Beratung - auch mittels Fernsprecher -", punkte: 80, euroCent: 466 });
    expect(goae["5"].punkte).toBe(80);
    const goz = Object.fromEntries(nach("GOZ").map((l) => [l.code, l]));
    expect(goz["0010"].punkte).toBe(100);
    const bema = Object.fromEntries(nach("BEMA").map((l) => [l.code, l]));
    expect(bema["Ä 1"]).toMatchObject({ punkte: 9 });
    expect(bema["13 a"]).toMatchObject({ text: "einflächig", punkte: 33 });
    const hkp = nach("HKP").map((l) => l.code);
    expect(hkp).toContain("HKP 31a");
    const uv = Object.fromEntries(nach("UVGOAE").map((l) => [l.code, l]));
    expect(uv["1"]).toMatchObject({ euroCent: 837 });
    expect(uv["2000"]).toMatchObject({ text: "Erstversorgung einer kleinen Wunde", euroCent: 686 });
    expect(uv["201 A"].euroCent).toBe(617);
    expect(uv["3400"].euroCent).toBe(10502);
    const ops = Object.fromEntries(nach("OPS").map((l) => [l.code, l]));
    expect(ops["5-820.00"]).toMatchObject({ text: "Implantation einer Endoprothese am Hüftgelenk: Totalendoprothese: Nicht zementiert" });
    expect(ops["5-820.00"].faecher).toContain("ortho");
    // Einzelprodukte: Anzahl ändert sich mit jedem Abruf, jede gehört zu einer gelisteten Produktart
    const produkte = nach("HMV_PRODUKT");
    expect(produkte.length).toBeGreaterThan(40000);
    const arten = new Set(nach("HMV").map((l) => l.code));
    expect(produkte.every((l) => arten.has(l.code.slice(0, 10)))).toBe(true);
    const kv = Object.fromEntries(nach("KV_REGIONAL").map((l) => [l.code, l]));
    expect(Object.keys(kv).length).toBeGreaterThan(9000);
    expect(kv["BW 40190"]).toMatchObject({ euroCent: 1631 });
    expect(kv["TH 01410H"]).toMatchObject({ text: "Besuch im Alten- oder Pflegeheim", euroCent: 2701 });
    expect(katalogEintrag({ system: "KV_REGIONAL", code: "BW 40190", text: "x", kapitel: null, punkte: null, euroCent: 1631, hinweis: null })).toMatchObject({ system: "EBM", code: "40190", festbetragCent: 1631 });
  });

  it("jede Fachrichtung hat amtliche Leistungen (EBM kommt per Import dazu)", () => {
    const proFach: Record<string, number> = {};
    for (const d of alle) for (const l of d.leistungen) for (const f of l.faecher ?? []) proFach[f] = (proFach[f] ?? 0) + 1;
    for (const fach of Object.keys(FACHPROFILE)) expect(proFach[fach] ?? 0, fach).toBeGreaterThanOrEqual(10);
  });

  it("EBM: Arztgruppen bestimmen das Fach, Zahnarztpraxen bekommen keine EBM-Positionen", () => {
    expect(ebmFaecher({ arztgruppen: ["200"], kapitel: "26 Urologische GOP" })).toEqual(["uro"]);
    expect(ebmFaecher({ arztgruppen: ["001", "010"], kapitel: "3 Hausärztlicher Versorgungsbereich" })).toEqual(["hausarzt"]);
    expect(ebmFaecher({ arztgruppen: ["130"], kapitel: "15 MKG" })).not.toContain("zahn");
    expect(ebmFaecher({ arztgruppen: [], kapitel: "6 Augenärztliche GOP" })).toEqual(["augen"]);
  });

  it("Übernahme in den Praxiskatalog: richtiges System, Faktorgrenzen nur bei GOÄ/GOZ", () => {
    const g = katalogEintrag({ system: "GOAE", code: "1", text: "Beratung", kapitel: "B Grundleistungen", punkte: 80, euroCent: 466, hinweis: null });
    expect(g).toMatchObject({ system: "GOAE", punktzahl: 80, festbetragCent: null, faktorMax: 3.5, regelhoechstfaktor: 2.3 });
    const h = katalogEintrag({ system: "HEILMITTEL", code: "X0501", text: "Krankengymnastik", kapitel: "Physiotherapie", punkte: null, euroCent: 2800, hinweis: null });
    expect(h).toMatchObject({ system: "HEILMITTEL", festbetragCent: 2800, faktorMax: null });
    expect(katalogEintrag({ system: "HKP", code: "HKP 1", text: "x", kapitel: null, punkte: null, euroCent: null, hinweis: null }).system).toBe("PFLEGE");
  });
});
