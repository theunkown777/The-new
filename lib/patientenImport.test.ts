import { describe, expect, it } from "vitest";
import {
  BLOCK, MAX_ZEILEN, bestandAus, csvLesen, dateiLesen, datumLesen, dekodieren, einordnen, emailLesen, geschlechtLesen, importBlockSchema, inBloecke, kopfNorm, nameTeilen, namensSchluessel,
  nummerSchluessel, serverPruefung, spaltenErkennen, telefonLesen, trennzeichenErkennen, versicherungsartLesen, zeilePruefen, zuordnungFehler, leereZuordnung, type ImportPatient,
} from "@/lib/patientenImport";

const utf8 = (s: string) => new TextEncoder().encode(s);
// Windows-1252: jedes Zeichen ein Byte (für die Testzeichen reicht Latin-1, € ist 0x80).
const cp1252 = (s: string) => Uint8Array.from([...s].map((c) => (c === "€" ? 0x80 : c.charCodeAt(0))));
const HEUTE = new Date(2026, 10, 15);

describe("Zeichensatz", () => {
  it("liest UTF-8 mit und ohne BOM", () => {
    expect(dekodieren(utf8("Müller;Jörg"))).toEqual({ text: "Müller;Jörg", zeichensatz: "UTF-8" });
    const mitBom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("Nachname;Vorname")]);
    expect(dekodieren(mitBom)).toEqual({ text: "Nachname;Vorname", zeichensatz: "UTF-8" });
  });
  it("erkennt Windows-1252 an ungültigem UTF-8", () => {
    expect(dekodieren(cp1252("Müller;Jörg;Straße;5 €"))).toEqual({ text: "Müller;Jörg;Straße;5 €", zeichensatz: "Windows-1252" });
  });
  it("liest UTF-16 mit BOM (Excel „Unicode-Text“)", () => {
    const le = new Uint8Array([0xff, 0xfe, ...[..."Jörg"].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])]);
    expect(dekodieren(le)).toEqual({ text: "Jörg", zeichensatz: "UTF-16" });
  });
  it("reines ASCII gilt als UTF-8", () => {
    expect(dekodieren(utf8("Name;Vorname")).zeichensatz).toBe("UTF-8");
  });
});

describe("Trennzeichen", () => {
  it("erkennt Semikolon, Komma und Tabulator", () => {
    expect(trennzeichenErkennen("Nachname;Vorname;Geb\nMeier;Anna;1.1.1990")).toBe(";");
    expect(trennzeichenErkennen("Nachname,Vorname,Geb\nMeier,Anna,1.1.1990")).toBe(",");
    expect(trennzeichenErkennen("Nachname\tVorname\tGeb\nMeier\tAnna\t1.1.1990")).toBe("\t");
  });
  it("lässt sich von Kommas in den Daten nicht täuschen", () => {
    expect(trennzeichenErkennen("Name;Kasse;Geb\nMeier, Anna;AOK, Bayern;1.1.1990\nBerg, Tom;TK;2.2.1980")).toBe(";");
  });
  it("zählt Zeichen in Anführungszeichen nicht mit", () => {
    expect(trennzeichenErkennen('Name,Kasse\n"Meier; Anna","AOK; Bayern"\n"Berg; Tom",TK')).toBe(",");
  });
  it("nimmt bei leerer Eingabe das Semikolon", () => {
    expect(trennzeichenErkennen("")).toBe(";");
    expect(trennzeichenErkennen("nur eine spalte")).toBe(";");
  });
});

