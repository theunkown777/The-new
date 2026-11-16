import { describe, expect, it } from "vitest";
import { datumBewerten, datumIso, ebmBewerten, exitCode, jahrBewerten, klartext, neuesteSdebm, neuestesDatum, neuestesJahr, sdebmVersion, versionVergleich, zeile } from "@/lib/amtlich/pruefen";
import { SDEBM_URL } from "@/lib/amtlich/ebm";

describe("Amtliche Stände prüfen", () => {
  it("vergleicht Versionen als Zahlen, nicht als Text", () => {
    expect(versionVergleich("1.61", "1.7")).toBeGreaterThan(0);
    expect(versionVergleich("1.61", "1.62")).toBeLessThan(0);
    expect(versionVergleich("2.0", "1.99")).toBeGreaterThan(0);
    expect(versionVergleich("1.61", "1.61")).toBe(0);
  });

  it("liest die Version der Stammdatei aus der Adresse im Repo", () => {
    expect(sdebmVersion(SDEBM_URL)).toMatch(/^\d+\.\d+$/);
    expect(sdebmVersion("nichts")).toBeNull();
  });

  it("EBM: findet die höchste Version im Verzeichnis", () => {
    const html = '<a href="SDEBM_V1.60.zip">SDEBM_V1.60.zip</a> <a href="SDEBM_V1.62.zip">x</a> <a href="SDEBM_V1.61.zip">y</a>';
    expect(neuesteSdebm(html)).toBe("1.62");
    expect(ebmBewerten("1.61", html).status).toBe("neuer Stand verfügbar");
    expect(ebmBewerten("1.62", html).status).toBe("aktuell");
    expect(ebmBewerten("1.61", "<html>leer</html>").status).toBe("nicht prüfbar");
    expect(ebmBewerten("1.61", null).status).toBe("nicht prüfbar");
    expect(ebmBewerten(null, html).status).toBe("nicht prüfbar");
  });

  it("OPS: findet das höchste Jahr beim Stichwort", () => {
    const html = "<h2>OPS Version 2026</h2><p>Die <b>OPS</b>&nbsp;Version 2027 ist veröffentlicht.</p><p>Telefon 0228 20730</p>";
    expect(neuestesJahr(html, "OPS")).toBe(2027);
    expect(jahrBewerten("OPS", 2026, html, "OPS").status).toBe("neuer Stand verfügbar");
    expect(jahrBewerten("OPS", 2027, html, "OPS").status).toBe("aktuell");
    expect(jahrBewerten("OPS", 2026, "<p>nichts</p>", "OPS").status).toBe("nicht prüfbar");
    expect(jahrBewerten("OPS", 2026, null, "OPS").status).toBe("nicht prüfbar");
    expect(jahrBewerten("OPS", null, html, "OPS").status).toBe("nicht prüfbar");
  });

  it("liest keine Jahreszahl aus längeren Ziffernfolgen", () => {
    expect(neuestesJahr("OPS Bestellnummer 20991234", "OPS")).toBeNull();
  });

  it("UV-GOÄ: findet das späteste Datum beim Stichwort", () => {
    const html = "<p>UV-GOÄ, Stand 01.07.2026 (PDF)</p><p>UV-GOÄ gültig ab 01.01.2027</p><p>Seite zuletzt geändert 05.03.2031</p>";
    expect(neuestesDatum(html, "UV-GOÄ")).toBe("2027-01-01");
    expect(datumBewerten("UV-GOÄ", "01.07.2026", html, "UV-GOÄ")).toMatchObject({ status: "neuer Stand verfügbar", gefunden: "01.01.2027" });
    expect(datumBewerten("UV-GOÄ", "01.01.2027", html, "UV-GOÄ").status).toBe("aktuell");
    expect(datumBewerten("UV-GOÄ", "01.07.2026", "<p>UV-GOÄ ohne Datum</p>", "UV-GOÄ").status).toBe("nicht prüfbar");
    expect(datumBewerten("UV-GOÄ", "2026", html, "UV-GOÄ").status).toBe("nicht prüfbar");
    expect(datumBewerten("UV-GOÄ", "01.07.2026", null, "UV-GOÄ").status).toBe("nicht prüfbar");
  });

  it("liest Seiten als Text: ohne Skripte, mit Umlauten", () => {
    expect(klartext("<p>UV-GO&Auml;</p><script>var x = '01.01.2099';</script><style>a{}</style> Stand&nbsp;01.07.2026").trim()).toBe("UV-GOÄ Stand 01.07.2026");
    expect(neuestesDatum("<p>(UV-GO&Auml;) Vertragsdatum: 01.07.2026 Inkrafttreten: 01.07.2026</p><script>UV-GOÄ 01.01.2099</script>", "UV-GOÄ")).toBe("2026-07-01");
    expect(neuestesDatum("BEMA (Stand 1.1.2026) BEMA Kurzfassung (Stand 1.1.2026)", "BEMA")).toBe("2026-01-01");
  });

  it("wandelt Datumsangaben um und weist Unsinn zurück", () => {
    expect(datumIso("1.7.2026")).toBe("2026-07-01");
    expect(datumIso("32.01.2026")).toBeNull();
    expect(datumIso("2026")).toBeNull();
  });

  it("Code 3 nur bei neuem Stand; nicht prüfbar ist kein Fehler", () => {
    const aktuell = { name: "A", status: "aktuell" as const, imRepo: "1" };
    const offen = { name: "B", status: "nicht prüfbar" as const, imRepo: "1", info: "Abruf fehlgeschlagen" };
    const neu = { name: "C", status: "neuer Stand verfügbar" as const, imRepo: "1", gefunden: "2" };
    expect(exitCode([aktuell, offen])).toBe(0);
    expect(exitCode([])).toBe(0);
    expect(exitCode([aktuell, offen, neu])).toBe(3);
    expect(zeile(neu)).toBe("[NEU] C: im Repo 1, gefunden 2");
    expect(zeile(offen)).toBe("[nicht prüfbar] B: im Repo 1 (Abruf fehlgeschlagen)");
  });
});
