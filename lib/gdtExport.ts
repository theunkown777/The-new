// GDT-Export (Satzart 6310 „Daten einer Untersuchung übermitteln“, GDT 2.1):
// Sorrida schreibt eine Datei, die die Arzt-Praxissoftware aus ihrem
// GDT-Importordner liest und in die Karteikarte übernimmt. Jede Zeile:
// 3 Stellen Zeilenlänge (inkl. CR LF), 4 Stellen Feldkennung, Inhalt.
// Zeichensatz ISO 8859-1 (Feld 9206 = 3). Feld 8100 enthält die Länge der
// ganzen Datei; sie wird nach dem Zusammensetzen eingetragen.

export interface GdtExportInput {
  patId: string;
  lastName: string;
  firstName: string;
  birthDate: Date | null;
  /** Kürzel des empfangenden Systems (8315), z. B. aus dem Startaufruf; sonst „PVS“. */
  receiver?: string;
  datum: Date;
  titel: string;
  text: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const ttmmjjjj = (d: Date) => `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;
const hhmmss = (d: Date) => `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

/** Länge einer Zeile in Bytes (ISO 8859-1: ein Byte je Zeichen). */
export function gdtZeile(feld: string, inhalt: string): string {
  const sauber = inhalt.replace(/[\r\n]+/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  const len = 3 + 4 + sauber.length + 2;
  if (len > 999) throw new Error("GDT-Zeile zu lang");
  return `${String(len).padStart(3, "0")}${feld}${sauber}\r\n`;
}

/** Freitext in GDT-Zeilen von höchstens 60 Zeichen umbrechen (üblich für 6220/6227). */
export function umbrechen(text: string, max = 60): string[] {
  const out: string[] = [];
  for (const absatz of text.split(/\r?\n/)) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      if (wort.length > max) {
        if (zeile) { out.push(zeile); zeile = ""; }
        for (let i = 0; i < wort.length; i += max) out.push(wort.slice(i, i + max));
        continue;
      }
      if ((zeile + " " + wort).trim().length > max) { out.push(zeile); zeile = wort; }
      else zeile = (zeile + " " + wort).trim();
    }
    out.push(zeile);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.map((z) => z || " ");
}

export function buildGdt6310(i: GdtExportInput): string {
  const zeilen = [
    gdtZeile("8000", "6310"),
    gdtZeile("8100", "00000"),
    gdtZeile("8315", (i.receiver || "PVS").slice(0, 8)),
    gdtZeile("8316", "SORRIDA"),
    gdtZeile("9206", "3"),
    gdtZeile("9218", "02.10"),
    gdtZeile("3000", i.patId),
    gdtZeile("3101", i.lastName),
    gdtZeile("3102", i.firstName),
    ...(i.birthDate ? [gdtZeile("3103", ttmmjjjj(i.birthDate))] : []),
    gdtZeile("6200", ttmmjjjj(i.datum)),
    gdtZeile("6201", hhmmss(i.datum)),
    gdtZeile("8402", "ALLG00"),
    gdtZeile("6227", i.titel),
    ...umbrechen(i.text).map((z) => gdtZeile("6220", z)),
  ];
  const gesamt = zeilen.join("").length;
  zeilen[1] = gdtZeile("8100", String(gesamt).padStart(5, "0"));
  return zeilen.join("");
}

/** In ISO 8859-1 kodieren (Umlaute als ein Byte). */
export function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let k = 0; k < text.length; k++) out[k] = text.charCodeAt(k) <= 0xff ? text.charCodeAt(k) : 0x3f;
  return out;
}
