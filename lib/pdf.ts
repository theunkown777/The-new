import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { REPORT_TYPE_LABELS } from "@/lib/reportLabels";
import type { Brief } from "@/lib/erstattungsbrief";

// ---------------------------------------------------------------- aus einem Guss --
// Alle PDFs teilen Kopf und Fuß: Praxisname in Bordeaux, darunter ggf. Stammdaten, Titel und Datum, eine Haarlinie;
// unten auf jeder Seite eine Hinweiszeile und die Seitenzahl. Die Inhalte der einzelnen Dokumente bleiben, wie sie sind.

/** Farben der PDFs (wie in der App: Bordeaux, Tinte, Haarlinie). */
export const PDF_FARBEN = { bordeaux: "#5A1D1D", tinte: "#24201F", tinte2: "#5E5650", linie: "#DCD2C6", salbei: "#557350" } as const;

type Doc = InstanceType<typeof PDFDocument>;

/** Dokument anlegen und die Ausgabe einsammeln. Seiten bleiben im Speicher, bis der Fuß gesetzt ist. */
function pdfStart(optionen: ConstructorParameters<typeof PDFDocument>[0]): { doc: Doc; fertig: () => Promise<Buffer> } {
  const doc = new PDFDocument({ ...optionen, bufferPages: true });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(chunk as Buffer));
  return {
    doc,
    fertig: () => {
      doc.end();
      return new Promise<Buffer>((resolve, reject) => {
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    },
  };
}

/** Gemeinsamer Kopf: Praxisname, ggf. Stammdaten, Titel des Dokuments, ggf. Datum; darunter eine Haarlinie. */
export function pdfKopf(doc: Doc, a: { praxis: string; zeilen?: string[]; titel?: string; datum?: string | null }): void {
  const links = doc.page.margins.left;
  const breite = doc.page.width - links - doc.page.margins.right;
  doc.fontSize(16).font("Helvetica-Bold").fillColor(PDF_FARBEN.bordeaux).text(a.praxis, links, doc.y, { width: breite });
  if (a.zeilen?.length) doc.fontSize(9).font("Helvetica").fillColor(PDF_FARBEN.tinte2).text(a.zeilen.join(" · "), { width: breite });
  if (a.titel) {
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#333333").text(a.titel, { width: breite });
  }
  if (a.datum) doc.fontSize(9).font("Helvetica").fillColor(PDF_FARBEN.tinte2).text(a.datum, { width: breite });
  const y = doc.y + 7;
  doc.save().moveTo(links, y).lineTo(links + breite, y).lineWidth(0.6).strokeColor(PDF_FARBEN.linie).stroke().restore();
  doc.y = y + 9;
  doc.x = links;
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
}

/**
 * Gemeinsamer Fuß auf jeder Seite: Haarlinie, links eine Hinweiszeile (einzeilig, gekürzt), rechts die Seitenzahl.
 * Ganz am Ende aufrufen, wenn alle Seiten stehen.
 */
export function pdfFuss(doc: Doc, hinweis = ""): number {
  const bereich = doc.bufferedPageRange();
  for (let i = 0; i < bereich.count; i++) {
    doc.switchToPage(bereich.start + i);
    const links = doc.page.margins.left;
    const breite = doc.page.width - links - doc.page.margins.right;
    // Im unteren Rand schreiben, ohne dass pdfkit dafür eine neue Seite beginnt.
    const unten = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 36;
    doc.save().moveTo(links, y - 6).lineTo(links + breite, y - 6).lineWidth(0.6).strokeColor(PDF_FARBEN.linie).stroke().restore();
    doc.font("Helvetica").fontSize(8).fillColor(PDF_FARBEN.tinte2);
    if (hinweis) doc.text(hinweis, links, y, { width: breite - 90, lineBreak: false, ellipsis: true });
    doc.text(`Seite ${i + 1} von ${bereich.count}`, links, y, { width: breite, align: "right", lineBreak: false });
    doc.page.margins.bottom = unten;
  }
  return bereich.count;
}

interface ReportPdfInput {
  practiceName: string;
  authorName: string;
  patientName: string;
  patientBirthDate: string | null;
  reportType: string;
  treatmentDate: string | null;
  createdAt: string;
  text: string;
}

export async function buildReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const { doc, fertig } = pdfStart({ margin: 56 });
  const dokument = REPORT_TYPE_LABELS[input.reportType] ?? input.reportType;

  pdfKopf(doc, { praxis: input.practiceName, titel: dokument });
  doc.moveDown(0.4);

  doc.fillColor("#000000").fontSize(10);
  doc.text(`Patient: ${input.patientName}`);
  if (input.patientBirthDate) doc.text(`Geburtsdatum: ${input.patientBirthDate}`);
  if (input.treatmentDate) doc.text(`Behandlungsdatum: ${input.treatmentDate}`);
  doc.text(`Erstellt am: ${input.createdAt}`);
  doc.text(`Verfasst von: ${input.authorName}`);
  doc.moveDown(1.5);

  doc.fontSize(11).font("Helvetica").text(input.text, { align: "left", lineGap: 4 });

  pdfFuss(doc, `${input.practiceName} · ${dokument}`);
  return await fertig();
}

