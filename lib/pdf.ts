import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { REPORT_TYPE_LABELS } from "@/lib/reportLabels";

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
  const doc = new PDFDocument({ margin: 56 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(chunk as Buffer));

  doc.fontSize(16).font("Helvetica-Bold").text(input.practiceName);
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica").fillColor("#555555");
  doc.text(REPORT_TYPE_LABELS[input.reportType] ?? input.reportType);
  doc.moveDown(1);

  doc.fillColor("#000000").fontSize(10);
  doc.text(`Patient: ${input.patientName}`);
  if (input.patientBirthDate) doc.text(`Geburtsdatum: ${input.patientBirthDate}`);
  if (input.treatmentDate) doc.text(`Behandlungsdatum: ${input.treatmentDate}`);
  doc.text(`Erstellt am: ${input.createdAt}`);
  doc.text(`Verfasst von: ${input.authorName}`);
  doc.moveDown(1.5);

  doc.fontSize(11).font("Helvetica").text(input.text, { align: "left", lineGap: 4 });

  doc.end();

  return await new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
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
}

/** Einverständnis aus dem Patientenportal als PDF, mit Zeile für die Gegenzeichnung der Praxis. */
export async function buildAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 56, info: { Title: `Einverständnis ${input.patientName}` } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(chunk as Buffer));
  const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

  doc.fontSize(16).font("Helvetica-Bold").fillColor("#6b2a24").text(input.practiceName);
  doc.moveDown(0.3);
  doc.fontSize(12).font("Helvetica").fillColor("#333333").text("Einverständnis zum Behandlungsvorschlag (digital auf dem Behandlungsweg)");
  doc.moveDown(1);
  doc.fillColor("#000000").fontSize(10);
  doc.text(`Patient/in: ${input.patientName}${input.patientBirthDate ? `, geb. ${input.patientBirthDate}` : ""}`);
  doc.text(`Vorschlag vom: ${input.proposalDate}`);
  doc.moveDown(1);
  doc.fontSize(11).text(input.text, { lineGap: 4 });
  doc.moveDown(1);
  // Kasse zuerst, dann Eigenanteil
  const x = doc.x, y = doc.y, w = 480, total = Math.max(input.kasse + input.eigen, 1);
  const wk = (input.kasse / total) * w;
  doc.rect(x, y, wk, 10).fill("#6c8c65");
  doc.rect(x + wk, y, w - wk, 10).fill("#6b2a24");
  doc.fillColor("#000000").fontSize(10).text(`Kasse zahlt voraussichtlich ${eur(input.kasse)}  ·  Eigenanteil voraussichtlich ${eur(input.eigen)}`, x, y + 16);
  doc.moveDown(2);
  doc.text(`Digital unterschrieben am ${input.signedAt} von ${input.signedName}:`);
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
  doc.end();
  return await new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
