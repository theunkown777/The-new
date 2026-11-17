import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BROWSER_ORT_TEILE_MAX, JSON_MELDUNG, MELDUNG_MAX, SEITEN_TEILE, browserMeldungBereinigen, browserOrtBereinigen, fehlerAufbereiten, fehlerMail, fingerabdruck, meldungBereinigen, ortBereinigen, stackBereinigen } from "@/lib/fehlerlog";

describe("ortBereinigen", () => {
  it("entfernt Abfrage-Teil, Sprungmarke und Herkunft", () => {
    expect(ortBereinigen("/patients?suche=Meier")).toBe("/patients");
    expect(ortBereinigen("https://sorrida.de/termine?tag=2026-11-16#oben")).toBe("/termine");
  });

  it("ersetzt Tokens und IDs im Pfad", () => {
    expect(ortBereinigen("/p/a8Kd93hsLq02mNx7Zt51Bv")).toBe("/p/…");
    expect(ortBereinigen("/patients/cmhz1k2j30000abcd1234efgh/akte")).toBe("/patients/…/akte");
    expect(ortBereinigen("/rechnung/20261234")).toBe("/rechnung/…");
  });

  it("lässt lange Seitennamen stehen, damit der Ort lesbar bleibt", () => {
    expect(ortBereinigen("/abrechnungspruefung")).toBe("/abrechnungspruefung");
    expect(ortBereinigen("/leistungsverzeichnis")).toBe("/leistungsverzeichnis");
    expect(ortBereinigen("/settings/fachgebiet/preisliste")).toBe("/settings/fachgebiet/preisliste");
    expect(ortBereinigen("/ratgeber/zahnzusatzversicherung-lohnt-sich")).toBe("/ratgeber/zahnzusatzversicherung-lohnt-sich");
  });

  it("ersetzt lange Pfadteile mit Ziffern oder Großbuchstaben weiter (IDs, Tokens)", () => {
    expect(ortBereinigen("/patients/cmwjexath0004gu3otqzk97mh")).toBe("/patients/…");
    expect(ortBereinigen("/p/AbCdEfGhIjKlMnOpQrStUvWxYz")).toBe("/p/…");
    expect(ortBereinigen("/p/abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz")).toBe("/p/…");
    expect(ortBereinigen("/portal/aB3-xY9_kL2mN4pQ6rS8tU0vW")).toBe("/portal/…");
  });

  it("lässt Platzhalter einer Route stehen", () => {
    expect(ortBereinigen("/patients/[id]")).toBe("/patients/[id]");
    expect(ortBereinigen("/api/portal/[token]/pruefung")).toBe("/api/portal/[token]/pruefung");
    expect(ortBereinigen("/(app)/patients/[id]")).toBe("/(app)/patients/[id]");
  });

  it("ersetzt Pfadteile mit Sonderzeichen (könnten Namen oder Adressen sein)", () => {
    expect(ortBereinigen("/suche/M%C3%BCller%20Anna")).toBe("/suche/…");
    expect(ortBereinigen("/x/anna@example.org")).toBe("/x/…");
  });

  it("kommt mit leeren Eingaben zurecht", () => {
    expect(ortBereinigen("")).toBe("/");
    expect(ortBereinigen(undefined)).toBe("/");
  });
});