interface AgreementPdfInput {
  practiceName: string;
  patientName: string;
  patientBirthDate: string | null;
  proposalDate: string;
  text: string;
  kasse: number;
  eigen: number;
  signedAt: string;
  signedName: string;
  signaturePng: Buffer | null;
  /** Vermerk zur Geburtsdatum-Prüfung im Portal (lib/portalPruefung.ts, pruefVermerk) */
  pruefung?: string | null;
}

/** Einverständnis aus dem Patientenportal als PDF, mit Zeile für die Gegenzeichnung der Praxis. */
export async function buildAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const { doc, fertig } = pdfStart({ margin: 56, info: { Title: `Einverständnis ${input.patientName}` } });
  const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

  pdfKopf(doc, { praxis: input.practiceName, titel: "Einverständnis zum Behandlungsvorschlag (digital auf dem Behandlungsweg)" });
  doc.moveDown(0.4);
  doc.fillColor("#000000").fontSize(10);
  doc.text(`Patient/in: ${input.patientName}${input.patientBirthDate ? `, geb. ${input.patientBirthDate}` : ""}`);
  doc.text(`Vorschlag vom: ${input.proposalDate}`);
  doc.moveDown(1);
  doc.fontSize(11).text(input.text, { lineGap: 4 });
  doc.moveDown(1);
  // Kasse zuerst, dann Eigenanteil
  const x = doc.x, y = doc.y, w = 480, total = Math.max(input.kasse + input.eigen, 1);
  const wk = (input.kasse / total) * w;
  doc.rect(x, y, wk, 10).fill(PDF_FARBEN.salbei);
  doc.rect(x + wk, y, w - wk, 10).fill(PDF_FARBEN.bordeaux);
  doc.fillColor("#000000").fontSize(10).text(`Kasse zahlt voraussichtlich ${eur(input.kasse)}  ·  Eigenanteil voraussichtlich ${eur(input.eigen)}`, x, y + 16);
  doc.moveDown(2);
  doc.text(`Digital unterschrieben am ${input.signedAt} von ${input.signedName}:`);
  if (input.pruefung) doc.fontSize(9).fillColor("#555555").text(`Identität: persönlicher Link der Praxis. ${input.pruefung}.`).fillColor("#000000").fontSize(10);
  if (input.signaturePng) {
    const sx = doc.page.margins.left, sy = doc.y + 6;
    doc.image(input.signaturePng, sx, sy, { fit: [220, 80] });
    doc.y = sy + 86;
    doc.x = sx;
  }
  doc.moveDown(1.5);
  doc.text("______________________________          ______________________________");
  doc.text("Ort, Datum                                                 Unterschrift Patient/in (schriftliche Vereinbarung)");
  doc.moveDown(1.5);
  doc.text("______________________________");
  doc.text("Gegenzeichnung der Praxis");
  doc.moveDown(2);
  doc.fontSize(8).fillColor("#666666").text("Das digitale Einverständnis dokumentiert die Aufklärung und die Wahl des Patienten. Es ersetzt nicht die schriftliche Mehrkosten- bzw. IGeL-Vereinbarung, die vor der Behandlung unterschrieben wird.");
  pdfFuss(doc, `${input.practiceName} · Einverständnis zum Behandlungsvorschlag`);
  return await fertig();
}

