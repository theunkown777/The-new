import { z } from "zod";

// Patientenliste aus einer Praxissoftware einlesen (CSV). Reine Logik, läuft
// im Browser (bis zur Vorschau) und auf dem Server (Prüfung vor dem Speichern):
// Zeichensatz und Trennzeichen erkennen, Spalten über die Kopfzeile zuordnen,
// Geburtsdatum lesen, Zeilen prüfen, Dubletten erkennen.
//
// Die Datei selbst wird nie gespeichert. Einwilligungen (E-Mail, WhatsApp)
// werden nicht aus der Datei gesetzt – die holt die Praxis selbst ein.

export const MAX_ZEILEN = 5000;
export const MAX_DATEI_BYTES = 8 * 1024 * 1024;
/** So viele Zeilen gehen je Anfrage an den Server. */
export const BLOCK = 500;

// --------------------------------------------------------- Zeichensatz ----

export type Zeichensatz = "UTF-8" | "Windows-1252" | "UTF-16";

/**
 * Bytes in Text: UTF-8 (mit oder ohne BOM), UTF-16 mit BOM, sonst Windows-1252
 * (ältere Praxissoftware, Excel „CSV (Trennzeichen-getrennt)“).
 */
export function dekodieren(bytes: Uint8Array): { text: string; zeichensatz: Zeichensatz } {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), zeichensatz: "UTF-8" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), zeichensatz: "UTF-16" };
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), zeichensatz: "UTF-16" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), zeichensatz: "UTF-8" };
  } catch {
    return { text: windows1252(bytes), zeichensatz: "Windows-1252" };
  }
}

// Windows-1252 von Hand: 0x80–0x9F sind dort Zeichen wie € und „“, nicht die
// Steuerzeichen aus Latin-1 (manche Laufzeiten lesen sie sonst falsch).
const CP1252_80 = "\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178";
function windows1252(bytes: Uint8Array): string {
  let out = "";
  const teil: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    teil.push(b >= 0x80 && b <= 0x9f ? CP1252_80[b - 0x80] : String.fromCharCode(b));
    if (teil.length >= 8192) {
      out += teil.join("");
      teil.length = 0;
    }
  }
  return out + teil.join("");
}

// -------------------------------------------------------- Trennzeichen ----

export type Trennzeichen = ";" | "," | "\t";
export const TRENNZEICHEN_NAME: Record<Trennzeichen, string> = { ";": "Semikolon", ",": "Komma", "\t": "Tabulator" };

/** Wie oft kommt das Zeichen außerhalb von Anführungszeichen in der Zeile vor? */
function zaehleAusserhalb(zeile: string, zeichen: string): number {
  let n = 0, inText = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') inText = !inText;
    else if (!inText && c === zeichen) n++;
  }
  return n;
}

/**
 * Trennzeichen erkennen: das Zeichen, das in der Kopfzeile vorkommt und in den
 * ersten Zeilen gleich oft steht. Bei Gleichstand gewinnt das Semikolon (in
 * deutschen Exporten üblich, weil das Komma in Zahlen und „Name, Vorname“ steht).
 */
export function trennzeichenErkennen(text: string): Trennzeichen {
  const zeilen = text.split(/\r\n|\n|\r/).filter((z) => z.trim() !== "").slice(0, 12);
  if (!zeilen.length) return ";";
  let bestes: Trennzeichen = ";", besterWert = -1;
  for (const t of [";", "\t", ","] as Trennzeichen[]) {
    const kopf = zaehleAusserhalb(zeilen[0], t);
    if (kopf === 0) continue;
    const gleich = zeilen.filter((z) => zaehleAusserhalb(z, t) === kopf).length;
    // Gleichmäßigkeit zählt mehr als die bloße Anzahl.
    const wert = (gleich / zeilen.length) * 1000 + kopf;
    if (wert > besterWert) {
      besterWert = wert;
      bestes = t;
    }
  }
  return bestes;
}

