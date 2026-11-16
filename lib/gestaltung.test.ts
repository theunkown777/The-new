import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KONTRAST_TEXT, aufgeloest, kontrast, leuchtdichte, rgbAus, variablenAus } from "./gestaltung";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

// So setzt der Browser die Werte zusammen: :root, dann die App, dann (bei Bedarf) die dunkle Ansicht.
const grund = variablenAus(css, ":root");
const hell = aufgeloest({ ...grund, ...variablenAus(css, ".praxis-app") });
const dunkel = aufgeloest({ ...grund, ...variablenAus(css, ".praxis-app"), ...variablenAus(css, ".dunkel .praxis-app") });

const pruefe = (v: Record<string, string>, schrift: string, flaeche: string) => {
  const s = schrift.startsWith("--") ? v[schrift] : schrift;
  const f = flaeche.startsWith("--") ? v[flaeche] : flaeche;
  expect(s, `${schrift} fehlt`).toBeTruthy();
  expect(f, `${flaeche} fehlt`).toBeTruthy();
  expect(kontrast(s, f), `${schrift} auf ${flaeche}`).toBeGreaterThanOrEqual(KONTRAST_TEXT);
};

describe("Rechenhilfen", () => {
  it("liest Farben in beiden Schreibweisen", () => {
    expect(rgbAus("#5A1D1D")).toEqual([90, 29, 29]);
    expect(rgbAus("#fff")).toEqual([255, 255, 255]);
    expect(rgbAus("36 32 31")).toEqual([36, 32, 31]);
    expect(() => rgbAus("rot")).toThrow();
  });

  it("rechnet Leuchtdichte und Kontrast nach WCAG", () => {
    expect(leuchtdichte("#000000")).toBe(0);
    expect(leuchtdichte("#ffffff")).toBeCloseTo(1, 5);
    expect(kontrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(kontrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
    // bekannter Grenzwert: #767676 auf Weiß ist gerade 4,5:1
    expect(kontrast("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(kontrast("#777777", "#ffffff")).toBeLessThan(4.5);
  });

  it("liest Variablen aus Regelblöcken und löst Verweise auf", () => {
    const v = variablenAus(":root {\n  --a: 1 2 3; --b: var(--a);\n}\n.x {\n  --a: 4 5 6;\n}\n:root, .x {\n  --c: var(--a);\n}\n", ":root");
    expect(v).toEqual({ "--a": "1 2 3", "--b": "var(--a)", "--c": "var(--a)" });
    expect(aufgeloest(v)["--b"]).toBe("1 2 3");
    expect(variablenAus(".x {\n  --a: 4 5 6;\n}\n", ".y")).toEqual({});
  });
});

describe("Farben außerhalb der App bleiben die gewohnten", () => {
  it("Website und Patientenseiten behalten ihre Werte", () => {
    expect(grund["--slate-500"]).toBe("100 116 139");
    expect(grund["--slate-200"]).toBe("226 232 240");
    expect(grund["--brand-700"]).toBe("90 29 29");
    expect(grund["--emerald-600"]).toBe("5 150 105");
    expect(grund["--weiss-fl"]).toBe("255 255 255");
    expect(grund["--rund-xl"]).toBe("0.75rem");
    expect(aufgeloest(grund)["--slate-fl-50"]).toBe("248 250 252");
    expect(aufgeloest(grund)["--slate-li-200"]).toBe("226 232 240");
  });
});

describe("App, hell: Schrift ist auf allen Flächen lesbar", () => {
  it("nutzt Papier, Tinte, Haarlinie und Bordeaux aus dem Design-System", () => {
    expect(hell["--papier"].toUpperCase()).toBe("#F5F2EE");
    expect(hell["--papier-2"].toUpperCase()).toBe("#ECE5DC");
    expect(hell["--akzent"].toUpperCase()).toBe("#5A1D1D");
    expect(hell["--linie"].toUpperCase()).toBe("#DCD2C6");
    expect(rgbAus(hell["--slate-900"])).toEqual(rgbAus("#24201F"));
    expect(rgbAus(hell["--slate-li-200"])).toEqual(rgbAus("#DCD2C6"));
  });

  it("Text in vier Stufen auf Weiß, Papier und dunklerem Papier", () => {
    for (const stufe of ["--slate-500", "--slate-600", "--slate-700", "--slate-800", "--slate-900"])
      for (const flaeche of ["--weiss-fl", "--papier", "--papier-2", "--slate-fl-50", "--slate-fl-100"]) pruefe(hell, stufe, flaeche);
  });

  it("Akzent, Knöpfe, Platzhalter und gesperrte Knöpfe", () => {
    pruefe(hell, "--brand-700", "--weiss-fl");
    pruefe(hell, "--brand-700", "--papier");
    pruefe(hell, "--brand-700", "--brand-fl-50");
    pruefe(hell, "#ffffff", "--akzent");
    pruefe(hell, "#ffffff", "--akzent-tief");
    pruefe(hell, "--slate-500", "--feld"); // Platzhalter
    pruefe(hell, "--slate-500", "--slate-fl-100"); // gesperrter Knopf
    pruefe(hell, "--slate-600", "--weiss-fl"); // untere Leiste
  });

  it("Grün ist in der App Salbei und bleibt lesbar", () => {
    expect(hell["--emerald-600"]).toBe(grund["--salbei-600"]);
    expect(hell["--green-700"]).toBe(grund["--salbei-700"]);
    for (const p of ["emerald", "green"]) {
      pruefe(hell, `--${p}-700`, `--${p}-fl-50`);
      pruefe(hell, `--${p}-800`, `--${p}-fl-100`);
      pruefe(hell, `--${p}-700`, "--weiss-fl");
      pruefe(hell, "#ffffff", `--${p}-fl-600`);
    }
  });

  it("eine einheitliche Rundung: 6 px für Felder und Knöpfe, 10 px für Karten", () => {
    expect(hell["--rund-lg"]).toBe("6px");
    expect(hell["--rund-xl"]).toBe("10px");
    expect(hell["--rund-2xl"]).toBe("10px");
  });
});

describe("App, dunkel (Beta): Schrift ist auf allen Flächen lesbar", () => {
  it("Text auf Karte, Seite, Seitenleiste und Füllflächen", () => {
    for (const stufe of ["--slate-500", "--slate-600", "--slate-700", "--slate-800", "--slate-900"])
      for (const flaeche of ["--weiss-fl", "--papier", "--papier-2", "--slate-fl-50", "--slate-fl-100", "--feld"]) pruefe(dunkel, stufe, flaeche);
  });

  it("Akzent und Knöpfe", () => {
    for (const stufe of ["--brand-600", "--brand-700", "--brand-800"]) {
      pruefe(dunkel, stufe, "--weiss-fl");
      pruefe(dunkel, stufe, "--papier");
      pruefe(dunkel, stufe, "--brand-fl-50");
      pruefe(dunkel, stufe, "--brand-fl-100");
    }
    for (const flaeche of ["--brand-fl-600", "--brand-fl-700", "--brand-fl-800", "--slate-fl-900", "--slate-fl-800"]) pruefe(dunkel, "#ffffff", flaeche);
    pruefe(dunkel, "--slate-500", "--slate-fl-100"); // gesperrter Knopf
  });

  it("Hinweisfarben: Schrift auf der eigenen getönten Fläche und auf der Karte", () => {
    for (const p of ["red", "amber", "orange", "emerald", "green", "sky", "blue", "salbei"]) {
      for (const stufe of [600, 700, 800]) {
        pruefe(dunkel, `--${p}-${stufe}`, "--weiss-fl");
        pruefe(dunkel, `--${p}-${stufe}`, `--${p}-fl-50`);
        pruefe(dunkel, `--${p}-${stufe}`, `--${p}-fl-100`);
      }
    }
  });
});