export interface KosteninfoPdfInput {
  practiceName: string;
  patientName: string;
  patientBirthDate: string | null;
  proposalDate: string;
  status: string;
  /** Befunde mit allen gezeigten Optionen und Eigenanteil. */
  punkte: { wo: string; titel: string; optionen: { name: string; art: string; eigen: string; markierung: string }[] }[];
  summe: string;
  summeHinweis: string;
  /** Verlauf: was wann passiert ist (Link erzeugt, geöffnet, Rückmeldung, Unterschrift). */
  verlauf: { was: string; wann: string }[];
  patientWahl: string | null;
  patientNotiz: string | null;
  signed: { at: string; name: string; text: string; png: Buffer | null; pruefung?: string | null } | null;
  erstelltAm: string;
  erstelltVon: string;
}

/**
 * Nachweis „Kosteninformation“ für die Karteikarte: welche Möglichkeiten mit welchem Eigenanteil gezeigt wurden,
 * wann der Patient sie gesehen und was er gewählt hat. Dokumentiert die Information in Textform (§ 630c Abs. 3 BGB);
 * ersetzt weder das Aufklärungsgespräch noch den Heil- und Kostenplan oder die schriftliche Vereinbarung.
 */
export async function buildKosteninfoPdf(input: KosteninfoPdfInput): Promise<Buffer> {
  const { doc, fertig } = pdfStart({ margin: 56, info: { Title: `Kosteninformation ${input.patientName}` } });
  const breite = doc.page.width - 112;
  const titel = (t: string) => {
    doc.moveDown(0.9);
    doc.fontSize(11).font("Helvetica-Bold").fillColor(PDF_FARBEN.bordeaux).text(t);
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor("#000000").fontSize(10);
  };

  pdfKopf(doc, { praxis: input.practiceName, titel: "Kosteninformation zum Behandlungsvorschlag (Nachweis für die Akte)" });
  doc.moveDown(0.3);
  doc.fillColor("#000000").fontSize(10);
  doc.text(`Patient/in: ${input.patientName}${input.patientBirthDate ? `, geb. ${input.patientBirthDate}` : ""}`);
  doc.text(`Vorschlag vom: ${input.proposalDate}  ·  Stand: ${input.status}`);

  titel("Gezeigte Möglichkeiten und Eigenanteil");
  for (const p of input.punkte) {
    doc.font("Helvetica-Bold").text(`${p.wo}: ${p.titel}`, { width: breite });
    doc.font("Helvetica");
    for (const o of p.optionen) {
      doc.text(`   ${o.name} (${o.art}): Eigenanteil ca. ${o.eigen}${o.markierung ? `   ${o.markierung}` : ""}`, { width: breite });
    }
    doc.moveDown(0.4);
  }
  doc.font("Helvetica-Bold").text(`${input.summeHinweis}: ca. ${input.summe}`);
  doc.font("Helvetica");

  titel("Verlauf");
  if (!input.verlauf.length) doc.text("Der Vorschlag wurde noch nicht an den Patienten gegeben.");
  for (const v of input.verlauf) doc.text(`${v.wann}   ${v.was}`, { width: breite });
  if (input.patientWahl) {
    doc.moveDown(0.4);
    doc.text(`Wahl des Patienten: ${input.patientWahl}`, { width: breite });
  }
  if (input.patientNotiz) doc.text(`Nachricht des Patienten: „${input.patientNotiz}“`, { width: breite });

  if (input.signed) {
    titel("Digitales Einverständnis");
    doc.text(input.signed.text, { width: breite, lineGap: 2 });
    doc.moveDown(0.5);
    doc.text(`Digital unterschrieben am ${input.signed.at} von ${input.signed.name}:`);
    if (input.signed.pruefung) doc.text(`Identität: persönlicher Link der Praxis. ${input.signed.pruefung}.`);
    if (input.signed.png) {
      if (doc.y > doc.page.height - 170) doc.addPage();
      const sx = doc.page.margins.left, sy = doc.y + 6;
      doc.image(input.signed.png, sx, sy, { fit: [200, 70] });
      doc.y = sy + 76;
      doc.x = sx;
    }
  }

  doc.moveDown(1.2);
  doc.fontSize(8).fillColor("#666666").text(
    `Erstellt am ${input.erstelltAm} von ${input.erstelltVon} mit Sorrida. Alle Beträge sind Schätzungen. Verbindlich sind der Heil- und Kostenplan bzw. die schriftliche Vereinbarung vor der Behandlung. Dieses Blatt dokumentiert die Kosteninformation in Textform; es ersetzt nicht das Aufklärungsgespräch.`,
    { width: breite },
  );
  pdfFuss(doc, `${input.practiceName} · Kosteninformation zum Behandlungsvorschlag`);
  return await fertig();
}

