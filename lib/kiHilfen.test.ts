import { describe, expect, it, vi } from "vitest";
import {
  ANLASS_SYSTEM,
  HILFE_SYSTEM,
  KiAntwortFehler,
  PREISLISTE_SYSTEM,
  UEBERSETZUNG_SPRACHEN,
  UEBERSETZUNG_SYSTEM,
  dateitypPasst,
  istPreislisteDateityp,
  jsonAusAntwort,
  kiAnlaesseZuordnen,
  kiHilfeBeantworten,
  kiHilfenGrenze,
  kiHilfenSchluessel,
  kiHilfenStand,
  kiLeistungUebersetzen,
  kiPreislisteLesen,
  KI_HILFE_OPTIONEN,
  hilfeTextBereinigen,
  namensKandidaten,
  ohneAnrede,
  ohnePersonenbezug,
  type KiClient,
} from "@/lib/kiHilfen";

/** Nachgebildeter KI-Dienst: merkt sich die Anfrage und antwortet mit dem vorgegebenen Text. */
function nachbildung(antwort: string, stop: string = "end_turn") {
  const create = vi.fn(async (_p: unknown, _o?: unknown) => ({ content: [{ type: "text", text: antwort }], stop_reason: stop }));
  return { client: { messages: { create } } as unknown as KiClient, create, anfrage: () => JSON.stringify(create.mock.calls[0]?.[0] ?? null) };
}

const ANLAESSE = [
  { id: "hoeren", label: "Hörtest" },
  { id: "tinnitus", label: "Tinnitus" },
  { id: "allergie", label: "Heuschnupfen und Allergie" },
];

describe("ohnePersonenbezug", () => {
  it("entfernt Namen, Kontaktdaten, Datumsangaben und Versichertennummern", () => {
    const t = ohnePersonenbezug("Erika Mustermann, geb. 03.04.1961, A123456789, Tel. 0171 2345678, erika@example.org wünscht Hörtest", [{ firstName: "Erika", lastName: "Mustermann" }]);
    expect(t).not.toMatch(/Erika|Mustermann|1961|A123456789|0171|example\.org/);
    expect(t).toContain("Hörtest");
    expect(t).toContain("[DATUM]");
    expect(t).toContain("[VERSICHERTENNUMMER]");
  });
  it("lässt gewöhnlichen Text stehen", () => {
    expect(ohnePersonenbezug("Reise im März, U10 und Check-up ab 35")).toBe("Reise im März, U10 und Check-up ab 35");
  });
});

describe("jsonAusAntwort", () => {
  it("liest JSON, auch im Markdown-Rahmen", () => {
    expect(jsonAusAntwort('{"a":1}')).toEqual({ a: 1 });
    expect(jsonAusAntwort('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("wirft bei leerem Text oder Fließtext", () => {
    expect(() => jsonAusAntwort("  ")).toThrow(KiAntwortFehler);
    expect(() => jsonAusAntwort("Hier ist die Antwort: {}")).toThrow(KiAntwortFehler);
  });
});

describe("kiAnlaesseZuordnen", () => {
  it("gibt nur IDs aus der Liste zurück und schickt keine persönlichen Angaben", async () => {
    const k = nachbildung('{"anlaesse":["A1","A3","A1"]}');
    const ids = await kiAnlaesseZuordnen({
      text: "Frau Mustermann (erika@example.org, 0171 2345678, geb. 03.04.1961) hört schlecht, Heuschnupfen",
      anlaesse: ANLAESSE,
      namen: [{ firstName: "Erika", lastName: "Mustermann" }],
      client: k.client,
    });
    expect(ids).toEqual(["hoeren", "allergie"]);
    const gesendet = k.anfrage();
    expect(gesendet).not.toMatch(/Mustermann|example\.org|0171|1961/);
    expect(gesendet).toContain("A2: Tinnitus");
    // Die echten IDs der Anlässe gehen nicht an den Dienst, nur neutrale Kennungen und Bezeichnungen.
    expect(gesendet).not.toContain("hoeren");
    expect(k.create.mock.calls[0][0]).toMatchObject({ system: ANLASS_SYSTEM });
  });
  it("lehnt Kennungen ab, die nicht in der Liste stehen", async () => {
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung('{"anlaesse":["A9"]}').client })).rejects.toMatchObject({ grund: "format" });
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung('{"anlaesse":["hoeren"]}').client })).rejects.toMatchObject({ grund: "format" });
  });
  it("lehnt zusätzliche Felder, Fließtext, Ablehnung und abgeschnittene Antworten ab", async () => {
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung('{"anlaesse":[],"empfehlung":"Hörtest"}').client })).rejects.toMatchObject({ grund: "format" });
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung("Ich empfehle einen Hörtest.").client })).rejects.toMatchObject({ grund: "kein-json" });
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung("", "refusal").client })).rejects.toMatchObject({ grund: "abgelehnt" });
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client: nachbildung('{"anlaesse":["A1"', "max_tokens").client })).rejects.toMatchObject({ grund: "abgeschnitten" });
  });
  it("leere Liste: keine Anfrage", async () => {
    const k = nachbildung('{"anlaesse":[]}');
    expect(await kiAnlaesseZuordnen({ text: "x", anlaesse: [], client: k.client })).toEqual([]);
    expect(k.create).not.toHaveBeenCalled();
  });
  it("Fehler des Dienstes werden weitergegeben", async () => {
    const client = { messages: { create: vi.fn(async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }); }) } } as unknown as KiClient;
    await expect(kiAnlaesseZuordnen({ text: "x", anlaesse: ANLAESSE, client })).rejects.toMatchObject({ status: 401 });
  });
});

