import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { NEUIGKEITEN, neuigkeitDatum, neuigkeitenNachTagen, neuigkeitenSortiert } from "@/lib/neuigkeiten";

const saetze = (s: string) => s.replace(/(\d)\.(\d)/g, "$1·$2").split(/(?<=[.!?])\s+/).filter(Boolean);

describe("Neu in Sorrida", () => {
  it("hat je Eintrag Datum, Titel, zwei Sätze und für wen", () => {
    expect(NEUIGKEITEN.length).toBeGreaterThanOrEqual(9);
    for (const n of NEUIGKEITEN) {
      expect(n.datum).toMatch(/^2026-11-1[345]$/);
      expect(n.titel.length).toBeGreaterThan(8);
      expect(saetze(n.text), n.titel).toHaveLength(2);
      expect(n.fuerWen.length).toBeGreaterThan(3);
    }
    expect(new Set(NEUIGKEITEN.map((n) => n.titel)).size).toBe(NEUIGKEITEN.length);
  });

  it("bleibt sachlich: keine Superlative, keine Raten, keine 3D-Modelle, keine Empfehlung", () => {
    const alles = NEUIGKEITEN.map((n) => `${n.titel} ${n.text} ${n.fuerWen}`).join(" ");
    expect(alles).not.toMatch(/beste|einzigartig|revolution|bahnbrechend|perfekt|modernste|führend|schnellste|Nr\. ?1|!/i);
    expect(alles).not.toMatch(/3D|Modell|Raten|Teilzahlung|Empfehlung|empfiehlt|sinnvoll/i);
  });

  it("verlinkt nur öffentliche Seiten, die es gibt", () => {
    for (const n of NEUIGKEITEN) if (n.link) expect(existsSync(join(process.cwd(), "app", n.link.href, "page.tsx")), n.link.href).toBe(true);
  });

  it("sortiert nach Datum, neueste zuerst, und gruppiert nach Tagen", () => {
    const s = neuigkeitenSortiert();
    for (let i = 1; i < s.length; i++) expect(s[i - 1].datum >= s[i].datum).toBe(true);
    const tage = neuigkeitenNachTagen();
    expect(tage.map((t) => t.datum)).toEqual(["2026-11-15", "2026-11-14", "2026-11-13"]);
    expect(tage.reduce((n, t) => n + t.eintraege.length, 0)).toBe(NEUIGKEITEN.length);
    expect(neuigkeitenSortiert([{ datum: "2026-11-13", titel: "a", text: "", fuerWen: "" }, { datum: "2026-11-15", titel: "b", text: "", fuerWen: "" }]).map((n) => n.titel)).toEqual(["b", "a"]);
    expect(neuigkeitDatum("2026-11-15")).toBe("15. November 2026");
  });
});
