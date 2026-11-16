import { describe, expect, it } from "vitest";
import { safeCallbackPath, sichererPfad } from "./safeRedirect";

describe("Rücksprungziel nach der Anmeldung", () => {
  const origin = "https://www.sorrida.com";
  it("lässt Pfade der eigenen Seite durch, samt Abfrage-Teil", () => {
    expect(safeCallbackPath("/patients?x=1", origin)).toBe("/patients?x=1");
    expect(sichererPfad("/ratgeber/festzuschuss-2027")).toBe("/ratgeber/festzuschuss-2027");
    expect(sichererPfad("/dashboard?tab=2")).toBe("/dashboard?tab=2");
  });
  it("fremde Adressen fallen durch, auch in den Schreibweisen, die mit einem Schrägstrich beginnen", () => {
    for (const boese of ["//evil.example/x", "/\\evil.example/x", "/\t/evil.example/x", "/\n/evil.example", "\\\\evil.example", "https://evil.example/x", "javascript:alert(1)", "evil.example"]) {
      expect(sichererPfad(boese), JSON.stringify(boese)).toBe("/");
      // Mit bekannter eigener Adresse: Das Ergebnis bleibt in jedem Fall auf der eigenen Seite.
      expect(new URL(safeCallbackPath(boese, origin), origin).origin, JSON.stringify(boese)).toBe(origin);
    }
    // Was der Browser aus dem Ergebnis macht, bleibt auf der eigenen Seite.
    for (const w of ["/\\evil.example/x", "/\t/evil.example/x", "/a/../b", "/x//y"]) {
      expect(new URL(sichererPfad(w), `${origin}/demnaechst`).origin).toBe(origin);
    }
  });
  it("kein Text, mehrfacher Wert oder überlang: Ersatz", () => {
    expect(sichererPfad(undefined)).toBe("/");
    expect(sichererPfad(["/a", "/b"])).toBe("/");
    expect(sichererPfad(`/${"a".repeat(3000)}`)).toBe("/");
    expect(sichererPfad(null, "/dashboard")).toBe("/dashboard");
    expect(safeCallbackPath(null, origin)).toBe("/dashboard");
  });
});
