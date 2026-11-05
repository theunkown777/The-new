import { describe, expect, it } from "vitest";
import { buildPain008, fruehestesEinzugsdatum, isValidGlaeubigerId, mandatsReferenz, sepaText } from "./sepa";

// Beispiel-Gläubiger-ID der Deutschen Bundesbank aus deren Merkblatt
const GID = "DE98ZZZ09999999999";
const IBAN_PRAXIS = "DE89370400440532013000";
const IBAN_PATIENT = "DE02120300000000202051";

describe("SEPA-Lastschrift", () => {
  it("prüft Gläubiger-IDs mit Prüfziffer", () => {
    expect(isValidGlaeubigerId(GID)).toBe(true);
    expect(isValidGlaeubigerId("DE 98 ZZZ 09999999999")).toBe(true);
    expect(isValidGlaeubigerId("DE99ZZZ09999999999")).toBe(false);
    expect(isValidGlaeubigerId("DE98ZZZ0999999999")).toBe(false);
  });
  it("schreibt Text in den SEPA-Zeichensatz um", () => {
    expect(sepaText("Zahnärztin Müller & Söhne", 70)).toBe("Zahnaerztin Mueller Soehne");
    expect(mandatsReferenz("2026-0042")).toBe("SOR-2026-0042");
  });
  it("Einzug frühestens am nächsten Bankarbeitstag", () => {
    expect(fruehestesEinzugsdatum(new Date("2026-11-06T10:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-09"); // Fr -> Mo
  });
  it("erzeugt pain.008.001.08 mit korrekten Summen", () => {
    const xml = buildPain008(
      { name: "Zahnarztpraxis Müller", iban: IBAN_PRAXIS, glaeubigerId: GID },
      [
        { endToEndId: "2026-0042", betragCent: 45000, mandatsRef: "SOR-2026-0042", mandatsDatum: new Date("2026-11-05"), name: "Anna Weiß", iban: IBAN_PATIENT, zweck: "Rechnung 2026-0042" },
        { endToEndId: "2026-0043", betragCent: 1250, mandatsRef: "SOR-2026-0043", mandatsDatum: new Date("2026-11-05"), name: "Ben Kraus", iban: IBAN_PATIENT, zweck: "Rechnung 2026-0043" },
      ],
      { msgId: "SOR-20261105-1", einzug: new Date("2026-11-09"), now: new Date("2026-11-05T12:00:00Z") },
    );
    expect(xml).toContain('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08"');
    expect(xml.match(/<NbOfTxs>2<\/NbOfTxs>/g)).toHaveLength(2);
    expect(xml.match(/<CtrlSum>462.50<\/CtrlSum>/g)).toHaveLength(2);
    expect(xml).toContain("<SeqTp>OOFF</SeqTp>");
    expect(xml).toContain("<Nm>Anna Weiss</Nm>");
    expect(xml).toContain("<ReqdColltnDt>2026-11-09</ReqdColltnDt>");
    expect(xml).toContain("<Id>NOTPROVIDED</Id>");
  });
  it("verweigert ungültige Daten", () => {
    expect(() => buildPain008({ name: "X", iban: IBAN_PRAXIS, glaeubigerId: "DE00ZZZ00000000000" }, [], { msgId: "a", einzug: new Date() })).toThrow(/Gläubiger/);
  });
});

import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const hatXmllint = (() => { try { execFileSync("xmllint", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe.skipIf(!hatXmllint)("pain.008 gegen das ISO-20022-Schema", () => {
  it("validiert gegen pain.008.001.08.xsd", () => {
    const xml = buildPain008(
      { name: "Zahnarztpraxis Müller", iban: IBAN_PRAXIS, glaeubigerId: GID, bic: "COBADEFFXXX" },
      [{ endToEndId: "2026-0042", betragCent: 45000, mandatsRef: "SOR-2026-0042", mandatsDatum: new Date("2026-11-05"), name: "Anna Weiß", iban: IBAN_PATIENT, zweck: "Rechnung 2026-0042 <Zahnersatz> & Füllung" }],
      { msgId: "SOR-TEST-1", einzug: new Date("2026-11-09"), now: new Date("2026-11-05T12:00:00Z") },
    );
    const f = join(mkdtempSync(join(tmpdir(), "sepa-")), "t.xml");
    writeFileSync(f, xml);
    const out = execFileSync("xmllint", ["--noout", "--schema", join(__dirname, "__fixtures__", "pain.008.001.08.xsd"), f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    expect(out).toBe("");
  });
});