describe("meldungBereinigen", () => {
  it("entfernt E-Mail-Adressen", () => {
    const m = meldungBereinigen("Versand an anna.meier@example.org fehlgeschlagen");
    expect(m).not.toContain("@");
    expect(m).not.toContain("anna");
    expect(m).toContain("fehlgeschlagen");
  });

  it("entfernt Ziffernfolgen ab 5 Stellen, auch gegliedert", () => {
    expect(meldungBereinigen("Versichertennummer A123456789 ungültig")).not.toMatch(/\d{5,}/);
    expect(meldungBereinigen("Telefon 0151 234 56 78 nicht erreichbar")).not.toMatch(/\d/);
    expect(meldungBereinigen("Zeile 12 von 40")).toBe("Zeile 12 von 40");
  });

  it("entfernt Datumsangaben", () => {
    const m = meldungBereinigen("Geburtsdatum 03.05.1980 passt nicht, erwartet 1980-05-03");
    expect(m).not.toMatch(/1980/);
  });

  it("entfernt IBAN", () => {
    expect(meldungBereinigen("IBAN DE89 3704 0044 0532 0130 00 abgelehnt")).not.toMatch(/DE89|3704/);
    expect(meldungBereinigen("IBAN DE89370400440532013000 abgelehnt")).not.toMatch(/DE89/);
  });

  it("entfernt Texte in Anführungszeichen", () => {
    expect(meldungBereinigen('Patient "Anna Meier" nicht gefunden')).toBe("Patient … nicht gefunden");
    expect(meldungBereinigen("Wert 'Müller' ist zu lang")).not.toContain("Müller");
    expect(meldungBereinigen("Feld „Hans Beispiel“ fehlt")).not.toContain("Hans");
    expect(meldungBereinigen("Cannot read properties of undefined (reading 'lastName')")).toBe("Cannot read properties of undefined (reading …)");
  });

  it("schneidet nach einem offenen Anführungszeichen ab", () => {
    expect(meldungBereinigen('Fehler bei "Anna Meier, geb')).toBe("Fehler bei …");
  });

  it("entfernt alles nach „Unique constraint failed on“", () => {
    const m = meldungBereinigen("\nInvalid `prisma.patient.create()` invocation:\n\n\nUnique constraint failed on the fields: (`email`)");
    expect(m).toContain("prisma.patient.create()");
    expect(m).toContain("Unique constraint failed on");
    expect(m).not.toContain("email");
  });

  it("entfernt Werte aus Datenbank-Meldungen", () => {
    const m = meldungBereinigen("duplicate key value violates unique constraint Patient_pkey DETAIL: Key (lastName)=(Meier) already exists.");
    expect(m).not.toContain("Meier");
    expect(m).not.toContain("lastName");
    const n = meldungBereinigen("Argument `lastName`: Invalid value provided. Expected String, provided Int.");
    expect(n).not.toContain("lastName");
  });

  it("entfernt Tokens und Adressen im Netz", () => {
    expect(meldungBereinigen("Abruf https://example.org/p/abc?name=Meier schlug fehl")).toBe("Abruf … schlug fehl");
    expect(meldungBereinigen("Token a8Kd93hsLq02mNx7Zt51Bv abgelaufen")).toBe("Token … abgelaufen");
  });

  it("lässt von einem Token keine Bruchstücke stehen", () => {
    // Früher schnitt die Ziffernregel nur die Ziffern heraus: „AbCdE…AbCdE…AbCdEf01“ blieb stehen.
    const token = "AbCdEf0123456789AbCdEf0123456789AbCdEf01";
    const m = meldungBereinigen(`Zugriff fehlgeschlagen, token=${token}, bitte erneut versuchen`);
    expect(m).toBe("Zugriff fehlgeschlagen, token=…, bitte erneut versuchen");
    expect(m).not.toMatch(/AbCd/);
    expect(meldungBereinigen("Link /p/AbCdEf0123456789AbCdEf0123456789 abgelaufen")).not.toMatch(/AbCd|0123/);
    expect(meldungBereinigen("Patient cmwjexath0004gu3otqzk97mh nicht gefunden")).toBe("Patient … nicht gefunden");
  });

  it("zählt denselben Fehler mit verschiedenen IDs als einen", () => {
    const a = fehlerAufbereiten({ quelle: "server", ort: "/api/patients/[id]", meldung: "Kein Eintrag für cmwjexath0004gu3otqzk97mh" });
    const b = fehlerAufbereiten({ quelle: "server", ort: "/api/patients/[id]", meldung: "Kein Eintrag für cmwjexisi01lvgu3oxxol9ilb" });
    expect(a.fingerabdruck).toBe(b.fingerabdruck);
  });

  it("kürzt auf 300 Zeichen und ist einzeilig", () => {
    const m = meldungBereinigen(`Fehler\n${"wort ".repeat(200)}`);
    expect(m.length).toBeLessThanOrEqual(MELDUNG_MAX);
    expect(m).not.toContain("\n");
  });

  it("nimmt auch Error-Objekte und Unbekanntes", () => {
    expect(meldungBereinigen(new Error("kaputt"))).toBe("kaputt");
    expect(meldungBereinigen(undefined)).toBe("Fehler ohne Meldung");
    expect(meldungBereinigen("")).toBe("Fehler ohne Meldung");
  });
});

