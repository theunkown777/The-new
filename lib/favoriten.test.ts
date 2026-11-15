import { describe, expect, it } from "vitest";
import { MAX_FAVORITEN, favoritSetzen, favoritenFuerFach, favoritenLesen, type Favorit } from "@/lib/favoriten";

const f = (name: string, fach = "hausarzt", id = name): Favorit => ({ id, name, fach, teeth: {}, globals: [], anlaesse: ["checkup"], choices: {} });

describe("Vorschlag-Favoriten", () => {
  it("liest nur gültige Einträge", () => {
    expect(favoritenLesen(null)).toEqual([]);
    expect(favoritenLesen([f("Check-up"), { name: "x" }, 5])).toHaveLength(1);
  });
  it("ersetzt einen Favoriten mit gleichem Namen im selben Fach", () => {
    const r = favoritSetzen([f("Check-up", "hausarzt", "a")], { ...f("check-up", "hausarzt", "b"), anlaesse: ["reise"] });
    expect(r.ok && r.liste).toHaveLength(1);
    expect(r.ok && r.liste[0].anlaesse).toEqual(["reise"]);
  });
  it("lehnt leere Favoriten und zu viele ab", () => {
    expect(favoritSetzen([], { ...f("Leer"), anlaesse: [] }).ok).toBe(false);
    const voll = Array.from({ length: MAX_FAVORITEN }, (_, i) => f(`F${i}`));
    expect(favoritSetzen(voll, f("Noch einer")).ok).toBe(false);
    expect(favoritSetzen(voll, f("F3")).ok).toBe(true);
  });
  it("zeigt je Fach nur die eigenen, nach Namen sortiert", () => {
    expect(favoritenFuerFach([f("Zebra"), f("Apfel"), f("Krone", "zahn")], "hausarzt").map((x) => x.name)).toEqual(["Apfel", "Zebra"]);
  });
});
