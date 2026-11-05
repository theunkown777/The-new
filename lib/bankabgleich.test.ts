import { describe, expect, it } from "vitest";
import { abgleichen, parseKontoauszug } from "./bankabgleich";

const CAMT = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt>
<Ntry><Amt Ccy="EUR">450.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-11-03</Dt></BookgDt>
<NtryDtls><TxDtls><RltdPties><Dbtr><Pty><Nm>Anna M&#252;ller</Nm></Pty></Dbtr></RltdPties><RmtInf><Ustrd>Rechnung 2026-0042 Mueller</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
<Ntry><Amt Ccy="EUR">89.90</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-11-03</Dt></BookgDt><NtryDtls><TxDtls><RmtInf><Ustrd>Miete</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
<Ntry><Amt Ccy="EUR">120.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-11-04</Dt></BookgDt><NtryDtls><TxDtls><RltdPties><Dbtr><Pty><Nm>Peter Schulz</Nm></Pty></Dbtr></RltdPties><RmtInf><Ustrd>Zahnarzt Oktober</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
</Stmt></BkToCstmrStmt></Document>`;

const CSV = `Kontoauszug;;;
Buchungstag;Valuta;Auftraggeber/Begünstigter;Verwendungszweck;Betrag (EUR)
04.11.2026;04.11.2026;Lisa Weber;RE 20260043;"1.250,00"
05.11.2026;05.11.2026;Stadtwerke;Abschlag;-80,00`;

const RECHNUNGEN = [
  { id: "a", number: "2026-0042", amountCent: 45000, lastName: "Müller", firstName: "Anna" },
  { id: "b", number: "2026-0043", amountCent: 130000, lastName: "Weber", firstName: "Lisa" },
  { id: "c", number: "2026-0044", amountCent: 12000, lastName: "Schulz", firstName: "Peter" },
];

describe("Bankabgleich", () => {
  it("liest CAMT.053 mit Richtung, Datum und Verwendungszweck", () => {
    const b = parseKontoauszug(CAMT);
    expect(b).toHaveLength(3);
    expect(b[0]).toMatchObject({ betragCent: 45000, eingang: true, zweck: "Rechnung 2026-0042 Mueller" });
    expect(b[1].eingang).toBe(false);
    expect(b[0].name).toBe("Anna Müller");
  });
  it("liest Bank-CSV mit Vorspann und deutschem Zahlenformat", () => {
    const b = parseKontoauszug(CSV);
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({ betragCent: 125000, eingang: true, name: "Lisa Weber" });
    expect(b[1].eingang).toBe(false);
  });
  it("ordnet über Nummer und Betrag zu, erkennt Teilzahlungen und Zahlungen ohne Nummer", () => {
    const { treffer, ohneZuordnung } = abgleichen([...parseKontoauszug(CAMT), ...parseKontoauszug(CSV)], RECHNUNGEN);
    const g = Object.fromEntries(treffer.map((t) => [t.rechnung.id, t.guete]));
    expect(g).toEqual({ a: "sicher", b: "abweichend", c: "vermutlich" });
    expect(ohneZuordnung).toHaveLength(0);
  });
  it("ordnet ohne eindeutigen Namen nichts nur nach Betrag zu", () => {
    const { treffer } = abgleichen([{ datum: new Date(), betragCent: 12000, eingang: true, zweck: "Danke", name: "Unbekannt" }], RECHNUNGEN);
    expect(treffer).toHaveLength(0);
  });
});