describe("stackBereinigen", () => {
  const stack = [
    "TypeError: Cannot read properties of undefined (reading 'Anna Meier')",
    "    at PatientPage (/var/task/.next/server/app/(app)/patients/[id]/page.js:12:34)",
    "    at async render (webpack-internal:///./node_modules/next/dist/server/render.js?name=Meier:5:6)",
    "    at https://sorrida.de/_next/static/chunks/main-abc.js?v=123&name=Meier:1:2",
    "    at vierte (/var/task/x.js:1:1)",
  ].join("\n");

  it("behält nur die obersten drei Aufrufzeilen, ohne Meldungszeile", () => {
    const s = stackBereinigen(stack).split("\n");
    expect(s).toHaveLength(3);
    expect(s[0]).toBe("PatientPage (patients/[id]/page.js:12:34)");
    expect(stackBereinigen(stack)).not.toContain("Anna");
    expect(stackBereinigen(stack)).not.toContain("vierte");
  });

  it("entfernt Parameter und Herkunft aus Dateipfaden", () => {
    const s = stackBereinigen(stack);
    expect(s).not.toContain("Meier");
    expect(s).not.toContain("?");
    expect(s).not.toContain("sorrida.de");
    expect(s.split("\n")[2]).toBe("(anonym) (static/chunks/main-abc.js:1:2)");
  });

  it("liest auch das Format von Firefox und Safari", () => {
    expect(stackBereinigen("laden@https://sorrida.de/_next/static/chunks/a.js?x=1:10:20\n@https://sorrida.de/b.js:1:1")).toBe("laden (static/chunks/a.js:10:20)\n(anonym) (b.js:1:1)");
  });

  it("liefert leer bei fehlendem Stack", () => {
    expect(stackBereinigen(undefined)).toBe("");
    expect(stackBereinigen("nur eine Meldung")).toBe("");
  });
});

describe("browserMeldungBereinigen: Meldungen aus dem Browser", () => {
  it("lässt einen Namen ohne Anführungszeichen nicht stehen", () => {
    const m = browserMeldungBereinigen("Sicherheitspruefung Test zwei: Patientin Erika Mustermann, geb. 03.05.1980, Tel. 0171 2345678, erika@example.org nicht gefunden");
    for (const wort of ["Erika", "Mustermann", "Patientin", "Sicherheitspruefung", "1980", "0171", "example"]) expect(m).not.toContain(wort);
    expect(browserMeldungBereinigen("Erika Mustermann")).toBe("Fehler ohne lesbare Meldung");
    expect(browserMeldungBereinigen("Patient Hans-Peter Müller-Lüdenscheidt not found")).toBe("… not found");
    expect(browserMeldungBereinigen("Cannot read properties of undefined, user Özgür Yılmaz")).toBe("Cannot read properties of undefined, user …");
  });
  it("behält die üblichen Fehlermeldungen von Browser und React lesbar", () => {
    expect(browserMeldungBereinigen("Cannot read properties of undefined (reading 'lastName')")).toBe("Cannot read properties of undefined (reading …)");
    expect(browserMeldungBereinigen("Failed to fetch")).toBe("Failed to fetch");
    expect(browserMeldungBereinigen("TypeError: x is not a function")).toBe("TypeError: … is not a function");
    expect(browserMeldungBereinigen("ChunkLoadError: Loading chunk 418 failed.")).toBe("ChunkLoadError: Loading chunk 418 failed.");
    expect(browserMeldungBereinigen("Minified React error #418; visit https://react.dev/errors/418 for the full message")).toBe("Minified React error #418; visit … for the full message");
    expect(browserMeldungBereinigen("Maximum update depth exceeded")).toBe("Maximum update depth exceeded");
  });
  it("erfundene Texte ohne technisches Wort ergeben immer dieselbe Meldung (ein Eintrag, kein neuer je Text)", () => {
    const a = fehlerAufbereiten({ quelle: "browser", ort: "/x", meldung: "Erika Mustermann wohnt dort" });
    const b = fehlerAufbereiten({ quelle: "browser", ort: "/x", meldung: "Ganz anderer Satz über Max Beispiel" });
    expect(a.meldung).toBe("Fehler ohne lesbare Meldung");
    expect(a.fingerabdruck).toBe(b.fingerabdruck);
  });
  it("gilt nur für den Browser: Meldungen des Servers behalten ihre Wörter", () => {
    expect(fehlerAufbereiten({ quelle: "server", ort: "/x", meldung: "Vorlage nicht gefunden" }).meldung).toBe("Vorlage nicht gefunden");
    expect(fehlerAufbereiten({ quelle: "browser", ort: "/x", meldung: "Vorlage nicht gefunden" }).meldung).toBe("Fehler ohne lesbare Meldung");
  });
  it("kürzt auf 300 Zeichen", () => {
    expect(browserMeldungBereinigen("failed ".repeat(200)).length).toBeLessThanOrEqual(MELDUNG_MAX);
  });
});

