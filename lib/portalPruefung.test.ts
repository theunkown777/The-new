import { describe, expect, it } from "vitest";
import {
  BESTAETIGUNG_MINUTEN,
  MAX_FEHLVERSUCHE,
  PRUEF_TEXTE,
  SPERRE_MAX_MINUTEN,
  SPERRE_MINUTEN,
  berlinTag,
  eingabeTag,
  geburtsdatumStimmt,
  nachFehlversuch,
  pruefFehlerText,
  pruefText,
  pruefVermerk,
  restSperre,
  sperrMinuten,
} from "@/lib/portalPruefung";
import { pruefCookieName, pruefToken, pruefTokenLesen } from "@/lib/portalPruefungCookie";
import { kontaktSchema } from "@/lib/kontakt";

const JETZT = new Date("2026-11-14T10:00:00Z");

describe("Geburtsdatum: Kalendertag in deutscher Zeit", () => {
  it("liest den Tag so, wie die Praxis ihn sieht", () => {
    // So speichern Formular, Demo und PVS-Anbindung: Mitternacht UTC
    expect(berlinTag(new Date("1980-03-12T00:00:00Z"))).toBe("1980-03-12");
    // Als Mitternacht deutscher Zeit gespeichert (Winter +1, Sommer +2): derselbe Tag
    expect(berlinTag(new Date("1980-03-11T23:00:00Z"))).toBe("1980-03-12");
    expect(berlinTag(new Date("1990-07-14T22:00:00Z"))).toBe("1990-07-15");
    // Jahreswechsel und Schalttag
    expect(berlinTag(new Date("1999-12-31T23:30:00Z"))).toBe("2000-01-01");
    expect(berlinTag(new Date("2000-02-29T00:00:00Z"))).toBe("2000-02-29");
  });

  it("ist unabhängig von der Zeitzone des Servers", () => {
    const vorher = process.env.TZ;
    try {
      for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Auckland", "Europe/Berlin"]) {
        process.env.TZ = tz;
        expect(berlinTag(new Date("1980-03-12T00:00:00Z"))).toBe("1980-03-12");
        expect(eingabeTag({ tag: "12", monat: "3", jahr: "1980" }, JETZT)).toBe("1980-03-12");
        expect(geburtsdatumStimmt(new Date("1980-03-12T00:00:00Z"), eingabeTag({ tag: 12, monat: 3, jahr: 1980 }, JETZT))).toBe(true);
      }
    } finally {
      if (vorher === undefined) delete process.env.TZ;
      else process.env.TZ = vorher;
    }
  });

  it("nimmt Eingaben mit und ohne führende Null, als Text oder Zahl", () => {
    expect(eingabeTag({ tag: "03", monat: "04", jahr: "1975" }, JETZT)).toBe("1975-04-03");
    expect(eingabeTag({ tag: " 3 ", monat: "4", jahr: "1975" }, JETZT)).toBe("1975-04-03");
    expect(eingabeTag({ tag: 3, monat: 4, jahr: 1975 }, JETZT)).toBe("1975-04-03");
  });

  it("weist alles zurück, was kein echter Kalendertag ist", () => {
    const nein = [
      { tag: "31", monat: "2", jahr: "1980" },
      { tag: "29", monat: "2", jahr: "1981" },
      { tag: "0", monat: "5", jahr: "1980" },
      { tag: "12", monat: "13", jahr: "1980" },
      { tag: "12", monat: "3", jahr: "80" },
      { tag: "12", monat: "3", jahr: "1899" },
      { tag: "1e1", monat: "3", jahr: "1980" },
      { tag: "", monat: "", jahr: "" },
      { tag: null, monat: undefined, jahr: {} },
      { tag: "12", monat: "3", jahr: "2031" },
      { tag: "15", monat: "11", jahr: "2026" }, // morgen
    ];
    for (const e of nein) expect(eingabeTag(e, JETZT)).toBeNull();
    expect(eingabeTag({ tag: "29", monat: "2", jahr: "1980" }, JETZT)).toBe("1980-02-29");
    expect(eingabeTag({ tag: "14", monat: "11", jahr: "2026" }, JETZT)).toBe("2026-11-14"); // heute
  });

  it("vergleicht genau und sagt nur ja oder nein", () => {
    const geb = new Date("1980-03-12T00:00:00Z");
    expect(geburtsdatumStimmt(geb, "1980-03-12")).toBe(true);
    for (const fast of ["1980-03-11", "1980-03-13", "1980-12-03", "1981-03-12", "1980-03-1", "1980-03-123", "", null]) {
      expect(geburtsdatumStimmt(geb, fast)).toBe(false);
    }
    // Tag und Monat vertauscht ist falsch, auch wenn es "fast" stimmt
    expect(geburtsdatumStimmt(geb, eingabeTag({ tag: 3, monat: 12, jahr: 1980 }, JETZT))).toBe(false);
  });
});