// ----------------------------------------------------------------- CSV ----

/**
 * CSV lesen: Felder in Anführungszeichen dürfen Trennzeichen, Zeilenumbrüche
 * und verdoppelte Anführungszeichen ("") enthalten. Ganz leere Zeilen fallen weg.
 * Jede Zeile trägt ihre Zeilennummer in der Datei (1 = erste Zeile).
 */
export function csvLesen(text: string, trenn: Trennzeichen): { zeile: number; felder: string[] }[] {
  const out: { zeile: number; felder: string[] }[] = [];
  let feld = "", felder: string[] = [], inText = false, zeile = 1, start = 1, warText = false;
  const fertigFeld = () => {
    felder.push(warText ? feld : feld.trim());
    feld = "";
    warText = false;
  };
  const fertigZeile = () => {
    fertigFeld();
    if (felder.some((f) => f !== "")) out.push({ zeile: start, felder });
    felder = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inText) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          feld += '"';
          i++;
        } else inText = false;
      } else {
        if (c === "\n") zeile++;
        feld += c;
      }
      continue;
    }
    if (c === '"' && feld.trim() === "") {
      inText = true;
      warText = true;
      feld = "";
    } else if (c === trenn) fertigFeld();
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      fertigZeile();
      zeile++;
      start = zeile;
    } else feld += c;
  }
  if (feld !== "" || felder.length) fertigZeile();
  return out.map((z) => ({ zeile: z.zeile, felder: z.felder.map((f) => f.trim()) }));
}

// ------------------------------------------------------------- Spalten ----

export const FELDER = ["nachname", "vorname", "name", "geburtsdatum", "geschlecht", "versicherung", "versicherungsart", "mobil", "email", "patientennummer"] as const;
export type Feld = (typeof FELDER)[number];

export const FELD_LABEL: Record<Feld, string> = {
  nachname: "Nachname",
  vorname: "Vorname",
  name: "Name in einer Spalte („Nachname, Vorname“)",
  geburtsdatum: "Geburtsdatum",
  geschlecht: "Geschlecht",
  versicherung: "Versicherung / Kasse",
  versicherungsart: "Versicherungsart (gesetzlich / privat)",
  mobil: "Mobilnummer",
  email: "E-Mail",
  patientennummer: "Patientennummer",
};

/** Kopfzeile vergleichbar machen: klein, Umlaute ausgeschrieben, nur Buchstaben und Ziffern. */
export const kopfNorm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

// Synonyme der Kopfzeilen gängiger Praxisprogramme und Exporte (schon normalisiert).
const SYNONYME: Record<Feld, string[]> = {
  nachname: ["nachname", "name", "familienname", "zuname", "lastname", "surname", "patnachname", "patname", "patientnachname", "patientenname", "nachnamepatient", "namepatient"],
  vorname: ["vorname", "rufname", "firstname", "givenname", "patvorname", "patientvorname", "vornamepatient", "vornamen"],
  name: ["patient", "nameundvorname", "namevorname", "nachnamevorname", "vollername", "vollstaendigername", "fullname", "patientname"],
  geburtsdatum: ["geburtsdatum", "gebdatum", "gebdat", "geb", "geboren", "geborenam", "geburtstag", "birthdate", "birthday", "dateofbirth", "dob", "patgebdatum", "patgeb", "gebdatumpatient"],
  geschlecht: ["geschlecht", "sex", "gender", "anrede", "geschl", "patgeschlecht"],
  versicherung: ["versicherung", "krankenkasse", "kasse", "kassenname", "krankenversicherung", "versicherungsname", "kostentraeger", "kostentraegername", "kk", "insurance", "versicherer", "kassename", "nameversicherung", "namekasse"],
  versicherungsart: ["versicherungsart", "versichertenart", "versart", "kassenart", "versicherungstyp", "versicherungsstatus", "privatgesetzlich", "gkvpkv", "pkvgkv", "abrechnungsart", "patientenart", "insurancetype", "versichertenstatus"],
  mobil: ["mobil", "mobilnummer", "mobiltelefon", "handy", "handynummer", "mobile", "mobilfunk", "telefonmobil", "telmobil", "mobiltel", "funk", "funktelefon", "cellphone", "handynr", "mobilnr"],
  email: ["email", "mail", "emailadresse", "mailadresse", "epost", "emailprivat"],
  patientennummer: ["patientennummer", "patnr", "patientnr", "patientennr", "patid", "patientid", "patientenid", "pid", "nummer", "nr", "id", "karteinummer", "karteinr", "patnummer", "patientnummer", "kartei"],
};

