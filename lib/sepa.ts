// SEPA-Lastschrift ohne Zahlungsdienstleister: Der Patient erteilt im Portal
// ein Einzel-Lastschriftmandat, Sorrida erzeugt daraus eine pain.008-Datei
// (ISO 20022, Version 08, wie sie deutsche Banken seit 2023 annehmen). Die
// Praxis lädt die Datei im Online-Banking hoch; das Geld geht direkt auf ihr
// Konto. Voraussetzung ist eine Gläubiger-Identifikationsnummer der
// Bundesbank und die Lastschriftvereinbarung mit der Hausbank.

import { isValidIban, normalizeIban } from "@/lib/invoices";

/** Gläubiger-ID prüfen: Land, Prüfziffer, 3 Zeichen Geschäftsbereich (nicht in der Prüfsumme), nationale Kennung. */
export function isValidGlaeubigerId(raw: string): boolean {
  const id = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(id)) return false;
  if (id.startsWith("DE") && id.length !== 18) return false;
  const national = id.slice(7);
  const moved = national + id.slice(0, 2) + id.slice(2, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

export const mandatsText = (praxis: string, glaeubigerId: string, referenz: string) =>
  `Ich ermächtige ${praxis} (Gläubiger-ID ${glaeubigerId}), eine einmalige Zahlung von meinem Konto mittels Lastschrift einzuziehen. ` +
  `Zugleich weise ich mein Kreditinstitut an, die von ${praxis} auf mein Konto gezogene Lastschrift einzulösen. ` +
  `Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. ` +
  `Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen. Mandatsreferenz: ${referenz}. ` +
  `Die Vorabankündigung (Pre-Notification) erfolgt mit dieser Rechnung; die Frist dafür wird auf einen Tag verkürzt.`;

/** Mandatsreferenz: eindeutig je Rechnung, max. 35 Zeichen, nur erlaubte Zeichen. */
export const mandatsReferenz = (rechnungsNummer: string) => `SOR-${rechnungsNummer}`.replace(/[^A-Za-z0-9+?/:().,' -]/g, "").slice(0, 35);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** SEPA-Zeichensatz: Umlaute umschreiben, Unerlaubtes entfernen. */
export function sepaText(s: string, max: number): string {
  const t = s.replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  return t.replace(/[^A-Za-z0-9/?:().,'+ -]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export interface Lastschrift {
  endToEndId: string;
  betragCent: number;
  mandatsRef: string;
  mandatsDatum: Date;
  name: string;
  iban: string;
  zweck: string;
}

export interface Glaeubiger {
  name: string;
  iban: string;
  bic?: string | null;
  glaeubigerId: string;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const euro = (c: number) => (c / 100).toFixed(2);

/** Frühestes Einzugsdatum für CORE: nächster Bankarbeitstag nach heute (Wochenende ausgelassen). */
export function fruehestesEinzugsdatum(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d;
}

export function buildPain008(g: Glaeubiger, posten: Lastschrift[], opts: { msgId: string; einzug: Date; now?: Date }): string {
  if (!isValidGlaeubigerId(g.glaeubigerId)) throw new Error("Gläubiger-ID ungültig");
  if (!isValidIban(g.iban)) throw new Error("IBAN der Praxis ungültig");
  for (const p of posten) if (!isValidIban(p.iban)) throw new Error(`IBAN ungültig (${p.endToEndId})`);
  const summe = posten.reduce((a, p) => a + p.betragCent, 0);
  const now = opts.now ?? new Date();
  const agent = (bic?: string | null) => (bic ? `<FinInstnId><BICFI>${esc(bic)}</BICFI></FinInstnId>` : `<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>`);
  const tx = posten.map((p) => `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${esc(sepaText(p.endToEndId, 35))}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${euro(p.betragCent)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${esc(p.mandatsRef)}</MndtId><DtOfSgntr>${isoDate(p.mandatsDatum)}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt>${agent(null)}</DbtrAgt>
        <Dbtr><Nm>${esc(sepaText(p.name, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${normalizeIban(p.iban)}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${esc(sepaText(p.zweck, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${esc(sepaText(opts.msgId, 35))}</MsgId>
      <CreDtTm>${now.toISOString().slice(0, 19)}</CreDtTm>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${euro(summe)}</CtrlSum>
      <InitgPty><Nm>${esc(sepaText(g.name, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(sepaText(opts.msgId + "-1", 35))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${posten.length}</NbOfTxs>
      <CtrlSum>${euro(summe)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>OOFF</SeqTp></PmtTpInf>
      <ReqdColltnDt>${isoDate(opts.einzug)}</ReqdColltnDt>
      <Cdtr><Nm>${esc(sepaText(g.name, 70))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${normalizeIban(g.iban)}</IBAN></Id></CdtrAcct>
      <CdtrAgt>${agent(g.bic)}</CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${g.glaeubigerId.replace(/\s+/g, "").toUpperCase()}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>${tx}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>
`;
}