describe("Fehlversuche und Sperre", () => {
  const now = JETZT.getTime();

  it("lässt vier Fehlversuche zu und nennt die verbleibenden", () => {
    for (let n = 1; n < MAX_FEHLVERSUCHE; n++) {
      expect(nachFehlversuch(n, 0, now)).toEqual({ gesperrt: false, rest: MAX_FEHLVERSUCHE - n });
    }
  });

  it("sperrt beim fünften Fehlversuch für 15 Minuten", () => {
    const f = nachFehlversuch(MAX_FEHLVERSUCHE, 0, now);
    expect(f).toEqual({ gesperrt: true, minuten: SPERRE_MINUTEN, bis: new Date(now + SPERRE_MINUTEN * 60_000) });
    // auch wenn gleichzeitige Anfragen den Zähler darüber hinaus getrieben haben
    expect(nachFehlversuch(MAX_FEHLVERSUCHE + 3, 0, now).gesperrt).toBe(true);
  });

  it("verdoppelt die Sperre bei jeder weiteren in Folge, höchstens 24 Stunden", () => {
    expect([0, 1, 2, 3, 4].map(sperrMinuten)).toEqual([15, 30, 60, 120, 240]);
    expect(sperrMinuten(7)).toBe(SPERRE_MAX_MINUTEN);
    expect(sperrMinuten(500)).toBe(SPERRE_MAX_MINUTEN);
    expect(sperrMinuten(-1)).toBe(SPERRE_MINUTEN);
    expect(sperrMinuten(NaN)).toBe(SPERRE_MINUTEN);
    const zweite = nachFehlversuch(MAX_FEHLVERSUCHE, 1, now);
    expect(zweite.gesperrt && zweite.minuten).toBe(30);
  });

  it("begrenzt das Durchprobieren über die Laufzeit eines Links", () => {
    // 60 Tage Link-Laufzeit: Wie viele Daten lassen sich bestenfalls probieren?
    let minuten = 0, sperren = 0;
    while (minuten < 60 * 24 * 60) minuten += sperrMinuten(sperren++);
    expect(sperren * MAX_FEHLVERSUCHE).toBeLessThan(400); // gegenüber rund 30.000 möglichen Geburtstagen
  });

  it("rechnet die Restdauer einer Sperre in vollen Minuten", () => {
    expect(restSperre(null, now)).toBe(0);
    expect(restSperre(new Date(now - 1), now)).toBe(0);
    expect(restSperre(new Date(now), now)).toBe(0);
    expect(restSperre(new Date(now + 1), now)).toBe(1);
    expect(restSperre(new Date(now + 15 * 60_000), now)).toBe(15);
    expect(restSperre(new Date(now + 14 * 60_000 + 1), now)).toBe(15);
  });
});