/**
 * Begleitbrief für die Versicherung (lib/erstattungsbrief.ts): Brief im Namen des Patienten,
 * A4, Anschrift im Fensterbereich. Der Text kommt fertig und druckbar aus briefText().
 */
export async function buildErstattungsbriefPdf(b: Brief): Promise<Buffer> {
  const { doc, fertig } = pdfStart({ size: "A4", margins: { top: 56, bottom: 62, left: 71, right: 57 }, info: { Title: b.betreff, Author: b.unterschrift } });
  const links = doc.page.margins.left;
  const breite = doc.page.width - links - doc.page.margins.right;
  const platz = (hoehe: number) => {
    if (doc.y + hoehe > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  // Absender oben, klein als Zeile über der Anschrift (für Fensterumschläge)
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  for (const z of b.absender) doc.text(z, links, doc.y, { width: breite });
  doc.y = Math.max(doc.y + 18, 128);
  doc.fontSize(7.5).fillColor("#555555").text(b.absender.join(" · "), links, doc.y, { width: 240, lineBreak: false, ellipsis: true });
  doc.moveDown(0.6);
  doc.fontSize(11).fillColor("#000000");
  for (const z of b.empfaenger) doc.text(z, links, doc.y, { width: 240 });
  doc.y = Math.max(doc.y + 24, 250);
  doc.text(b.ortDatum, links, doc.y, { width: breite, align: "right" });
  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").text(b.betreff, links, doc.y, { width: breite });
  doc.font("Helvetica").fontSize(10);
  for (const z of b.bezugszeilen) doc.text(z, { width: breite });
  doc.moveDown(1.2);

  doc.fontSize(11).text(b.anrede, { width: breite });
  doc.moveDown(0.7);
  for (const a of b.einleitung) {
    doc.text(a, { width: breite, lineGap: 2.5, align: "left" });
    doc.moveDown(0.7);
  }
  for (const p of b.posten) {
    platz(doc.heightOfString(p.titel, { width: breite }) + 30);
    doc.font("Helvetica-Bold").text(p.titel, links, doc.y, { width: breite, lineGap: 2 });
    doc.font("Helvetica").text(p.text, links + 14, doc.y, { width: breite - 14, lineGap: 2.5 });
    doc.x = links;
    doc.moveDown(0.6);
  }
  doc.moveDown(0.3);
  for (const a of b.schluss) {
    platz(40);
    doc.text(a, links, doc.y, { width: breite, lineGap: 2.5 });
    doc.moveDown(0.7);
  }
  platz(120);
  doc.moveDown(0.4);
  doc.text(b.gruss, links, doc.y, { width: breite });
  doc.moveDown(3);
  doc.text("______________________________", { width: breite });
  doc.text(b.unterschrift, { width: breite });
  doc.moveDown(1.5);
  doc.fontSize(8).fillColor("#666666").text(b.fusszeile, { width: breite });
  // Der Brief geht im Namen des Patienten hinaus: kein Praxiskopf, im Fuß nur Betreff und Seitenzahl.
  pdfFuss(doc, b.betreff);
  return await fertig();
}

/**
 * Kostenübersicht für die Patientin oder den Patienten (lib/kostenuebersicht.ts): dieselben Möglichkeiten und Beträge
 * wie in der Patientenansicht, zum Speichern und Einreichen. Ohne Geburtsdatum, Versichertennummer und Praxiszahlen.
 */
export async function buildKostenuebersichtPdf(k: import("@/lib/kostenuebersicht").Kostenuebersicht): Promise<Buffer> {
  const { doc, fertig } = pdfStart({ size: "A4", margin: 56, info: { Title: "Kostenübersicht zum Behandlungsvorschlag", Author: k.praxis } });
  const links = doc.page.margins.left;
  const breite = doc.page.width - 112;
  const platz = (hoehe: number) => {
    if (doc.y + hoehe > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  pdfKopf(doc, { praxis: k.praxis, zeilen: k.praxisZeilen, titel: "Kostenübersicht zum Behandlungsvorschlag (unverbindliche Schätzung)" });
  doc.fillColor("#000000").fontSize(10);
  doc.text(`Erstellt am: ${k.datum}`);
  doc.text("Name der versicherten Person: ______________________________");
  doc.moveDown(0.8);

  for (const p of k.positionen) {
    platz(60);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#000000").text(`${p.wo}: ${p.titel}`, links, doc.y, { width: breite });
    doc.font("Helvetica").fontSize(10);
    for (const o of p.optionen) {
      platz(34);
      doc.font(o.markierung ? "Helvetica-Bold" : "Helvetica").text(`${o.name}${o.markierung ? `  (${o.markierung})` : ""}`, links + 12, doc.y, { width: breite - 12 });
      doc.font("Helvetica").fillColor("#444444");
      const teile = [o.art, o.gesamt ? `Gesamt ${o.gesamt}` : "", o.kasse, o.zusatz, `Eigenanteil ${o.eigen}`].filter(Boolean);
      doc.text(teile.join("  ·  "), links + 12, doc.y, { width: breite - 12 });
      doc.fillColor("#000000");
      doc.moveDown(0.25);
    }
    if (p.abgewaehlt) doc.fillColor("#444444").text("Von Ihnen nicht gewünscht.", links + 12, doc.y, { width: breite - 12 }).fillColor("#000000");
    doc.x = links;
    doc.moveDown(0.5);
  }

  platz(70);
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(11).text(`${k.summeText}: ${k.summe}`, links, doc.y, { width: breite });
  doc.font("Helvetica").fontSize(10).text(`${k.kasseText}: ${k.kasseSumme}`, { width: breite });
  if (k.zusatzSumme) doc.text(`Erstattung Ihrer Zusatzversicherung (geschätzt): ${k.zusatzSumme}`, { width: breite });
  doc.moveDown(1);
  platz(80);
  doc.fontSize(9).fillColor("#333333").text(k.hinweis, { width: breite, lineGap: 1.5 });
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text(k.einreichen, { width: breite, lineGap: 1.5 });
  doc.font("Helvetica").moveDown(0.8);
  doc.fontSize(8).fillColor("#666666").text(k.fuss, { width: breite });
  pdfFuss(doc, `${k.praxis} · Kostenübersicht, unverbindliche Schätzung`);
  return await fertig();
}