describe("CSV lesen", () => {
  it("liest einfache Zeilen mit Zeilennummern und überspringt leere", () => {
    const z = csvLesen("A;B\r\n1;2\r\n\r\n;\r\n3;4\n", ";");
    expect(z).toEqual([
      { zeile: 1, felder: ["A", "B"] },
      { zeile: 2, felder: ["1", "2"] },
      { zeile: 5, felder: ["3", "4"] },
    ]);
  });
  it("versteht Anführungszeichen, verdoppelte Anführungszeichen und Zeilenumbrüche im Feld", () => {
    const z = csvLesen('Name;Notiz\n"Meier; Anna";"sagt ""Hallo""\nzweite Zeile"\nBerg;x', ";");
    expect(z[1].felder).toEqual(["Meier; Anna", 'sagt "Hallo"\nzweite Zeile']);
    expect(z[2]).toEqual({ zeile: 4, felder: ["Berg", "x"] });
  });
  it("schneidet Leerzeichen ab und kommt mit fehlendem Zeilenende klar", () => {
    expect(csvLesen(" a , b \n c , d ", ",")).toEqual([
      { zeile: 1, felder: ["a", "b"] },
      { zeile: 2, felder: ["c", "d"] },
    ]);
  });
  it("liest alte Mac-Zeilenenden", () => {
    expect(csvLesen("a;b\rc;d\r", ";").map((z) => z.felder)).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("behält leere Felder in der Mitte und am Ende", () => {
    expect(csvLesen("a;;c;\n", ";")[0].felder).toEqual(["a", "", "c", ""]);
  });
});

describe("Spalten erkennen", () => {
  it("erkennt die üblichen Kopfzeilen", () => {
    const z = spaltenErkennen(["Pat.-Nr.", "Nachname", "Vorname", "Geb.-Datum", "Geschlecht", "Krankenkasse", "Versicherungsart", "Mobil", "E-Mail"]);
    expect(z).toEqual({ patientennummer: 0, nachname: 1, vorname: 2, geburtsdatum: 3, geschlecht: 4, versicherung: 5, versicherungsart: 6, mobil: 7, email: 8, name: null });
    expect(zuordnungFehler(z)).toBeNull();
  });
  it("erkennt Synonyme und andere Schreibweisen", () => {
    const z = spaltenErkennen(["PATID", "Familienname", "Rufname", "geboren am", "Anrede", "Kostenträger", "Vers.-Art", "Handynummer", "EMAIL-ADRESSE"]);
    expect(z).toMatchObject({ patientennummer: 0, nachname: 1, vorname: 2, geburtsdatum: 3, geschlecht: 4, versicherung: 5, versicherungsart: 6, mobil: 7, email: 8 });
  });
  it("erkennt englische Kopfzeilen", () => {
    expect(spaltenErkennen(["id", "last_name", "first_name", "date of birth", "gender", "insurance", "mobile", "mail"])).toMatchObject({ patientennummer: 0, nachname: 1, vorname: 2, geburtsdatum: 3, geschlecht: 4, versicherung: 5, mobil: 6, email: 7 });
  });
  it("„Name“ neben „Vorname“ ist der Nachname", () => {
    const z = spaltenErkennen(["Name", "Vorname", "Geburtsdatum"]);
    expect(z).toMatchObject({ nachname: 0, vorname: 1, geburtsdatum: 2, name: null });
  });
  it("eine einzige Spalte „Name“ oder „Patient“ gilt als „Nachname, Vorname“", () => {
    expect(spaltenErkennen(["Name", "Geburtsdatum"])).toMatchObject({ name: 0, nachname: null, vorname: null, geburtsdatum: 1 });
    expect(spaltenErkennen(["Patient", "geb."])).toMatchObject({ name: 0, geburtsdatum: 1 });
    expect(zuordnungFehler(spaltenErkennen(["Name", "Geburtsdatum"]))).toBeNull();
  });
  it("verwechselt Geburtsname, Geburtsort und Kassennummer nicht", () => {
    const z = spaltenErkennen(["Nachname", "Vorname", "Geburtsname", "Geburtsort", "Kassennummer", "Telefon privat"]);
    expect(z.geburtsdatum).toBeNull();
    expect(z.versicherung).toBeNull();
    expect(z.mobil).toBeNull();
  });
  it("ordnet jede Spalte höchstens einmal zu", () => {
    const z = spaltenErkennen(["Nr", "Name", "Vorname", "Kasse", "Kassenart", "Mail", "Handy"]);
    const benutzt = Object.values(z).filter((v) => v != null);
    expect(new Set(benutzt).size).toBe(benutzt.length);
    expect(z).toMatchObject({ patientennummer: 0, nachname: 1, vorname: 2, versicherung: 3, versicherungsart: 4, email: 5, mobil: 6 });
  });
  it("meldet fehlende Pflichtspalten", () => {
    expect(zuordnungFehler(spaltenErkennen(["Spalte A", "Spalte B"]))).toMatch(/Nachname und Vorname/);
    expect(zuordnungFehler(spaltenErkennen(["Nachname", "Ort"]))).toMatch(/Nachname und Vorname zuordnen/);
    expect(zuordnungFehler({ ...leereZuordnung(), nachname: 0, vorname: 0 })).toMatch(/nur einmal/);
  });
  it("normalisiert Kopfzeilen", () => {
    expect(kopfNorm("Geb.-Datum ")).toBe("gebdatum");
    expect(kopfNorm("E‑Mail Adresse")).toBe("emailadresse");
    expect(kopfNorm("Straße/Größe")).toBe("strassegroesse");
  });
});

describe("Geburtsdatum lesen", () => {
  const d = (s: string) => datumLesen(s, HEUTE);
  it("liest deutsche Formate", () => {
    expect(d("03.07.1984")).toBe("1984-07-03");
    expect(d("3.7.1984")).toBe("1984-07-03");
    expect(d(" 03.07.1984 ")).toBe("1984-07-03");
    expect(d("03/07/1984")).toBe("1984-07-03");
    expect(d("03-07-1984")).toBe("1984-07-03");
    expect(d("03071984")).toBe("1984-07-03");
  });
  it("liest ISO und Formate mit dem Jahr vorn", () => {
    expect(d("1984-07-03")).toBe("1984-07-03");
    expect(d("1984/7/3")).toBe("1984-07-03");
    expect(d("19840703")).toBe("1984-07-03");
    expect(d("1984-07-03T00:00:00")).toBe("1984-07-03");
    expect(d("1984-07-03T00:00:00.000Z")).toBe("1984-07-03");
    expect(d("1984-07-03 00:00:00")).toBe("1984-07-03");
    expect(d("03.07.1984 00:00")).toBe("1984-07-03");
  });
  it("deutet zweistellige Jahre", () => {
    expect(d("03.07.84")).toBe("1984-07-03");
    expect(d("03.07.26")).toBe("2026-07-03");
    expect(d("03.07.27")).toBe("1927-07-03");
    expect(d("1.1.00")).toBe("2000-01-01");
  });
  it("erkennt den 29. Februar nur in Schaltjahren", () => {
    expect(d("29.02.2000")).toBe("2000-02-29");
    expect(d("29.02.1900")).toBeNull();
    expect(d("29.02.2023")).toBeNull();
  });
  it("lehnt Unmögliches, Zukunft und Unlesbares ab", () => {
    expect(d("31.04.1990")).toBeNull();
    expect(d("00.01.1990")).toBeNull();
    expect(d("12.13.1990")).toBeNull();
    expect(d("03.07.1884")).toBeNull();
    expect(d("16.11.2026")).toBeNull();
    expect(d("15.11.2026")).toBe("2026-11-15");
    expect(d("Juli 1984")).toBeNull();
    expect(d("1984")).toBeNull();
    expect(d("")).toBeNull();
    expect(d("unbekannt")).toBeNull();
  });
  it("liest achtstellige Zahlen eindeutig", () => {
    expect(d("01011990")).toBe("1990-01-01");
    expect(d("20011999")).toBe("1999-01-20");
    expect(d("19991201")).toBe("1999-12-01");
    expect(d("12121912")).toBe("1912-12-12");
  });
});

describe("Einzelne Werte", () => {
  it("Geschlecht", () => {
    expect(geschlechtLesen("w")).toBe("W");
    expect(geschlechtLesen("Weiblich")).toBe("W");
    expect(geschlechtLesen("Frau")).toBe("W");
    expect(geschlechtLesen("F")).toBe("W");
    expect(geschlechtLesen("männlich")).toBe("M");
    expect(geschlechtLesen("Herr")).toBe("M");
    expect(geschlechtLesen("divers")).toBe("D");
    expect(geschlechtLesen("X")).toBe("D");
    expect(geschlechtLesen("")).toBeNull();
    expect(geschlechtLesen("Dr.")).toBeNull();
  });
  it("Versicherungsart", () => {
    expect(versicherungsartLesen("GKV")).toBe("GKV");
    expect(versicherungsartLesen("gesetzlich")).toBe("GKV");
    expect(versicherungsartLesen("Gesetzl. versichert")).toBe("GKV");
    expect(versicherungsartLesen("Kasse")).toBe("GKV");
    expect(versicherungsartLesen("PKV")).toBe("PKV");
    expect(versicherungsartLesen("Privat")).toBe("PKV");
    expect(versicherungsartLesen("privat versichert")).toBe("PKV");
    expect(versicherungsartLesen("P")).toBe("PKV");
    expect(versicherungsartLesen("Selbstzahler")).toBeNull();
    expect(versicherungsartLesen("BG")).toBeNull();
    expect(versicherungsartLesen("")).toBeNull();
  });
  it("Telefon", () => {
    expect(telefonLesen("0171 / 123 45 67")).toBe("0171 / 123 45 67");
    expect(telefonLesen("+49 171 1234567")).toBe("+49 171 1234567");
    expect(telefonLesen("Tel.: 0171-1234567 (mobil)")).toBe("0171-1234567 ()");
    expect(telefonLesen("keine")).toBeNull();
    expect(telefonLesen("123")).toBeNull();
  });
  it("E-Mail", () => {
    expect(emailLesen(" Anna.Meier@Example.DE ")).toBe("anna.meier@example.de");
    expect(emailLesen("anna@")).toBeNull();
    expect(emailLesen("anna meier@example.de")).toBeNull();
    expect(emailLesen("a@b")).toBeNull();
    expect(emailLesen("a@b.de; c@d.de")).toBeNull();
  });
  it("Name in einer Spalte", () => {
    expect(nameTeilen("Meier, Anna")).toEqual({ nachname: "Meier", vorname: "Anna" });
    expect(nameTeilen("von der Heide, Anna Maria")).toEqual({ nachname: "von der Heide", vorname: "Anna Maria" });
    expect(nameTeilen("Anna Meier")).toEqual({ nachname: "Meier", vorname: "Anna" });
    expect(nameTeilen("Meier")).toBeNull();
    expect(nameTeilen("Meier,")).toBeNull();
    expect(nameTeilen("")).toBeNull();
  });
});

describe("Zeilen prüfen", () => {
  const zu = spaltenErkennen(["PatNr", "Nachname", "Vorname", "Geburtsdatum", "Geschlecht", "Kasse", "Versicherungsart", "Mobil", "E-Mail"]);
  const z = (felder: string[], zeile = 2) => zeilePruefen({ zeile, felder }, zu, HEUTE);

  it("übersetzt eine vollständige Zeile", () => {
    expect(z(["4711", "Meier", "Anna", "03.07.1984", "w", "AOK Bayern", "gesetzlich", "0171 1234567", "Anna@Example.de"])).toEqual({
      zeile: 2,
      ok: true,
      hinweise: [],
      daten: { zeile: 2, lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03", geschlecht: "W", insuranceType: "GKV", insuranceName: "AOK Bayern", phone: "0171 1234567", email: "anna@example.de", patientNummer: "4711" },
    });
  });
  it("lässt leere Felder leer", () => {
    const r = z(["", "Berg", "Tom", "", "", "", "", "", ""]);
    expect(r).toMatchObject({ ok: true, daten: { birthDate: null, geschlecht: null, insuranceType: null, insuranceName: null, phone: null, email: null, patientNummer: null } });
  });
  it("kommt mit kurzen Zeilen zurecht", () => {
    expect(z(["1", "Berg", "Tom"])).toMatchObject({ ok: true, daten: { lastName: "Berg", firstName: "Tom", birthDate: null } });
  });
  it("nennt den Grund bei fehlendem Namen", () => {
    expect(z(["1", "", "Tom"])).toEqual({ zeile: 2, ok: false, grund: "Nachname fehlt" });
    expect(z(["1", "Berg", ""])).toEqual({ zeile: 2, ok: false, grund: "Vorname fehlt" });
    expect(z(["1", "", ""], 9)).toEqual({ zeile: 9, ok: false, grund: "Nachname und Vorname fehlen" });
  });
  it("nennt den Grund bei unlesbarem Geburtsdatum", () => {
    expect(z(["1", "Berg", "Tom", "31.02.1990"])).toEqual({ zeile: 2, ok: false, grund: "Geburtsdatum „31.02.1990“ nicht lesbar" });
    expect(z(["1", "Berg", "Tom", "01.01.2090"])).toMatchObject({ ok: false });
  });
  it("lässt ungültige E-Mail, Telefon und Versicherungsart weg, statt die Zeile zu verwerfen", () => {
    const r = z(["1", "Berg", "Tom", "", "", "", "Selbstzahler", "keine", "tom@"]);
    expect(r).toMatchObject({ ok: true, daten: { email: null, phone: null, insuranceType: null } });
    expect(r.ok && r.hinweise).toHaveLength(3);
  });
  it("liest „Nachname, Vorname“ aus einer Spalte", () => {
    const zu2 = spaltenErkennen(["Name", "Geburtsdatum"]);
    expect(zeilePruefen({ zeile: 3, felder: ["Meier, Anna", "1984-07-03"] }, zu2, HEUTE)).toMatchObject({ ok: true, daten: { lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03" } });
    expect(zeilePruefen({ zeile: 4, felder: ["Meier", ""] }, zu2, HEUTE)).toEqual({ zeile: 4, ok: false, grund: "Name lässt sich nicht in Nachname und Vorname trennen" });
    expect(zeilePruefen({ zeile: 5, felder: ["", "1984-07-03"] }, zu2, HEUTE)).toEqual({ zeile: 5, ok: false, grund: "Name fehlt" });
  });
  it("setzt keine Einwilligungen", () => {
    const r = z(["1", "Berg", "Tom", "", "", "", "", "0171 1234567", "tom@example.de"]);
    expect(r.ok && Object.keys(r.daten)).not.toContain("contactConsentAt");
    expect(r.ok && Object.keys(r.daten)).not.toContain("whatsappConsentAt");
  });
});

describe("Dubletten", () => {
  const p = (zeile: number, lastName: string, firstName: string, birthDate: string | null, patientNummer: string | null = null): ImportPatient => ({
    zeile, lastName, firstName, birthDate, patientNummer, geschlecht: null, insuranceType: null, insuranceName: null, phone: null, email: null,
  });

  it("vergleicht Namen ohne Groß-/Kleinschreibung, Umlaut-Schreibweise und Leerzeichen", () => {
    expect(namensSchluessel({ lastName: "Müller", firstName: "Jörg", birthDate: "1984-07-03" })).toBe(namensSchluessel({ lastName: "MUELLER ", firstName: "joerg", birthDate: new Date("1984-07-03T00:00:00Z") }));
    expect(namensSchluessel({ lastName: "Müller-Lüdenscheidt", firstName: "A", birthDate: null })).toBe(namensSchluessel({ lastName: "Mueller Luedenscheidt", firstName: "a", birthDate: null }));
    expect(namensSchluessel({ lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03" })).not.toBe(namensSchluessel({ lastName: "Meier", firstName: "Anna", birthDate: "1984-07-04" }));
    expect(namensSchluessel({ lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03" })).not.toBe(namensSchluessel({ lastName: "Meier", firstName: "Anna", birthDate: null }));
  });
  it("vergleicht Patientennummern ohne Leerzeichen und Groß-/Kleinschreibung", () => {
    expect(nummerSchluessel(" A 47 11 ")).toBe("a4711");
    expect(nummerSchluessel("")).toBeNull();
    expect(nummerSchluessel(null)).toBeNull();
  });
  it("überspringt, wer schon da ist: gleicher Name und Geburtsdatum", () => {
    const bestand = bestandAus([{ lastName: "Meier", firstName: "Anna", birthDate: new Date("1984-07-03T00:00:00Z") }]);
    expect(einordnen([p(2, "MEIER", "anna", "1984-07-03"), p(3, "Meier", "Anna", "1990-01-01")], bestand)).toEqual([
      { zeile: 2, status: "vorhanden", grund: "gleicher Name und gleiches Geburtsdatum" },
      { zeile: 3, status: "neu" },
    ]);
  });
  it("überspringt, wer schon da ist: gleiche Patientennummer (aus Import oder Praxissoftware)", () => {
    const bestand = bestandAus([
      { lastName: "Alt", firstName: "Name", birthDate: null, patientNummer: "4711" },
      { lastName: "Aus", firstName: "PVS", birthDate: null, externalId: "815" },
    ]);
    expect(einordnen([p(2, "Neu", "Name", "1984-07-03", "4711"), p(3, "Ganz", "Anders", null, "0815"), p(4, "X", "Y", null, "815")], bestand).map((e) => e.status)).toEqual(["vorhanden", "neu", "vorhanden"]);
  });
  it("zählt Doppelte in derselben Datei nur einmal", () => {
    const e = einordnen([p(2, "Meier", "Anna", "1984-07-03"), p(3, "Meier", "Anna", "1984-07-03"), p(4, "Berg", "Tom", null, "7"), p(5, "Berg", "Thomas", null, "7")], bestandAus([]));
    expect(e.map((x) => x.status)).toEqual(["neu", "vorhanden", "neu", "vorhanden"]);
  });
  it("ohne Geburtsdatum gilt nur als gleich, wer auch keins hat", () => {
    const bestand = bestandAus([{ lastName: "Meier", firstName: "Anna", birthDate: null }]);
    expect(einordnen([p(2, "Meier", "Anna", null), p(3, "Meier", "Anna", "1984-07-03")], bestand).map((x) => x.status)).toEqual(["vorhanden", "neu"]);
  });
  it("ein zweiter Lauf mit derselben Datei legt nichts neu an", () => {
    const zeilen = [p(2, "Meier", "Anna", "1984-07-03", "1"), p(3, "Berg", "Tom", null)];
    const bestand = bestandAus([]);
    expect(einordnen(zeilen, bestand).every((e) => e.status === "neu")).toBe(true);
    expect(einordnen(zeilen, bestand).every((e) => e.status === "vorhanden")).toBe(true);
  });
});

describe("Datei lesen", () => {
  it("liest eine Windows-Datei mit Semikolon vollständig", () => {
    const g = dateiLesen(cp1252("Pat.-Nr.;Nachname;Vorname;Geb.-Datum;Kasse\r\n1;Müller;Jörg;03.07.1984;AOK\r\n2;Groß;Zoë;1.1.90;TK\r\n"));
    expect(g.zeichensatz).toBe("Windows-1252");
    expect(g.trennzeichen).toBe(";");
    expect(g.kopf).toEqual(["Pat.-Nr.", "Nachname", "Vorname", "Geb.-Datum", "Kasse"]);
    expect(g.zeilen).toHaveLength(2);
    expect(g.zuordnung).toMatchObject({ patientennummer: 0, nachname: 1, vorname: 2, geburtsdatum: 3, versicherung: 4 });
    expect(zeilePruefen(g.zeilen[1], g.zuordnung, HEUTE)).toMatchObject({ ok: true, daten: { lastName: "Groß", firstName: "Zoë", birthDate: "1990-01-01", zeile: 3 } });
  });
  it("liest UTF-8 mit Komma und Tabulator", () => {
    expect(dateiLesen(utf8("Nachname,Vorname\nMüller,Jörg\n")).trennzeichen).toBe(",");
    expect(dateiLesen(utf8("Nachname\tVorname\nMüller\tJörg\n")).trennzeichen).toBe("\t");
  });
  it("lehnt leere, zu kurze und einspaltige Dateien ab", () => {
    expect(() => dateiLesen(new Uint8Array())).toThrow(/leer/);
    expect(() => dateiLesen(utf8("Nachname;Vorname\n"))).toThrow(/Kopfzeile und mindestens eine Zeile/);
    expect(() => dateiLesen(utf8("Patientenliste\nMeier Anna\n"))).toThrow(/nur eine Spalte/);
  });
  it("erkennt Excel-Dateien und erklärt den Weg zur CSV", () => {
    expect(() => dateiLesen(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]))).toThrow(/Excel-Datei/);
    expect(() => dateiLesen(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]))).toThrow(/Excel-Datei/);
  });
  it("erlaubt höchstens 5.000 Zeilen je Datei", () => {
    const zeilen = (n: number) => "Nachname;Vorname\n" + Array.from({ length: n }, (_, i) => `N${i};V${i}`).join("\n");
    expect(dateiLesen(utf8(zeilen(MAX_ZEILEN))).zeilen).toHaveLength(5000);
    expect(() => dateiLesen(utf8(zeilen(MAX_ZEILEN + 1)))).toThrow(/höchstens 5\.000/);
  });
});

describe("Übertragung in Blöcken", () => {
  it("teilt in Blöcke", () => {
    expect(inBloecke([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(inBloecke([], 2)).toEqual([]);
    expect(inBloecke(Array.from({ length: 5000 }, (_, i) => i)).length).toBe(5000 / BLOCK);
  });
  const gut = { zeile: 2, lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03", geschlecht: "W", insuranceType: "GKV", insuranceName: "AOK", phone: "0171 1234567", email: "a@b.de", patientNummer: "1" };
  it("nimmt gültige Blöcke an und macht aus leeren Texten null", () => {
    const r = importBlockSchema.safeParse({ nurPruefen: true, patienten: [gut, { zeile: 3, lastName: "Berg", firstName: "Tom", insuranceName: " ", email: "" }] });
    expect(r.success).toBe(true);
    expect(r.success && r.data.patienten[1]).toEqual({ zeile: 3, lastName: "Berg", firstName: "Tom", birthDate: null, geschlecht: null, insuranceType: null, insuranceName: null, phone: null, email: null, patientNummer: null });
  });
  it("lehnt zu große Blöcke, leere Namen und fremde Werte ab", () => {
    expect(importBlockSchema.safeParse({ nurPruefen: false, patienten: Array.from({ length: BLOCK + 1 }, () => gut) }).success).toBe(false);
    expect(importBlockSchema.safeParse({ nurPruefen: false, patienten: [] }).success).toBe(false);
    expect(importBlockSchema.safeParse({ nurPruefen: false, patienten: [{ ...gut, lastName: " " }] }).success).toBe(false);
    expect(importBlockSchema.safeParse({ nurPruefen: false, patienten: [{ ...gut, birthDate: "03.07.1984" }] }).success).toBe(false);
    expect(importBlockSchema.safeParse({ nurPruefen: false, patienten: [{ ...gut, insuranceType: "BG" }] }).success).toBe(false);
    expect(importBlockSchema.safeParse({ patienten: [gut] }).success).toBe(false);
  });
  it("kennt keine Felder für Einwilligungen", () => {
    const r = importBlockSchema.safeParse({ nurPruefen: false, patienten: [{ ...gut, contactConsentAt: "2026-01-01", whatsappConsentAt: "2026-01-01", einwilligung: true }] });
    expect(r.success && Object.keys(r.data.patienten[0])).not.toContain("contactConsentAt");
    expect(r.success && Object.keys(r.data.patienten[0])).not.toContain("whatsappConsentAt");
    expect(r.success && Object.keys(r.data.patienten[0])).not.toContain("einwilligung");
  });
  it("prüft auf dem Server nach, was der Browser schickt", () => {
    const basis: ImportPatient = { zeile: 2, lastName: "Meier", firstName: "Anna", birthDate: "1984-07-03", geschlecht: null, insuranceType: null, insuranceName: null, phone: null, email: null, patientNummer: null };
    expect(serverPruefung(basis, HEUTE)).toBeNull();
    expect(serverPruefung({ ...basis, birthDate: "1984-02-31" }, HEUTE)).toBe("Geburtsdatum ungültig");
    expect(serverPruefung({ ...basis, birthDate: "2090-01-01" }, HEUTE)).toBe("Geburtsdatum ungültig");
    expect(serverPruefung({ ...basis, email: "kaputt" }, HEUTE)).toBe("E-Mail-Adresse ungültig");
    expect(serverPruefung({ ...basis, phone: "abc" }, HEUTE)).toBe("Mobilnummer ungültig");
  });
});