describe("kiPreislisteLesen", () => {
  it("liest Zeilen, rechnet in Cent und bereinigt Bezeichnungen", async () => {
    const k = nachbildung('{"zeilen":[{"bezeichnung":"Reisemedizinische   Beratung","betrag":30,"ab":false},{"bezeichnung":"Attest, Rückfragen an praxis@example.org","betrag":12.5},{"bezeichnung":"Akupunktur","betrag":60,"ab":true}]}');
    const zeilen = await kiPreislisteLesen({ mediaType: "image/png", base64: "AAAA", client: k.client });
    expect(zeilen).toEqual([
      { bezeichnung: "Reisemedizinische Beratung", betragCent: 3000, ab: false },
      { bezeichnung: "Attest, Rückfragen an [E-MAIL]", betragCent: 1250, ab: false },
      { bezeichnung: "Akupunktur", betragCent: 6000, ab: true },
    ]);
    const p = k.create.mock.calls[0][0] as { system: string; messages: { content: { type: string }[] }[] };
    expect(p.system).toBe(PREISLISTE_SYSTEM);
    expect(p.messages[0].content[0].type).toBe("image");
  });
  it("PDF geht als Dokument an den Dienst", async () => {
    const k = nachbildung('{"zeilen":[]}');
    expect(await kiPreislisteLesen({ mediaType: "application/pdf", base64: "AAAA", client: k.client })).toEqual([]);
    const p = k.create.mock.calls[0][0] as { messages: { content: { type: string; source?: { media_type: string } }[] }[] };
    expect(p.messages[0].content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
  });
  it("lehnt Beträge als Text und unbekannte Felder ab", async () => {
    await expect(kiPreislisteLesen({ mediaType: "image/png", base64: "AAAA", client: nachbildung('{"zeilen":[{"bezeichnung":"Attest","betrag":"12,50 €"}]}').client })).rejects.toMatchObject({ grund: "format" });
    await expect(kiPreislisteLesen({ mediaType: "image/png", base64: "AAAA", client: nachbildung('{"zeilen":[{"bezeichnung":"Attest","betrag":12,"patient":"Erika"}]}').client })).rejects.toMatchObject({ grund: "format" });
  });
});

describe("Dateien für die Preisliste", () => {
  const b = (...x: number[]) => new Uint8Array(x);
  const t = (s: string) => new TextEncoder().encode(s);
  it("erlaubt nur Bilder und PDF", () => {
    expect(istPreislisteDateityp("image/jpeg")).toBe(true);
    expect(istPreislisteDateityp("application/pdf")).toBe(true);
    expect(istPreislisteDateityp("image/svg+xml")).toBe(false);
    expect(istPreislisteDateityp("text/html")).toBe(false);
  });
  it("prüft den Dateianfang gegen den angegebenen Typ", () => {
    expect(dateitypPasst(t("%PDF-1.7 ..."), "application/pdf")).toBe(true);
    expect(dateitypPasst(b(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
    expect(dateitypPasst(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png")).toBe(true);
    expect(dateitypPasst(t("GIF89a..."), "image/gif")).toBe(true);
    expect(dateitypPasst(t("RIFF1234WEBPVP8 "), "image/webp")).toBe(true);
    expect(dateitypPasst(t("<html><script>"), "application/pdf")).toBe(false);
    expect(dateitypPasst(t("%PDF-1.7"), "image/png")).toBe(false);
    expect(dateitypPasst(b(), "image/jpeg")).toBe(false);
  });
});

describe("kiHilfeBeantworten", () => {
  const EINTRAEGE = [
    { id: "vorschlag-neu", frage: "Wie lege ich einen Vorschlag an?", antwort: "Über Vorschläge → Neuer Vorschlag.", pfad: "Vorschläge → Neuer Vorschlag" },
    { id: "team-einladen", frage: "Wie lade ich jemanden ein?", antwort: "Unter Einstellungen → Team.", pfad: "Einstellungen → Team" },
  ];
  type Anfrage = { system: { type: string; text: string }[]; messages: { content: string }[] };
  const anfrageVon = (k: ReturnType<typeof nachbildung>) => k.create.mock.calls[0][0] as unknown as Anfrage;
  it("gibt Antwort und Quellen als Einträge der Sammlung zurück", async () => {
    const k = nachbildung('{"passt":true,"antwort":"Öffnen Sie Vorschläge und wählen Sie Neuer Vorschlag.","quellen":["H1"]}');
    const r = await kiHilfeBeantworten({ frage: "Wie mache ich einen neuen Vorschlag für Frau Müller, Tel. 0171 2345678?", eintraege: EINTRAEGE, client: k.client });
    expect(r).toEqual({ passt: true, antwort: "Öffnen Sie Vorschläge und wählen Sie Neuer Vorschlag.", quellen: ["vorschlag-neu"] });
    expect(k.anfrage()).not.toContain("0171");
    expect(k.anfrage()).not.toContain("Müller");
    expect(k.anfrage()).toContain("Frau [NAME]");
    expect(anfrageVon(k).system[0]).toEqual({ type: "text", text: HILFE_SYSTEM });
  });
  it("das ganze mitgegebene Wissen ist die Grundlage im System-Text, die Frage steht im Inhalt", async () => {
    const viele = Array.from({ length: 160 }, (_, i) => ({ id: `e${i}`, frage: `Frage ${i}`, antwort: `Antwort ${i}`, pfad: "Menü" }));
    const k = nachbildung('{"passt":true,"antwort":"So.","quellen":["H160","H2"]}');
    const r = await kiHilfeBeantworten({ frage: "Wo ist das?", eintraege: viele, client: k.client });
    const a = anfrageVon(k);
    expect(a.system[1].text).toContain("H1\nFrage: Frage 0");
    expect(a.system[1].text).toContain("H160\nFrage: Frage 159");
    expect(a.messages[0].content).toContain("Wo ist das?");
    expect(a.messages[0].content).not.toContain("Frage 159");
    expect(r.quellen).toEqual(["e159", "e1"]);
  });
  it("Seitentitel und frühere Fragen gehen nur als bereinigter Kontext mit, höchstens drei", async () => {
    const k = nachbildung('{"passt":false,"antwort":"","quellen":[]}');
    await kiHilfeBeantworten({
      frage: "Und wo genau?",
      eintraege: EINTRAEGE,
      seitentitel: "Zahlungen",
      verlauf: ["alt eins", "Rechnung für Herrn Schmidt", "Erika Mustermann, geb. 03.04.1961", "Wie storniere ich?"],
      namen: [{ firstName: "Erika", lastName: "Mustermann" }],
      client: k.client,
    });
    const inhalt = anfrageVon(k).messages[0].content;
    expect(inhalt).toContain("Geöffnete Seite (nur Kontext): Zahlungen");
    expect(inhalt).toContain("Frühere Fragen (nur Kontext)");
    expect(inhalt).not.toContain("alt eins");
    expect(inhalt).toContain("Herrn [NAME]");
    expect(inhalt).not.toMatch(/Schmidt|Erika|Mustermann|1961/);
    expect(inhalt).toContain("Wie storniere ich?");
  });
  it("Zeitgrenze 20 Sekunden und höchstens eine Wiederholung je Anfrage", async () => {
    const k = nachbildung('{"passt":false,"antwort":"","quellen":[]}');
    await kiHilfeBeantworten({ frage: "x", eintraege: EINTRAEGE, client: k.client });
    expect(k.create.mock.calls[0][1]).toEqual({ timeout: 20_000, maxRetries: 1 });
    expect(KI_HILFE_OPTIONEN).toEqual({ timeout: 20_000, maxRetries: 1 });
  });
  it("passt nichts: leere Antwort, auch wenn die KI trotzdem Text liefert", async () => {
    const r = await kiHilfeBeantworten({ frage: "Wie rechne ich GOÄ 5 ab?", eintraege: EINTRAEGE, client: nachbildung('{"passt":false,"antwort":"Dazu weiß ich nichts.","quellen":[]}').client });
    expect(r).toEqual({ passt: false, antwort: "", quellen: [] });
  });
  it("Antwort ohne Quelle oder mit fremder Quelle wird abgelehnt", async () => {
    await expect(kiHilfeBeantworten({ frage: "x", eintraege: EINTRAEGE, client: nachbildung('{"passt":true,"antwort":"Irgendwas.","quellen":[]}').client })).rejects.toMatchObject({ grund: "format" });
    await expect(kiHilfeBeantworten({ frage: "x", eintraege: EINTRAEGE, client: nachbildung('{"passt":true,"antwort":"Irgendwas.","quellen":["H7"]}').client })).rejects.toMatchObject({ grund: "format" });
  });
  it("ohne Einträge keine Anfrage", async () => {
    const leer = nachbildung("{}");
    expect(await kiHilfeBeantworten({ frage: "x", eintraege: [], client: leer.client })).toEqual({ passt: false, antwort: "", quellen: [] });
    expect(leer.create).not.toHaveBeenCalled();
  });
});

describe("Namen in Fragen", () => {
  it("ersetzt Namen nach einer Anrede, auch unbekannte und klein geschriebene", () => {
    expect(ohneAnrede("Vorschlag für Frau Müller anlegen")).toBe("Vorschlag für Frau [NAME] anlegen");
    expect(ohneAnrede("Herrn Dr. Schmidt anrufen")).toBe("Herrn Dr. [NAME] anrufen");
    expect(ohneAnrede("Fr. Yilmaz und Herr Hans Meier, frau müller")).toBe("Fr. [NAME] und Herr [NAME], frau [NAME]");
    expect(ohneAnrede("Wie lege ich einen Patienten an?")).toBe("Wie lege ich einen Patienten an?");
  });
  it("Kandidaten für den Abgleich mit eigenen Patienten: großgeschriebene zuerst, ohne Doppelte, begrenzt", () => {
    expect(namensKandidaten(["Rechnung für Erika Mustermann", "erika"])).toEqual(["Rechnung", "Erika", "Mustermann", "für", "erika"]);
    expect(namensKandidaten(["a b c"])).toEqual([]);
    expect(namensKandidaten([Array.from({ length: 50 }, (_, i) => `Name${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`).join(" ")]).length).toBe(30);
  });
  it("hilfeTextBereinigen: bekannte Namen, Anrede, Kontakt, Datum", () => {
    const t = hilfeTextBereinigen("Termin für Erika Mustermann (Frau Mustermann), 03.04.1961, erika@example.org", [{ firstName: "Erika", lastName: "Mustermann" }]);
    expect(t).not.toMatch(/Erika|Mustermann|1961|example/);
    expect(t).toContain("[DATUM]");
  });
});

describe("kiLeistungUebersetzen", () => {
  const voll = Object.fromEntries(UEBERSETZUNG_SPRACHEN.map((l) => [l, { name: `Name ${l}`, kurz: `Kurz ${l}` }]));
  it("liefert alle sechs Sprachen", async () => {
    const k = nachbildung(JSON.stringify(voll));
    const r = await kiLeistungUebersetzen({ name: "Reisemedizinische Beratung", kurz: "Impfplan für Ihr Reiseziel", client: k.client });
    expect(Object.keys(r).sort()).toEqual([...UEBERSETZUNG_SPRACHEN].sort());
    expect(r.tr).toEqual({ name: "Name tr", kurz: "Kurz tr" });
    expect(k.create.mock.calls[0][0]).toMatchObject({ system: UEBERSETZUNG_SYSTEM });
  });
  it("ohne deutsche Kurzbeschreibung bleibt sie in jeder Sprache leer", async () => {
    const r = await kiLeistungUebersetzen({ name: "Attest", kurz: "", client: nachbildung(JSON.stringify(voll)).client });
    for (const l of UEBERSETZUNG_SPRACHEN) expect(r[l].kurz).toBe("");
  });
  it("fehlt eine Sprache oder kommt eine fremde dazu, wird nichts übernommen", async () => {
    const { ar: _ar, ...ohneAr } = voll;
    await expect(kiLeistungUebersetzen({ name: "Attest", client: nachbildung(JSON.stringify(ohneAr)).client })).rejects.toMatchObject({ grund: "format" });
    await expect(kiLeistungUebersetzen({ name: "Attest", client: nachbildung(JSON.stringify({ ...voll, fr: { name: "x", kurz: "" } })).client })).rejects.toMatchObject({ grund: "format" });
  });
});

describe("Schalter und Grenzen", () => {
  it("aktiv nur mit Schalter UND KI-Zugang", () => {
    expect(kiHilfenStand(true, true)).toEqual({ schalter: true, verfuegbar: true, aktiv: true });
    expect(kiHilfenStand(true, false).aktiv).toBe(false);
    expect(kiHilfenStand(false, true).aktiv).toBe(false);
    expect(kiHilfenStand(null, true).aktiv).toBe(false);
    expect(kiHilfenStand(undefined, true).aktiv).toBe(false);
  });
  it("Grenze je Praxis und Art; Gastzugänge bekommen weniger", () => {
    expect(kiHilfenGrenze("preisliste", false)).toBe(20);
    expect(kiHilfenGrenze("preisliste", true)).toBe(3);
    expect(kiHilfenGrenze("anlass", true)).toBe(20);
    expect(kiHilfenSchluessel("hilfe", "p1")).toBe("ki-hilfe:hilfe:p1");
    expect(kiHilfenSchluessel("hilfe", "p1")).not.toBe(kiHilfenSchluessel("hilfe", "p2"));
  });
  it("Gastzugang: eine Tagesgrenze für alle Demo-Praxen zusammen, unabhängig von der einzelnen Praxis", async () => {
    const { KI_HILFEN_DEMO_GESAMT_TAG, KI_HILFEN_PRO_STUNDE, kiHilfenDemoSchluessel } = await import("./kiHilfen");
    expect(kiHilfenDemoSchluessel("preisliste")).toBe("ki-hilfe-demo-gesamt:preisliste");
    expect(kiHilfenDemoSchluessel("preisliste")).not.toContain("p1");
    for (const art of Object.keys(KI_HILFEN_PRO_STUNDE) as (keyof typeof KI_HILFEN_PRO_STUNDE)[]) {
      // Mehr als eine einzelne Demo-Praxis in der Stunde darf, aber weit weniger als zehn Demo-Praxen einen Tag lang dürften.
      expect(KI_HILFEN_DEMO_GESAMT_TAG[art]).toBeGreaterThanOrEqual(kiHilfenGrenze(art, true));
      expect(KI_HILFEN_DEMO_GESAMT_TAG[art]).toBeLessThan(kiHilfenGrenze(art, true) * 24);
    }
  });
});
