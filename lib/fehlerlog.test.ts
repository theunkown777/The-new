import { describe, expect, it } from "vitest";
import { MELDUNG_MAX, fehlerAufbereiten, fehlerMail, fingerabdruck, meldungBereinigen, ortBereinigen, stackBereinigen } from "@/lib/fehlerlog";

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
