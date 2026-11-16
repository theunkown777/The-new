import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TOLERANZ, csvLesen, dateiInhalt, euroLesen, pruefen, tabelle2027 } from "@/lib/festzuschuss2027";
import { FESTZUSCHUSS_2027, FESTZUSCHUSS_BEFUNDE, befundEuro, festzuschuss2027Amtlich, festzuschussEuro, regelKosten, wort2027, type PatientFactors } from "@/lib/proposals";
import { festzuschussVergleich } from "@/lib/rechner";

const befunde = Object.keys(FESTZUSCHUSS_BEFUNDE);
/** Vollständige Tabelle: jeder Betrag 2026 mal Faktor. */
const voll = (faktor = 1.03) => Object.fromEntries(befunde.map((b) => [b, Math.round(FESTZUSCHUSS_BEFUNDE[b].euro * faktor * 100) / 100]));
const gkv: PatientFactors = { age: 46, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 };

describe("Tabelle 2027 aus der Datei", () => {
  it("die Datei im Repo ist lesbares JSON", () => {
    const roh = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/festzuschuss-2027.json"), "utf-8"));
    expect(typeof roh).toBe("object");
    // Entweder leer oder eine vollständige, plausible Tabelle. Nie etwas dazwischen.
    if (Object.keys(roh).length) {
      expect(tabelle2027(roh, FESTZUSCHUSS_BEFUNDE)).not.toBeNull();
      expect(pruefen(roh.befunde, FESTZUSCHUSS_BEFUNDE)).toEqual([]);
    } else {
      expect(FESTZUSCHUSS_2027).toBeNull();
    }
  });

  it("leere Datei: keine Tabelle", () => {
    expect(tabelle2027({}, FESTZUSCHUSS_BEFUNDE)).toBeNull();
    expect(tabelle2027(null, FESTZUSCHUSS_BEFUNDE)).toBeNull();
    expect(tabelle2027({ befunde: {} }, FESTZUSCHUSS_BEFUNDE)).toBeNull();
  });

  it("unvollständige oder kaputte Tabelle gilt nicht", () => {
    const t = voll();
    const { ["2.1"]: _weg, ...ohne } = t;
    expect(tabelle2027({ befunde: ohne }, FESTZUSCHUSS_BEFUNDE)).toBeNull();
    expect(tabelle2027({ befunde: { ...t, "1.1": 0 } }, FESTZUSCHUSS_BEFUNDE)).toBeNull();
    expect(tabelle2027({ befunde: { ...t, "1.1": "398,39" } }, FESTZUSCHUSS_BEFUNDE)).toBeNull();
  });

  it("vollständige Tabelle gilt", () => {
    const t = tabelle2027({ quelle: "Test", befunde: voll() }, FESTZUSCHUSS_BEFUNDE)!;
    expect(Object.keys(t)).toEqual(befunde);
    expect(t["1.1"]).toBe(Math.round(398.39 * 1.03 * 100) / 100);
  });
});

describe("Rechnen mit und ohne Tabelle 2027", () => {
  const t = voll(1.05);

  it("ohne Tabelle: 2027 rechnet mit den Beträgen 2026 und heißt voraussichtlich", () => {
    expect(befundEuro("1.1", 2027, null)).toBe(398.39);
    expect(festzuschuss2027Amtlich(null)).toBe(false);
    expect(wort2027("ohne", null)).toBe("voraussichtlich");
    expect(wort2027("davor", null)).toBe(" voraussichtlich");
    expect(wort2027("dahinter", null)).toBe("voraussichtlich ");
    expect(festzuschussEuro({ befunde: ["1.1"] }, gkv, 2027, null)).toBeCloseTo(398.39 * 0.5, 2);
  });

  it("mit Tabelle: 2027 nimmt die neuen Beträge, 2026 bleibt unberührt, das Wort entfällt", () => {
    expect(befundEuro("1.1", 2027, t)).toBe(t["1.1"]);
    expect(befundEuro("1.1", 2026, t)).toBe(398.39);
    expect(festzuschuss2027Amtlich(t)).toBe(true);
    expect([wort2027("ohne", t), wort2027("davor", t), wort2027("dahinter", t)]).toEqual(["", "", ""]);
    expect(festzuschussEuro({ befunde: ["1.1", "1.3"] }, gkv, 2027, t)).toBeCloseTo(Math.round(t["1.1"] * 0.5 * 100) / 100 + Math.round(t["1.3"] * 0.5 * 100) / 100, 2);
    expect(festzuschussEuro({ befunde: ["1.1"] }, gkv, 2026, t)).toBeCloseTo(398.39 * 0.6, 2);
  });

  it("das Jahr des Patienten bestimmt Satz und Tabelle gemeinsam", () => {
    expect(festzuschussEuro({ befunde: ["2.1"] }, { ...gkv, zuschussJahr: 2027 }, undefined, t)).toBeCloseTo(t["2.1"] * 0.5, 2);
    expect(festzuschussEuro({ befunde: ["2.1"] }, { ...gkv, zuschussJahr: 2026 }, undefined, t)).toBeCloseTo(921.6 * 0.6, 2);
  });

  it("Regelkosten: Standard bleibt die Tabelle 2026", () => {
    expect(regelKosten(["1.1", "1.3"])).toBe(Math.round((398.39 + 134.44) * 100) / 100);
    expect(regelKosten(["1.1", "1.3"], 2026)).toBe(regelKosten(["1.1", "1.3"]));
  });

  it("Rechner: mit Tabelle der neue Betrag und nicht mehr vorläufig", () => {
    const ohne = festzuschussVergleich("1.1", 0, false, undefined, null);
    expect(ohne.vorlaeufig2027).toBe(true);
    expect(ohne.zuschuss2027).toBeCloseTo(398.39 * 0.5, 2);
    const mit = festzuschussVergleich("1.1", 0, false, undefined, t);
    expect(mit.vorlaeufig2027).toBe(false);
    expect(mit.zuschuss2027).toBeCloseTo(t["1.1"] * 0.5, 2);
    expect(mit.zuschuss2026).toBeCloseTo(398.39 * 0.6, 2);
  });
});

