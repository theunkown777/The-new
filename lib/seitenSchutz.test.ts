import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

// Zwei Schutzregeln, die nicht in einer einzelnen Funktion stecken, sondern in Dateien der App.
// Beide sind bei der Abnahme im Browser aufgefallen (Teil 3) und sollen nicht wieder aufgehen.

const wurzel = path.resolve(__dirname, "..");

describe("Einstellungen der Praxis: Seiten sind für Behandler/innen gesperrt", () => {
  // Diese Seiten gehören zum eigenen Konto und bleiben für alle erreichbar (FUER_ALLE in app/(app)/settings/page.tsx).
  const FUER_ALLE = ["security", "lexikon"];
  const ordner = path.join(wurzel, "app", "(app)", "settings");

  function seiten(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? seiten(p) : e.name === "page.tsx" ? [p] : [];
    });
  }

  it("jede Unterseite ruft nurMitEinstellungen() auf – außer Sicherheit und Lexikon", () => {
    const unterseiten = seiten(ordner).filter((p) => path.dirname(p) !== ordner);
    expect(unterseiten.length).toBeGreaterThan(8);
    const offen = unterseiten
      .filter((p) => !FUER_ALLE.includes(path.relative(ordner, p).split(path.sep)[0]))
      .filter((p) => !/await nurMitEinstellungen\(\)/.test(fs.readFileSync(p, "utf8")))
      .map((p) => path.relative(wurzel, p));
    expect(offen).toEqual([]);
  });
});

describe("Kopfzeilen: Nur die Buchungsseite /t/<kennung> darf in fremde Seiten eingebettet werden", () => {
  type Regel = { source: string; headers: { key: string; value: string }[] };
  const laden = createRequire(import.meta.url);

  async function regeln(): Promise<Regel[]> {
    const config = laden(path.join(wurzel, "next.config.js"));
    return config.headers();
  }
  const wert = (r: Regel, key: string) => r.headers.find((h) => h.key === key)?.value;

  it("genau eine Regel erlaubt das Einbetten, und sie gilt erst ab /t/<etwas>", async () => {
    const alle = await regeln();
    const einbettbar = alle.filter((r) => /frame-ancestors \*/.test(wert(r, "Content-Security-Policy") ?? ""));
    expect(einbettbar.map((r) => r.source)).toEqual(["/t/:path+"]);
    expect(wert(einbettbar[0], "X-Frame-Options")).toBeUndefined();
    // Die übrigen Schutz-Kopfzeilen bleiben auch dort erhalten.
    expect(wert(einbettbar[0], "X-Content-Type-Options")).toBe("nosniff");
    expect(wert(einbettbar[0], "X-Robots-Tag")).toMatch(/noindex/);
  });

  it("die allgemeine Regel nimmt nur /t/… aus und verbietet das Einbetten", async () => {
    const allgemein = (await regeln()).find((r) => r.source === "/((?!t/).*)");
    expect(allgemein).toBeDefined();
    expect(wert(allgemein!, "X-Frame-Options")).toBe("SAMEORIGIN");
    expect(wert(allgemein!, "Content-Security-Policy")).toMatch(/frame-ancestors 'self'/);
    // Die Ausnahme greift für /t/abc, nicht für /t, /termine oder /tarife.
    const re = /^\/((?!t\/).*)$/;
    expect(re.test("/t/abc")).toBe(false);
    for (const p of ["/t", "/termine", "/tarife", "/dashboard", "/"]) expect(re.test(p)).toBe(true);
  });
});