describe("Bestätigung (signiertes Cookie)", () => {
  const SECRET = "test-secret";
  const b = { linkHash: "a".repeat(64), patientId: "pat_1", geburtstag: "1980-03-12" };
  const now = JETZT.getTime();
  const MIN = 60_000;

  it("gilt für genau diese Bindung und liefert den Zeitpunkt der Prüfung", () => {
    const t = pruefToken(b, now, SECRET);
    const ok = pruefTokenLesen(t, b, now + 5 * MIN, SECRET);
    expect(ok?.geprueftAt.getTime()).toBe(now);
    expect(ok?.gueltigBis.getTime()).toBe(now + BESTAETIGUNG_MINUTEN * MIN);
  });

  it("läuft nach 30 Minuten ab", () => {
    const t = pruefToken(b, now, SECRET);
    expect(pruefTokenLesen(t, b, now + BESTAETIGUNG_MINUTEN * MIN, SECRET)).not.toBeNull();
    expect(pruefTokenLesen(t, b, now + BESTAETIGUNG_MINUTEN * MIN + 1, SECRET)).toBeNull();
  });

  it("gilt nicht für einen anderen Link, Patienten oder ein geändertes Geburtsdatum", () => {
    const t = pruefToken(b, now, SECRET);
    expect(pruefTokenLesen(t, { ...b, linkHash: "b".repeat(64) }, now, SECRET)).toBeNull();
    expect(pruefTokenLesen(t, { ...b, patientId: "pat_2" }, now, SECRET)).toBeNull();
    expect(pruefTokenLesen(t, { ...b, geburtstag: "1980-03-13" }, now, SECRET)).toBeNull();
    expect(pruefTokenLesen(t, b, now, "anderer-schluessel")).toBeNull();
  });

  it("lässt sich nicht verlängern oder fälschen", () => {
    const t = pruefToken(b, now, SECRET);
    const [iat, exp, sig] = t.split(".");
    // Ablauf nach hinten schieben
    expect(pruefTokenLesen(`${iat}.${Number(exp) + 60 * MIN}.${sig}`, b, now, SECRET)).toBeNull();
    // beide Zeiten verschieben (Dauer bleibt gleich, Signatur passt nicht mehr)
    expect(pruefTokenLesen(`${Number(iat) + 20 * MIN}.${Number(exp) + 20 * MIN}.${sig}`, b, now + 20 * MIN, SECRET)).toBeNull();
    // Signatur verändert, abgeschnitten, leer
    expect(pruefTokenLesen(`${iat}.${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, b, now, SECRET)).toBeNull();
    expect(pruefTokenLesen(`${iat}.${exp}.${sig.slice(0, 10)}`, b, now, SECRET)).toBeNull();
    expect(pruefTokenLesen(`${iat}.${exp}.`, b, now, SECRET)).toBeNull();
    for (const murks of [undefined, null, "", "x", "1.2.3", `${iat}.${exp}`, `${iat}.${exp}.${sig}.x`, "a".repeat(500)]) {
      expect(pruefTokenLesen(murks, b, now, SECRET)).toBeNull();
    }
  });

  it("nimmt keinen Wert aus der Zukunft an", () => {
    const t = pruefToken(b, now + 10 * MIN, SECRET);
    expect(pruefTokenLesen(t, b, now, SECRET)).toBeNull();
  });

  it("nutzt ohne Angabe den Signaturschlüssel der Anwendung", () => {
    const t = pruefToken(b, now);
    expect(pruefTokenLesen(t, b, now)).not.toBeNull();
    expect(pruefTokenLesen(t, b, now, "anderer-schluessel")).toBeNull();
  });

  it("hat je Link einen eigenen Cookie-Namen ohne den Link selbst", () => {
    expect(pruefCookieName("0123456789abcdef".repeat(4))).toBe("sorrida_pp_0123456789abcdef");
    expect(pruefCookieName("a".repeat(64))).not.toBe(pruefCookieName("b".repeat(64)));
  });
});

describe("Texte", () => {
  it("gibt es auf Deutsch und Englisch, sonst Deutsch", () => {
    expect(pruefText("de").titel).toMatch(/Geburtsdatum/);
    expect(pruefText("en").titel).toMatch(/date of birth/);
    for (const l of ["tr", "uk", "xx", "", null, undefined, "constructor", "__proto__"]) expect(pruefText(l)).toBe(PRUEF_TEXTE.de);
  });

  it("verrät im Fehlertext nichts über das richtige Datum", () => {
    for (const lang of ["de", "en"]) {
      const t = pruefText(lang);
      const texte = [t.falsch(4), t.falsch(1), t.gesperrt(15), t.gesperrt(1440), pruefFehlerText(t, { code: "FALSCH", rest: 2 }), pruefFehlerText(t, { code: "GESPERRT", minuten: 30 }), pruefFehlerText(t, null)];
      for (const s of texte) expect(s).not.toMatch(/\d{4}|fast|almost|close/i);
    }
    expect(pruefText("de").falsch(1)).toContain("1 Versuch.");
    expect(pruefText("de").gesperrt(1440)).toContain("etwa 24 Stunden");
    expect(pruefFehlerText(pruefText("de"), { code: "PRUEFUNG_NOETIG" })).toBe(pruefText("de").abgelaufen);
  });

  it("vermerkt für die Praxis, ob geprüft wurde", () => {
    expect(pruefVermerk(new Date("2026-11-14T10:05:00Z"))).toBe("Geburtsdatum im Portal bestätigt am 14.11.26, 11:05");
    expect(pruefVermerk(null)).toBe("Ohne Geburtsdatum-Prüfung");
  });
});

describe("Geburtsdatum in der Akte nachtragen", () => {
  it("nimmt nur echte, vergangene Kalendertage; leer heißt unverändert", () => {
    for (const ok of ["1980-03-12", "2000-02-29", "", null, undefined]) expect(kontaktSchema.safeParse({ geburtsdatum: ok }).success).toBe(true);
    for (const nein of ["1980-02-31", "12.03.1980", "1980-3-12", "1899-12-31", "2999-01-01", "abc"]) expect(kontaktSchema.safeParse({ geburtsdatum: nein }).success).toBe(false);
  });

  it("ergibt denselben Kalendertag, den das Portal abfragt", () => {
    // So speichert app/api/patients/[id]/kontakt: Mitternacht UTC
    expect(geburtsdatumStimmt(new Date("1980-03-12T00:00:00Z"), eingabeTag({ tag: "12", monat: "03", jahr: "1980" }, JETZT))).toBe(true);
  });
});
