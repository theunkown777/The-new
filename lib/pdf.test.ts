import { describe, expect, it } from "vitest";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { PDF_FARBEN, buildAgreementPdf, buildErstattungsbriefPdf, buildKosteninfoPdf, buildReportPdf, einverstaendnisTexte, pdfFuss, pdfKopf } from "@/lib/pdf";
import type { Brief } from "@/lib/erstattungsbrief";

/** Unkomprimiertes Dokument für die Prüfung: Kopf und Fuß lassen sich dann als Text wiederfinden. */
async function bauen(inhalt: (doc: InstanceType<typeof PDFDocument>) => void): Promise<string> {
  const doc = new PDFDocument({ margin: 56, bufferPages: true, compress: false });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on("data", (c) => chunks.push(c as Buffer));
  inhalt(doc);
  doc.end();
  const pdf = await new Promise<Buffer>((resolve) => stream.on("end", () => resolve(Buffer.concat(chunks))));
  return pdf.toString("latin1");
}
/** Text aus den Schreibbefehlen (pdfkit schreibt Standardschriften als Hex-Zeichenketten). */
const textAus = (roh: string) =>
  [...roh.matchAll(/\[([^\]]*)\]\s*TJ/g)]
    .map((m) => [...m[1].matchAll(/<([0-9a-fA-F]+)>/g)].map((h) => Buffer.from(h[1], "hex").toString("latin1")).join(""))
    .join("\n");
const seiten = (pdf: Buffer | string) => (typeof pdf === "string" ? pdf : pdf.toString("latin1")).match(/\/Type \/Page\b/g)?.length ?? 0;

describe("PDF: gemeinsamer Kopf und Fuß", () => {
  it("der Kopf nennt Praxis, Stammdaten, Titel und Datum", async () => {
    const roh = await bauen((doc) => {
      pdfKopf(doc, { praxis: "Praxis am Markt", zeilen: ["Marktplatz 1", "12345 Beispielstadt"], titel: "Kostenübersicht", datum: "Erstellt am 15.11.2026" });
      doc.text("Inhalt");
    });
    const text = textAus(roh);
    expect(text).toContain("Praxis am Markt");
    expect(text).toContain("Marktplatz 1");
    expect(text).toContain("12345 Beispielstadt");
    expect(text).toContain("Kosten");
    expect(text).toContain("Erstellt am 15.11.2026");
    expect(text.indexOf("Praxis am Markt")).toBeLessThan(text.indexOf("Inhalt"));
  });

  it("der Fuß steht auf jeder Seite mit Hinweiszeile und Seitenzahl und erzeugt keine neue Seite", async () => {
    let gezaehlt = 0;
    const roh = await bauen((doc) => {
      pdfKopf(doc, { praxis: "Praxis am Markt" });
      doc.text("Erste Seite");
      doc.addPage();
      doc.text("Zweite Seite");
      gezaehlt = pdfFuss(doc, "Praxis am Markt · Kostenübersicht");
    });
    const text = textAus(roh);
    expect(gezaehlt).toBe(2);
    expect(seiten(roh)).toBe(2);
    expect(text).toContain("Seite 1 von 2");
    expect(text).toContain("Seite 2 von 2");
    expect(text.match(/Praxis am Markt . Kosten/g)?.length).toBe(2);
  });

  it("nutzt die Farben des Design-Systems", () => {
    expect(PDF_FARBEN.bordeaux).toBe("#5A1D1D");
    expect(PDF_FARBEN.linie).toBe("#DCD2C6");
    expect(PDF_FARBEN.salbei).toBe("#557350");
  });
});