describe("CSV „Befund;Euro“ einlesen", () => {
  it("liest deutsche und englische Zahlen", () => {
    expect(euroLesen("1.051,84")).toBe(1051.84);
    expect(euroLesen("1051,84 €")).toBe(1051.84);
    expect(euroLesen("398.39")).toBe(398.39);
    expect(euroLesen("abc")).toBeNull();
    expect(euroLesen("")).toBeNull();
    expect(euroLesen("-5")).toBeNull();
  });

  it("liest Zeilen mit Kopfzeile, Kommentar und Leerzeilen", () => {
    const r = csvLesen("﻿Befund;Euro\n# Quelle: Test\n1.1;410,00\n\n2.1;\"950,10\"\r\n");
    expect(r.fehler).toEqual([]);
    expect(r.werte).toEqual({ "1.1": 410, "2.1": 950.1 });
  });

  it("meldet unlesbare Zeilen und doppelte Befunde", () => {
    const r = csvLesen("1.1;410\n1.1;420\nKrone;400\n1.2\n1.3;viel");
    expect(r.fehler).toHaveLength(4);
    expect(r.fehler[0]).toContain("doppelt");
    expect(r.werte).toEqual({ "1.1": 410 });
  });

  it("prüft Vollständigkeit gegen die Befunde 2026", () => {
    const { ["4.4"]: _weg, ...ohne } = voll();
    const fehler = pruefen(ohne, FESTZUSCHUSS_BEFUNDE);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]).toContain("4.4");
    expect(pruefen(voll(), FESTZUSCHUSS_BEFUNDE)).toEqual([]);
  });

  it("prüft Plausibilität: höchstens 25 % Abweichung, keine unbekannten Befunde", () => {
    expect(TOLERANZ).toBe(0.25);
    expect(pruefen(voll(1.24), FESTZUSCHUSS_BEFUNDE)).toEqual([]);
    expect(pruefen(voll(0.76), FESTZUSCHUSS_BEFUNDE)).toEqual([]);
    expect(pruefen(voll(1.27), FESTZUSCHUSS_BEFUNDE)).toHaveLength(befunde.length);
    expect(pruefen({ ...voll(), "1.1": 39.84 }, FESTZUSCHUSS_BEFUNDE)[0]).toMatch(/Befund 1\.1.*weicht/);
    expect(pruefen({ ...voll(), "9.9": 100 }, FESTZUSCHUSS_BEFUNDE)).toEqual(["Befund 9.9 gibt es in der Tabelle 2026 nicht"]);
  });

  it("schreibt die Datei so, dass sie als Tabelle 2027 gilt", () => {
    const d = dateiInhalt(voll(), FESTZUSCHUSS_BEFUNDE, "GKV-Spitzenverband, Festzuschussbeträge ab 01.01.2027", "2026-12-20");
    expect(d.quelle).toContain("2027");
    expect(Object.keys(d.befunde!)).toEqual(befunde);
    expect(tabelle2027(JSON.parse(JSON.stringify(d)), FESTZUSCHUSS_BEFUNDE)).toEqual(voll());
  });
});