// Zweite Runde: Teilwörter, wenn kein Synonym genau passt. Reihenfolge = Vorrang.
const TEILWORT: [Feld, RegExp][] = [
  ["patientennummer", /^(pat|patient|patienten|kartei)(nr|nummer|id)/],
  ["geburtsdatum", /geburtsdat|geburtstag|gebdat|birthda|dateofbirth/],
  ["email", /e?mail/],
  ["mobil", /mobil|handy/],
  ["versicherungsart", /vers.*(art|typ|status)|kassenart/],
  ["versicherung", /^(?!.*(nummer|nr|ik|id|status|art|typ)).*(krankenkasse|versicherung|kasse|kostentraeger)/],
  ["geschlecht", /geschlecht|gender/],
  ["vorname", /vorname|firstname/],
  ["nachname", /nachname|familienname|lastname|zuname/],
];

export type Zuordnung = Record<Feld, number | null>;
export const leereZuordnung = (): Zuordnung => Object.fromEntries(FELDER.map((f) => [f, null])) as Zuordnung;

/**
 * Spalten automatisch erkennen. Jede Spalte wird höchstens einem Feld zugeordnet.
 * „Name“ allein gilt als Nachname; steht daneben keine Vorname-Spalte, als „Name in einer Spalte“.
 */
export function spaltenErkennen(kopf: string[]): Zuordnung {
  const z = leereZuordnung();
  const norm = kopf.map(kopfNorm);
  const frei = () => norm.map((_, i) => i).filter((i) => !Object.values(z).includes(i));
  for (const feld of FELDER) {
    const i = frei().find((idx) => SYNONYME[feld].includes(norm[idx]));
    if (i != null) z[feld] = i;
  }
  for (const [feld, muster] of TEILWORT) {
    if (z[feld] != null) continue;
    const i = frei().find((idx) => norm[idx] !== "" && muster.test(norm[idx]));
    if (i != null) z[feld] = i;
  }
  // Nur eine Spalte „Name“ ohne Vorname: dort steht meist „Nachname, Vorname“.
  if (z.nachname != null && z.vorname == null && z.name == null && norm[z.nachname] === "name") {
    z.name = z.nachname;
    z.nachname = null;
  }
  // Getrennte Spalten gehen vor.
  if (z.nachname != null && z.vorname != null) z.name = null;
  return z;
}

/** Fehlt etwas, ohne das nicht eingelesen werden kann? Gibt den Grund zurück oder null. */
export function zuordnungFehler(z: Zuordnung): string | null {
  const benutzt = Object.values(z).filter((v): v is number => v != null);
  if (new Set(benutzt).size !== benutzt.length) return "Eine Spalte ist zwei Feldern zugeordnet. Bitte jede Spalte nur einmal wählen.";
  if (z.nachname != null && z.vorname != null) return null;
  if (z.name != null && z.nachname == null && z.vorname == null) return null;
  if (z.nachname != null || z.vorname != null) return "Bitte Nachname und Vorname zuordnen (oder eine Spalte mit „Nachname, Vorname“).";
  return "Bitte mindestens Nachname und Vorname zuordnen.";
}

