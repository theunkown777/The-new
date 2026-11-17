// Kaputte Eingaben sind keine Fehler des Servers. Wirft eine Route beim Lesen des Anfrage-Textes, entsteht ein
// Eintrag im Fehlerprotokoll; viele verschiedene Einträge setzen den Statusbericht auf „nicht ok“
// (lib/betriebsStatus.ts fehlerPunkt). Deshalb liest jede Route den Anfrage-Text so, dass unlesbares JSON
// zu einer Antwort 400 führt und nicht zu einem Absturz.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function routen(ordner: string): string[] {
  const aus: string[] = [];
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) aus.push(...routen(pfad));
    else if (name === "route.ts") aus.push(pfad);
  }
  return aus;
}

describe("Schnittstellen lesen den Anfrage-Text ohne Absturz", () => {
  const alle = routen("app");
  it("findet die Routen", () => {
    expect(alle.length).toBeGreaterThan(100);
  });
  it("jedes req.json() fängt unlesbares JSON ab (.catch) oder steht in einem try-Block", () => {
    const offen: string[] = [];
    for (const datei of alle) {
      const text = readFileSync(datei, "utf8");
      const zeilen = text.split("\n");
      zeilen.forEach((zeile, i) => {
        if (!/\b(req|request)\.json\(\)/.test(zeile)) return;
        if (/\b(req|request)\.json\(\)\s*\.catch\(/.test(zeile)) return;
        // In einem try-Block: eine der zwölf Zeilen davor öffnet ihn.
        if (zeilen.slice(Math.max(0, i - 12), i + 1).some((z) => /\btry\s*\{/.test(z))) return;
        offen.push(`${datei}:${i + 1}`);
      });
    }
    expect(offen).toEqual([]);
  });
});
