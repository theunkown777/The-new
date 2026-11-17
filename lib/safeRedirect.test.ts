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
  it("Pfade mit Punkt-Teilen, die beim Zerlegen zu „//fremd“ werden, fallen durch (Login und Vorschau-Seite)", () => {
    const boese = ["/.//evil.example/x", "/..//evil.example", "/a/..//evil.example", "/./\\evil.example", "/%2e//evil.example", "/x/..\\\\evil.example", "/.//evil.example?x=1", "/%2e%2e//evil.example", "/a/b/../..//evil.example"];
    for (const w of boese) {
      expect(sichererPfad(w), JSON.stringify(w)).toBe("/");
      expect(safeCallbackPath(w, origin), JSON.stringify(w)).toBe("/dashboard");
      // So wertet der Browser das Ergebnis aus: als Adresse relativ zur eigenen Seite.
      expect(new URL(sichererPfad(w), `${origin}/demnaechst`).origin, JSON.stringify(w)).toBe(origin);
      expect(new URL(safeCallbackPath(w, origin), `${origin}/login`).origin, JSON.stringify(w)).toBe(origin);
    }
    // Punkt-Teile innerhalb der eigenen Seite bleiben erlaubt.
    expect(safeCallbackPath("/a/../patients?x=1", origin)).toBe("/patients?x=1");
    expect(sichererPfad("/./ratgeber")).toBe("/ratgeber");
  });
  it("kein Ergebnis beginnt mit zwei Schrägstrichen", () => {
    for (const w of ["/", "/a", "//a", "/.//a", "/..//a", "/\\a", "/a//b", "/?x=//b", "/.///a", "/././/a"]) {
      expect(sichererPfad(w), JSON.stringify(w)).toMatch(/^\/(?![/\\])/);
      expect(safeCallbackPath(w, origin), JSON.stringify(w)).toMatch(/^\/(?![/\\])/);
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
