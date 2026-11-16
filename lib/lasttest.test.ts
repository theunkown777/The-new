import { describe, expect, it } from "vitest";
import { LASTTEST_GRENZE_MS, bloecke, istLokaleDatenbank, median, messTabelle } from "@/lib/lasttest";

describe("istLokaleDatenbank", () => {
  it("erlaubt nur Datenbanken auf diesem Rechner", () => {
    expect(istLokaleDatenbank("postgresql://u:p@localhost:5432/db?schema=public")).toBe(true);
    expect(istLokaleDatenbank("postgres://u:p@127.0.0.1/db")).toBe(true);
    expect(istLokaleDatenbank("postgresql://u:p@[::1]:5432/db")).toBe(true);
  });

  it("lehnt fremde Rechner, leere und unlesbare Adressen ab", () => {
    for (const url of [
      "",
      null,
      undefined,
      "kein-url",
      "postgresql://u:p@db.example.com:5432/db",
      "postgresql://u:p@ep-cool-1.eu-central-1.aws.neon.tech/db?sslmode=require",
      "postgresql://u:p@localhost.example.com/db",
      "postgresql://u:p@10.0.0.5/db",
      "mysql://u:p@localhost/db",
      "postgresql://u:p@localhost/db?host=db.example.com",
    ])
      expect(istLokaleDatenbank(url), String(url)).toBe(false);
  });
});

describe("median", () => {
  it("nimmt den mittleren Wert bzw. das Mittel der beiden mittleren", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
    expect(Number.isNaN(median([]))).toBe(true);
  });

  it("verändert die Messreihe nicht", () => {
    const reihe = [3, 1, 2];
    median(reihe);
    expect(reihe).toEqual([3, 1, 2]);
  });
});

describe("messTabelle", () => {
  it("markiert Zeilen über der Grenze", () => {
    const t = messTabelle([
      { ziel: "/dashboard", status: 200, ms: 120.4, kb: 80.2 },
      { ziel: "/analyse", status: 200, ms: LASTTEST_GRENZE_MS + 1, kb: 300 },
    ]);
    const zeilen = t.split("\n");
    expect(zeilen).toHaveLength(4);
    expect(zeilen[2]).toBe("| /dashboard | 200 | 120 | 80 | nein |");
    expect(zeilen[3]).toContain("| ja |");
  });
});

describe("bloecke", () => {
  it("teilt ohne Verlust", () => {
    expect(bloecke([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(bloecke([], 10)).toEqual([]);
    expect(bloecke([1, 2], 0)).toEqual([[1], [2]]);
  });
});