describe("browserOrtBereinigen: Ort einer Meldung aus dem Browser", () => {
  it("lässt Namen und andere Wörter im Pfad nicht stehen", () => {
    const ort = browserOrtBereinigen("/np-pruefung/Erika/Mustermann/hat-diabetes-und-wohnt-in-koeln");
    expect(ort).toBe("/…/…/…/…");
    for (const boese of ["/erika", "/patients/mustermann", "/x/diabetes", "/Koeln/Hauptstrasse", "/patients/erika-mustermann/akte", "/[erika]", "/(mustermann)"]) {
      const o = browserOrtBereinigen(boese);
      for (const wort of ["erika", "mustermann", "diabetes", "koeln", "hauptstrasse"]) expect(o.toLowerCase(), boese).not.toContain(wort);
    }
    const f = fehlerAufbereiten({ quelle: "browser", ort: "/np-pruefung/Erika/Mustermann/hat-diabetes", meldung: "TypeError: failed to fetch" });
    expect(f.ort).toBe("/…/…/…/…");
    expect(JSON.stringify(f)).not.toMatch(/Erika|Mustermann|diabetes/i);
  });
  it("behält die festen Namen der Seiten, alles Übrige wird zur Lücke", () => {
    expect(browserOrtBereinigen("/patients/cmhz1k2j30000abcd1234efgh/proposals/new")).toBe("/patients/…/proposals/new");
    expect(browserOrtBereinigen("https://sorrida.de/settings/fachgebiet/preisliste?x=1#a")).toBe("/settings/fachgebiet/preisliste");
    expect(browserOrtBereinigen("/ratgeber/festzuschuss-2027")).toBe("/ratgeber/festzuschuss-2027");
    expect(browserOrtBereinigen("/p/a8Kd93hsLq02mNx7Zt51Bv")).toBe("/p/…");
    expect(browserOrtBereinigen("/dashboard")).toBe("/dashboard");
    expect(browserOrtBereinigen("")).toBe("/");
    expect(browserOrtBereinigen(undefined)).toBe("/");
  });
  it("ist stabil: Das Ergebnis noch einmal bereinigt bleibt gleich (Browser bereinigt, Server noch einmal)", () => {
    for (const w of ["/patients/abc/akte", "/x/y/z", "/dashboard", "/", "/np/Erika"]) {
      const einmal = browserOrtBereinigen(w);
      expect(browserOrtBereinigen(einmal)).toBe(einmal);
    }
  });
  it("höchstens acht Pfadteile: Erfundene lange Pfade ergeben nicht beliebig viele verschiedene Orte", () => {
    const lang = browserOrtBereinigen(`/${Array.from({ length: 40 }, (_, i) => `teil${i}`).join("/")}`);
    expect(lang.split("/").filter(Boolean)).toHaveLength(BROWSER_ORT_TEILE_MAX);
    expect(lang).toMatch(/^(\/…)+$/);
  });
  it("gilt nur für den Browser: Der Server meldet die Route mit Platzhaltern", () => {
    expect(fehlerAufbereiten({ quelle: "server", ort: "/api/portal/[token]/pruefung", meldung: "x" }).ort).toBe("/api/portal/[token]/pruefung");
  });
  it("die Liste kennt jeden festen Ordner unter app/, in dem eine Seite liegt", () => {
    const fehlt: string[] = [];
    const lauf = (ordner: string, teile: string[]) => {
      for (const name of readdirSync(ordner)) {
        const pfad = join(ordner, name);
        if (statSync(pfad).isDirectory()) {
          if (ordner === "app" && name === "api") continue;
          lauf(pfad, [...teile, name]);
        } else if (/^(page|route)\.tsx?$/.test(name)) {
          for (const t of teile) if (!/^[[(]/.test(t) && !SEITEN_TEILE.has(t)) fehlt.push(t);
        }
      }
    };
    lauf("app", []);
    expect([...new Set(fehlt)]).toEqual([]);
  });
});

describe("unlesbares JSON: eine Meldung, gleich an welcher Stelle", () => {
  it("verschiedene Stellen und Eingaben ergeben denselben Eintrag", () => {
    const meldungen = [
      "Expected ',' or '}' after property value in JSON at position 6 (line 1 column 7)",
      "Expected ':' after property name in JSON at position 13 (line 1 column 14)",
      "Expected ',' or ']' after array element in JSON at position 9",
      "Unexpected token 'E', \"Erika Mustermann\" is not valid JSON",
      "Unexpected end of JSON input",
      "Unterminated string in JSON at position 20",
      "Bad control character in string literal in JSON at position 3",
      "JSON.parse: unexpected character at line 1 column 2 of the JSON data",
    ];
    const abdruecke = new Set(meldungen.map((m) => fehlerAufbereiten({ quelle: "server", ort: "/api/patients", meldung: m }).fingerabdruck));
    expect(abdruecke.size).toBe(1);
    for (const m of meldungen) expect(meldungBereinigen(m)).toBe(JSON_MELDUNG);
    expect(meldungBereinigen("Unexpected token 'E', \"Erika Mustermann\" is not valid JSON")).not.toContain("Erika");
  });
  it("andere Meldungen mit dem Wort JSON bleiben, wie sie sind", () => {
    expect(meldungBereinigen("Antwort ist kein JSON")).toBe("Antwort ist kein JSON");
  });
});

describe("fingerabdruck und fehlerAufbereiten", () => {
  it("ist gleich für denselben Fehler mit anderen Daten", () => {
    const a = fehlerAufbereiten({ quelle: "server", ort: "/patients/cmhz1k2j30000abcd1234efgh", meldung: 'Patient "Anna Meier" nicht gefunden' });
    const b = fehlerAufbereiten({ quelle: "server", ort: "/patients/cmhz9zzzz0000zzzz9999zzzz", meldung: 'Patient "Hans Beispiel" nicht gefunden' });
    expect(a.fingerabdruck).toBe(b.fingerabdruck);
    expect(a.fingerabdruck).toMatch(/^[0-9a-f]{16}$/);
  });

  it("unterscheidet Quelle, Ort und Meldung", () => {
    const f = fingerabdruck("server", "/a", "x");
    expect(fingerabdruck("browser", "/a", "x")).not.toBe(f);
    expect(fingerabdruck("server", "/b", "x")).not.toBe(f);
    expect(fingerabdruck("server", "/a", "y")).not.toBe(f);
  });

  it("Browser: der Stack wird nicht gespeichert, auch nicht mit Namen in Funktion oder Datei", () => {
    const f = fehlerAufbereiten({ quelle: "browser", ort: "/dashboard", meldung: "Error: failed", stack: "at Erika (https://x/Mustermann-diabetes.js:1:1)\nat hat-krebs (a.js:2:3)\nat Mustermann\nladen@https://sorrida.de/_next/static/chunks/0elahojevla9e.js:1:2" });
    expect(f.stack).toBe("");
    for (const wort of ["Erika", "Mustermann", "diabetes", "krebs"]) expect(JSON.stringify(f)).not.toContain(wort);
    // Server: der bereinigte Stack bleibt (er kommt aus dem eigenen Code, nicht von außen)
    expect(fehlerAufbereiten({ quelle: "server", ort: "/x", meldung: "m", stack: "at laden (/app/.next/server/chunks/a.js:1:2)" }).stack).toBe("laden (server/chunks/a.js:1:2)");
  });

  it("lässt nichts Rohes durch", () => {
    const f = fehlerAufbereiten({ quelle: "browser", ort: "/p/a8Kd93hsLq02mNx7Zt51Bv?x=1", meldung: "Mail an a@b.de, Tel. 030 1234567", stack: "at f (https://x.de/a.js?q=Meier:1:2)" });
    const alles = JSON.stringify(f);
    expect(alles).not.toContain("a8Kd93");
    expect(alles).not.toContain("a@b.de");
    expect(alles).not.toContain("1234567");
    expect(alles).not.toContain("Meier");
  });
});

describe("fehlerMail", () => {
  it("liefert nichts ohne neue Fehler", () => {
    expect(fehlerMail([], "https://sorrida.de")).toBeNull();
  });

  it("nennt nur Zahl, Orte und den Link", () => {
    const mail = fehlerMail(["/patients/[id]", "/patients/[id]", "/termine"], "https://sorrida.de/")!;
    expect(mail.subject).toBe("Sorrida: 3 neue Fehler seit gestern");
    expect(mail.html).toContain("<li>/patients/[id]</li>");
    expect(mail.html).toContain("<li>/termine</li>");
    expect(mail.html.match(/<li>/g)).toHaveLength(2);
    expect(mail.html).toContain('href="https://sorrida.de/betrieb"');
  });

  it("schreibt die Einzahl richtig", () => {
    expect(fehlerMail(["/x"], "https://sorrida.de")!.subject).toBe("Sorrida: 1 neuer Fehler seit gestern");
  });
});