// --------------------------------------------------------------- Werte ----

const gueltig = (j: number, m: number, t: number): string | null => {
  if (j < 1900 || m < 1 || m > 12 || t < 1 || t > 31) return null;
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null;
  return `${String(j).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
};

/**
 * Geburtsdatum in gängigen Formaten lesen; Ergebnis „JJJJ-MM-TT“ oder null.
 * TT.MM.JJJJ · T.M.JJJJ · TT.MM.JJ · TT/MM/JJJJ · TT-MM-JJJJ · JJJJ-MM-TT · JJJJ/MM/TT · JJJJMMTT · TTMMJJJJ,
 * auch mit Uhrzeit dahinter („03.07.1984 00:00“). Schrägstriche werden deutsch gelesen (Tag zuerst).
 * Zweistellige Jahre: bis zum laufenden Jahr 20xx, sonst 19xx. Daten in der Zukunft sind ungültig.
 */
export function datumLesen(roh: string, heute = new Date()): string | null {
  const s = roh.trim().replace(/[T ]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i, "").trim();
  if (!s) return null;
  let j: number, m: number, t: number;
  let x: RegExpExecArray | null;
  if ((x = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) [j, m, t] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else if ((x = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s))) [t, m, j] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else if ((x = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/.exec(s))) {
    [t, m] = [Number(x[1]), Number(x[2])];
    const jj = Number(x[3]);
    j = jj <= heute.getFullYear() % 100 ? 2000 + jj : 1900 + jj;
  } else if ((x = /^(\d{8})$/.exec(s))) {
    const a = x[1];
    // JJJJMMTT, wenn es als solches gültig ist, sonst TTMMJJJJ.
    const alsIso = gueltig(Number(a.slice(0, 4)), Number(a.slice(4, 6)), Number(a.slice(6, 8)));
    if (alsIso && Number(a.slice(0, 4)) <= heute.getFullYear()) [j, m, t] = [Number(a.slice(0, 4)), Number(a.slice(4, 6)), Number(a.slice(6, 8))];
    else [t, m, j] = [Number(a.slice(0, 2)), Number(a.slice(2, 4)), Number(a.slice(4, 8))];
  } else return null;
  const iso = gueltig(j, m, t);
  if (!iso) return null;
  const morgen = new Date(Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1));
  if (new Date(`${iso}T00:00:00Z`) >= morgen) return null;
  return iso;
}

export function geschlechtLesen(roh: string): "W" | "M" | "D" | null {
  const s = kopfNorm(roh);
  if (!s) return null;
  if (["w", "f", "weiblich", "female", "frau", "fr", "maedchen", "weibl"].includes(s)) return "W";
  if (["m", "maennlich", "male", "herr", "hr", "mann", "junge", "maennl"].includes(s)) return "M";
  if (["d", "divers", "x", "diverse", "nonbinary", "nb"].includes(s)) return "D";
  return null;
}

/** „gesetzlich“/„privat“ in vielen Schreibweisen; alles andere (Selbstzahler, BG, unbekannt) bleibt leer. */
export function versicherungsartLesen(roh: string): "GKV" | "PKV" | null {
  const s = kopfNorm(roh);
  if (!s) return null;
  if (["gkv", "gesetzlich", "g", "kasse", "kassenpatient", "pflichtversichert", "pflicht", "gesetzlichversichert", "k", "kv", "kassenversichert", "mitglied", "familienversichert", "rentner"].includes(s)) return "GKV";
  if (["pkv", "privat", "p", "privatpatient", "privatversichert", "pv", "beihilfe", "privatbeihilfe"].includes(s)) return "PKV";
  if (s.startsWith("gesetzl") || s.startsWith("gkv")) return "GKV";
  if (s.startsWith("privat") || s.startsWith("pkv")) return "PKV";
  return null;
}

/** Telefonnummer säubern: Ziffern, +, Leerzeichen, / und - bleiben. Zu kurz oder ohne Ziffern → null. */
export function telefonLesen(roh: string): string | null {
  const s = roh.replace(/[^\d+/\- ()]/g, "").replace(/\s+/g, " ").trim();
  if (s.replace(/\D/g, "").length < 6) return null;
  return s.slice(0, 40);
}

export function emailLesen(roh: string): string | null {
  const s = roh.trim().toLowerCase();
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z0-9-]{2,}$/.test(s) && s.length <= 200 ? s : null;
}

/** „Nachname, Vorname“ (oder ohne Komma: letztes Wort = Nachname) in zwei Teile trennen. */
export function nameTeilen(roh: string): { nachname: string; vorname: string } | null {
  const s = roh.replace(/\s+/g, " ").trim();
  if (!s) return null;
  const k = s.indexOf(",");
  if (k >= 0) {
    const nachname = s.slice(0, k).trim(), vorname = s.slice(k + 1).trim();
    return nachname && vorname ? { nachname, vorname } : null;
  }
  const i = s.lastIndexOf(" ");
  if (i < 0) return null;
  return { vorname: s.slice(0, i).trim(), nachname: s.slice(i + 1).trim() };
}

// -------------------------------------------------------------- Zeilen ----

export interface ImportPatient {
  /** Zeilennummer in der Datei (1 = Kopfzeile) */
  zeile: number;
  lastName: string;
  firstName: string;
  /** JJJJ-MM-TT */
  birthDate: string | null;
  geschlecht: "W" | "M" | "D" | null;
  insuranceType: "GKV" | "PKV" | null;
  insuranceName: string | null;
  phone: string | null;
  email: string | null;
  patientNummer: string | null;
}

export type ZeilenErgebnis = { zeile: number; ok: true; daten: ImportPatient; hinweise: string[] } | { zeile: number; ok: false; grund: string };

const kurz = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** Eine Datenzeile prüfen und in einen Patienten übersetzen. Fehler nennen den Grund in einfachen Worten. */
export function zeilePruefen(z: { zeile: number; felder: string[] }, zu: Zuordnung, heute = new Date()): ZeilenErgebnis {
  const wert = (f: Feld) => (zu[f] != null ? (z.felder[zu[f]!] ?? "").trim() : "");
  let nachname = wert("nachname"), vorname = wert("vorname");
  if (!nachname && !vorname && zu.name != null) {
    const t = nameTeilen(wert("name"));
    if (!t) return { zeile: z.zeile, ok: false, grund: wert("name") ? "Name lässt sich nicht in Nachname und Vorname trennen" : "Name fehlt" };
    nachname = t.nachname;
    vorname = t.vorname;
  }
  if (!nachname && !vorname) return { zeile: z.zeile, ok: false, grund: "Nachname und Vorname fehlen" };
  if (!nachname) return { zeile: z.zeile, ok: false, grund: "Nachname fehlt" };
  if (!vorname) return { zeile: z.zeile, ok: false, grund: "Vorname fehlt" };
  if (nachname.length > 100 || vorname.length > 100) return { zeile: z.zeile, ok: false, grund: "Name ist zu lang (über 100 Zeichen)" };

  const hinweise: string[] = [];
  const gebRoh = wert("geburtsdatum");
  const birthDate = gebRoh ? datumLesen(gebRoh, heute) : null;
  if (gebRoh && !birthDate) return { zeile: z.zeile, ok: false, grund: `Geburtsdatum „${kurz(gebRoh, 20)}“ nicht lesbar` };

  const mailRoh = wert("email");
  const email = mailRoh ? emailLesen(mailRoh) : null;
  if (mailRoh && !email) hinweise.push("E-Mail-Adresse nicht gültig, wird weggelassen");
  const telRoh = wert("mobil");
  const phone = telRoh ? telefonLesen(telRoh) : null;
  if (telRoh && !phone) hinweise.push("Mobilnummer nicht lesbar, wird weggelassen");
  const artRoh = wert("versicherungsart");
  const insuranceType = artRoh ? versicherungsartLesen(artRoh) : null;
  if (artRoh && !insuranceType) hinweise.push("Versicherungsart nicht erkannt, bleibt leer");

  return {
    zeile: z.zeile,
    ok: true,
    hinweise,
    daten: {
      zeile: z.zeile,
      lastName: kurz(nachname, 100),
      firstName: kurz(vorname, 100),
      birthDate,
      geschlecht: geschlechtLesen(wert("geschlecht")),
      insuranceType,
      insuranceName: kurz(wert("versicherung"), 120) || null,
      phone,
      email,
      patientNummer: kurz(wert("patientennummer"), 40) || null,
    },
  };
}

// ------------------------------------------------------------ Dubletten ----

/** Namen für den Vergleich: klein, ohne Akzente, Umlaute ausgeschrieben, ohne Leer- und Sonderzeichen. */
export const nameNorm = kopfNorm;

/** Schlüssel „gleicher Nachname + Vorname + Geburtsdatum“. Ohne Geburtsdatum zählt nur, wer auch keins hat. */
export function namensSchluessel(p: { lastName: string; firstName: string; birthDate: string | Date | null }): string {
  const geb = p.birthDate == null ? "" : typeof p.birthDate === "string" ? p.birthDate.slice(0, 10) : p.birthDate.toISOString().slice(0, 10);
  return `${nameNorm(p.lastName)}|${nameNorm(p.firstName)}|${geb}`;
}

export const nummerSchluessel = (n: string | null | undefined): string | null => {
  const s = (n ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return s || null;
};

export interface Bestand {
  namen: Set<string>;
  nummern: Set<string>;
}

/** Bestand aus vorhandenen Patienten aufbauen (Patientennummern aus dem Import und aus der Praxissoftware). */
export function bestandAus(patienten: { lastName: string; firstName: string; birthDate: Date | string | null; patientNummer?: string | null; externalId?: string | null }[]): Bestand {
  const b: Bestand = { namen: new Set(), nummern: new Set() };
  for (const p of patienten) {
    b.namen.add(namensSchluessel(p));
    for (const n of [p.patientNummer, p.externalId]) {
      const k = nummerSchluessel(n);
      if (k) b.nummern.add(k);
    }
  }
  return b;
}

export type Einordnung = { zeile: number; status: "neu" } | { zeile: number; status: "vorhanden"; grund: string };

/**
 * Jede Zeile einordnen: neu oder schon vorhanden (gleicher Nachname + Vorname +
 * Geburtsdatum oder gleiche Patientennummer). Vorhandene werden übersprungen, nie
 * überschrieben. Steht jemand zweimal in der Datei, zählt nur die erste Zeile.
 * `bestand` wird dabei um die neuen Zeilen ergänzt.
 */
export function einordnen(zeilen: ImportPatient[], bestand: Bestand): Einordnung[] {
  return zeilen.map((p): Einordnung => {
    const name = namensSchluessel(p);
    const nr = nummerSchluessel(p.patientNummer);
    if (nr && bestand.nummern.has(nr)) return { zeile: p.zeile, status: "vorhanden", grund: "gleiche Patientennummer" };
    if (bestand.namen.has(name)) return { zeile: p.zeile, status: "vorhanden", grund: "gleicher Name und gleiches Geburtsdatum" };
    bestand.namen.add(name);
    if (nr) bestand.nummern.add(nr);
    return { zeile: p.zeile, status: "neu" };
  });
}

// ---------------------------------------------------------------- Datei ----

export interface DateiGelesen {
  zeichensatz: Zeichensatz;
  trennzeichen: Trennzeichen;
  kopf: string[];
  /** Datenzeilen ohne Kopfzeile */
  zeilen: { zeile: number; felder: string[] }[];
  zuordnung: Zuordnung;
}

/** Datei im Browser lesen: Zeichensatz, Trennzeichen, Kopfzeile, Spalten. Wirft bei unbrauchbaren Dateien einen Fehler in einfachen Worten. */
export function dateiLesen(bytes: Uint8Array): DateiGelesen {
  if (bytes.length === 0) throw new Error("Die Datei ist leer.");
  if (bytes.length > MAX_DATEI_BYTES) throw new Error("Die Datei ist zu groß (über 8 MB). Bitte teilen Sie die Liste auf.");
  // Excel-Dateien (.xlsx sind ZIP-Archive, .xls beginnt mit D0 CF) sind keine CSV.
  if ((bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf)) {
    throw new Error("Das ist eine Excel-Datei. Bitte speichern Sie die Liste als CSV („Speichern unter“ → CSV) und laden Sie diese Datei hoch.");
  }
  const { text, zeichensatz } = dekodieren(bytes);
  const trennzeichen = trennzeichenErkennen(text);
  const alle = csvLesen(text, trennzeichen);
  if (alle.length < 2) throw new Error("Die Datei braucht eine Kopfzeile und mindestens eine Zeile mit Daten.");
  const [kopfZeile, ...zeilen] = alle;
  if (kopfZeile.felder.length < 2) throw new Error("In der Kopfzeile wurde nur eine Spalte gefunden. Sind die Spalten mit Semikolon, Komma oder Tabulator getrennt?");
  if (zeilen.length > MAX_ZEILEN) throw new Error(`Die Datei hat ${zeilen.length.toLocaleString("de-DE")} Zeilen. Möglich sind höchstens ${MAX_ZEILEN.toLocaleString("de-DE")} je Datei – bitte teilen Sie die Liste auf.`);
  return { zeichensatz, trennzeichen, kopf: kopfZeile.felder, zeilen, zuordnung: spaltenErkennen(kopfZeile.felder) };
}

/** In Blöcke teilen (für die Übertragung an den Server). */
export function inBloecke<T>(liste: T[], groesse = BLOCK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < liste.length; i += groesse) out.push(liste.slice(i, i + groesse));
  return out;
}

// ------------------------------------------------------------ Schnittstelle ----

const leerZuNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((s) => s || null);

export const importPatientSchema = z.object({
  zeile: z.number().int().min(1).max(1_000_000),
  lastName: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .transform((s) => s ?? null),
  geschlecht: z.enum(["W", "M", "D"]).nullable().optional().transform((s) => s ?? null),
  insuranceType: z.enum(["GKV", "PKV"]).nullable().optional().transform((s) => s ?? null),
  insuranceName: leerZuNull(120),
  phone: leerZuNull(40),
  email: leerZuNull(200),
  patientNummer: leerZuNull(40),
});

export const importBlockSchema = z.object({
  /** true: nur einordnen (Vorschau), nichts speichern */
  nurPruefen: z.boolean(),
  patienten: z.array(importPatientSchema).min(1).max(BLOCK),
  /** Nur für das Protokoll: Teil x von y */
  teil: z.number().int().min(1).max(100).optional(),
  teile: z.number().int().min(1).max(100).optional(),
});

/**
 * Serverseitige Nachprüfung einer übertragenen Zeile (dem Browser wird nicht vertraut):
 * Datum echt und nicht in der Zukunft, E-Mail und Telefon gültig. Gibt den Grund zurück oder null.
 */
export function serverPruefung(p: ImportPatient, heute = new Date()): string | null {
  if (p.birthDate && datumLesen(p.birthDate, heute) !== p.birthDate) return "Geburtsdatum ungültig";
  if (p.email && emailLesen(p.email) !== p.email) return "E-Mail-Adresse ungültig";
  if (p.phone && !telefonLesen(p.phone)) return "Mobilnummer ungültig";
  return null;
}