describe("PDF: die vorhandenen Dokumente", () => {
  const istPdf = (pdf: Buffer) => {
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1500);
  };

  it("Bericht: kurze Berichte bleiben einseitig, lange bekommen mehrere Seiten", async () => {
    const basis = { practiceName: "Praxis am Markt", authorName: "Dr. Beispiel", patientName: "Erika Muster", patientBirthDate: "01.02.1970", reportType: "BEFUND", treatmentDate: "14.11.2026", createdAt: "15.11.2026" };
    const kurz = await buildReportPdf({ ...basis, text: "Kurzer Bericht." });
    istPdf(kurz);
    expect(seiten(kurz)).toBe(1);
    const lang = await buildReportPdf({ ...basis, text: Array.from({ length: 160 }, (_, i) => `Zeile ${i + 1} des Berichts mit etwas Text.`).join("\n") });
    istPdf(lang);
    expect(seiten(lang)).toBeGreaterThan(1);
  });

  it("Einverständnis und Kosteninformation", async () => {
    const einv = await buildAgreementPdf({ practiceName: "Praxis am Markt", patientName: "Erika Muster", patientBirthDate: null, proposalDate: "10.11.2026", text: "Ich habe die Möglichkeiten gesehen.", kasse: 300, eigen: 200, signedAt: "12.11.2026", signedName: "Erika Muster", signaturePng: null, pruefung: null, fach: "zahn" });
    istPdf(einv);
    expect(seiten(einv)).toBe(1);
    const info = await buildKosteninfoPdf({
      practiceName: "Praxis am Markt", patientName: "Erika Muster", patientBirthDate: "01.02.1970", proposalDate: "10.11.2026", status: "Besprochen",
      punkte: [{ wo: "Vorsorge", titel: "Früherkennung", optionen: [{ name: "Kassenleistung", art: "Kasse", eigen: "0 €", markierung: "" }, { name: "Zusatzleistung", art: "Selbstzahler", eigen: "40 €", markierung: "von der Praxis vorgemerkt" }] }],
      summe: "40 €", summeHinweis: "Eigenanteil der vorgemerkten Auswahl", verlauf: [{ was: "Link erzeugt", wann: "10.11.2026" }], patientWahl: null, patientNotiz: null, signed: null, erstelltAm: "15.11.2026", erstelltVon: "Dr. Beispiel",
    });
    istPdf(info);
    expect(seiten(info)).toBe(1);
  });

  it("Einverständnis nennt die Vereinbarung des Fachs", async () => {
    expect(einverstaendnisTexte("zahn").hinweis).toBe("Das digitale Einverständnis dokumentiert die Aufklärung und die Wahl des Patienten. Es ersetzt nicht die schriftliche Mehrkosten- bzw. Privatvereinbarung, die vor der Behandlung unterschrieben wird.");
    expect(einverstaendnisTexte("zahn").titel).toBe("Einverständnis zum Behandlungsvorschlag");
    expect(einverstaendnisTexte("ortho").hinweis).toContain("schriftliche IGeL-Vereinbarung");
    expect(einverstaendnisTexte("physio").hinweis).toContain("schriftliche Privatvereinbarung");
    expect(einverstaendnisTexte("optik").hinweis).toContain("schriftliche Mehrkostenerklärung, die vor der Versorgung");
    expect(einverstaendnisTexte("klinik").hinweis).toContain("schriftliche Wahlleistungsvereinbarung");
    expect(einverstaendnisTexte("apotheke").titel).toBe("Einverständnis zum Beratungsvorschlag");
    expect(einverstaendnisTexte("apotheke").person).toBe("Name");
    expect(einverstaendnisTexte("apotheke").wo).toBe("digital im Portal");
    expect(einverstaendnisTexte("apotheke").gegenzeichnung).toBe("Gegenzeichnung der Apotheke");
    expect(einverstaendnisTexte("pflege").gegenzeichnung).toBe("Gegenzeichnung des Pflegedienstes");
    expect(einverstaendnisTexte("optik").link).toBe("persönlicher Link des Fachgeschäfts");
    for (const fach of ["zahn", "ortho", "physio"]) {
      expect(einverstaendnisTexte(fach).wo, fach).toBe("digital auf dem Behandlungsweg");
      expect(einverstaendnisTexte(fach).gegenzeichnung, fach).toBe("Gegenzeichnung der Praxis");
      expect(einverstaendnisTexte(fach).link, fach).toBe("persönlicher Link der Praxis");
    }
    expect(einverstaendnisTexte("hebamme").hinweis).toContain("die Wahl der Frau");
    for (const fach of ["physio", "optik", "klinik", "apotheke", "pflege", "hebamme"]) expect(einverstaendnisTexte(fach).hinweis, fach).not.toContain("IGeL");
    for (const fach of ["ortho", "physio", "optik", "hausarzt", null]) expect(einverstaendnisTexte(fach).hinweis, String(fach)).not.toMatch(/Mehrkosten- bzw\.|Heil- und Kostenplan/);
    istPdf(await buildAgreementPdf({ practiceName: "Optik am Markt", patientName: "Erika Muster", patientBirthDate: null, proposalDate: "10.11.2026", text: "Ich habe die Möglichkeiten gesehen.", kasse: 0, eigen: 200, signedAt: "12.11.2026", signedName: "Erika Muster", signaturePng: null, fach: "optik" }));
  });

  it("Begleitbrief: kein Praxiskopf, aber ein gültiges Dokument mit einer Seite", async () => {
    const brief = {
      absender: ["Erika Muster", "Weg 1", "12345 Beispielstadt"], empfaenger: ["Beispiel Versicherung", "Postfach", "54321 Musterhausen"], ortDatum: "Beispielstadt, 15.11.2026",
      betreff: "Bitte um Erstattung", bezugszeilen: ["Versicherungsnummer: 123"], anrede: "Sehr geehrte Damen und Herren,", einleitung: ["anbei die Rechnung."],
      posten: [{ titel: "Position 1", text: "Begründung" }], schluss: ["Vielen Dank."], gruss: "Mit freundlichen Grüßen", unterschrift: "Erika Muster", fusszeile: "Erstellt mit Sorrida.",
    } as unknown as Brief;
    const pdf = await buildErstattungsbriefPdf(brief);
    istPdf(pdf);
    expect(seiten(pdf)).toBe(1);
  });
});
