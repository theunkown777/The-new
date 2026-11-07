import zlib from "zlib";

// EBM aus der KBV-Stammdatei SDEBM (Satzart 850, XML in einer ZIP-Datei).
// Quelle: https://update.kbv.de/ita-update/Stammdateien/SDEBM/
// Lizenz: "Lizenzvereinbarung Stammdateien für Softwarehersteller" der KBV.
// Nutzung im Rahmen der vertragsärztlichen Versorgung und Weitergabe an die
// eigenen Kunden erlaubt; keine Weitergabe an andere Softwarehersteller.
// Deshalb liegen die EBM-Daten nicht im Repository, sondern werden beim
// Import direkt von der KBV geladen (nur wenn die Lizenz bestätigt ist).

export const SDEBM_URL = "https://update.kbv.de/ita-update/Stammdateien/SDEBM/SDEBM_V1.61.zip";

/** Einträge einer ZIP-Datei lesen (zentrales Verzeichnis), ohne Fremdbibliothek. */
export function zipEintraege(buf: Buffer): { name: string; daten: () => Buffer }[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Keine gültige ZIP-Datei");
  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: { name: string; daten: () => Buffer }[] = [];
  for (let n = 0; n < anzahl; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP-Verzeichnis beschädigt");
    const methode = buf.readUInt16LE(p + 10);
    const groesse = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), kommLen = buf.readUInt16LE(p + 32);
    const lokal = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    out.push({
      name,
      daten: () => {
        const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
        const roh = buf.subarray(start, start + groesse);
        return methode === 0 ? Buffer.from(roh) : zlib.inflateRawSync(roh);
      },
    });
    p += 46 + nameLen + extraLen + kommLen;
  }
  return out;
}

export type EbmPosition = {
  code: string;
  text: string;
  hinweis: string | null;
  kapitel: string | null;
  abschnitt: string | null;
  punkte: number | null;
  euroCent: number | null;
  arztgruppen: string[];
  gueltigAb: Date | null;
  gueltigBis: Date | null;
};

const attr = (s: string, re: RegExp) => s.match(re)?.[1] ?? null;
const text = (html: string) =>
  html
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<\/(div|li|p|tr)>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const datum = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

/** Alle Gebührenordnungspositionen aus dem SDEBM-XML (Text bereits dekodiert). */
export function ebmAusXml(xml: string): EbmPosition[] {
  const starts: number[] = [];
  const re = /<gnr V="[^"]+" USE="/g;
  for (let m; (m = re.exec(xml)); ) starts.push(m.index);
  const out: EbmPosition[] = [];
  for (let i = 0; i < starts.length; i++) {
    const block = xml.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : xml.length);
    const allgemein = block.slice(0, block.indexOf("</allgemein>") + 1 || block.length);
    if (!allgemein.includes("<allgemein>")) continue;
    const code = attr(block, /^<gnr V="([^"]+)"/)!;
    const kurz = attr(allgemein, /<kurztext V="([^"]*)"/);
    const lang = allgemein.match(/<langtext>([\s\S]*?)<\/langtext>/)?.[1];
    const anm = allgemein.match(/<anmerkungen_liste>([\s\S]*?)<\/anmerkungen_liste>/)?.[1];
    const tmr = attr(allgemein, /<service_tmr V="([^"]*)"/) ?? "";
    const [ab, bis] = tmr.split("..");
    const kapitelNr = attr(allgemein, /<kapitel V="([^"]*)"/);
    const kapitelDn = attr(allgemein, /<kapitel V="[^"]*" DN="([^"]*)"/);
    const kapBez = attr(allgemein, /<kap_bez V="([^"]*)"/);
    const kapBezDn = attr(allgemein, /<kap_bez V="[^"]*" DN="([^"]*)"/);
    // Bewertung: U="1" Punkte, U="2" Euro (Kostenpauschalen)
    const bew = allgemein.match(/<bewertung V="([\d.,]+)" U="(\d+)"/);
    const wert = bew ? Number(bew[1].replace(",", ".")) : null;
    const bedingung = block.match(/<bedingung>([\s\S]*?)<\/bedingung>/)?.[1] ?? "";
    const fg = bedingung.match(/<fachgruppe_liste[\s\S]*?<\/fachgruppe_liste>/)?.[0] ?? "";
    const arztgruppen = Array.from(new Set(Array.from(fg.matchAll(/<fachgruppe V="(\d+)"/g)).map((m) => m[1])));
    const langText = lang ? text(lang) : "";
    out.push({
      code,
      text: (kurz ?? langText).trim(),
      hinweis: [langText && langText !== kurz ? langText : "", anm ? text(anm) : ""].filter(Boolean).join(" · ").slice(0, 3000) || null,
      kapitel: kapitelNr ? `${kapitelNr} ${kapitelDn ?? ""}`.trim() : null,
      abschnitt: kapBez ? `${kapBez} ${kapBezDn ?? ""}`.trim() : null,
      punkte: bew && bew[2] === "1" && wert != null ? Math.round(wert) : null,
      euroCent: bew && bew[2] === "2" && wert != null ? Math.round(wert * 100) : null,
      arztgruppen,
      gueltigAb: datum(ab),
      gueltigBis: datum(bis),
    });
  }
  return out;
}

/** Arztgruppen nach Bundesarztregister (S_BAR2_WBO) → Sorrida-Fach. */
const AG: [RegExp, string[]][] = [
  [/^(001|002|010|520|547)$/, ["hausarzt"]],
  [/^(080|540|541|548|328)$/, ["hausarzt"]],
  [/^(020|022)$/, ["chirurgie", "klinik"]],
  [/^030$/, ["augen"]],
  [/^(040|041|042|043|045|046|047|048|150|304|313|320|510|511|513|514|544|556|558|560|573|583)$/, ["chirurgie"]],
  [/^(044|322|542|546|574)$/, ["chirurgie", "aesthetik"]],
  [/^(050|51\d|515|516|517|571|572)$/, ["gyn"]],
  [/^(060|062)$/, ["hno"]],
  [/^(061|063|324|518|575)$/, ["hno"]],
  [/^(070|555)$/, ["haut", "aesthetik"]],
  [/^(081|125|523|552)$/, ["gastro"]],
  [/^(082|321|326|521|525|529|553|557)$/, ["kardio"]],
  [/^(083|120|504|527)$/, ["pneumo"]],
  [/^(084|088|522|543|551)$/, ["endo"]],
  [/^(085|327|524)$/, ["hausarzt"]],
  [/^(086|526|545)$/, ["hausarzt"]],
  [/^(087|528|554)$/, ["ortho"]],
  [/^(09\d|340|341|342|343|344|505|53[0-9]|56[2-5]|57[67]|58[4-8])$/, ["kinder"]],
  [/^(100|102|141|144|147|148|149|310|533|534|550|470|471|474|475|476)$/, ["psych"]],
  [/^(140|142|145|146|531|549)$/, ["neuro"]],
  // Mund-Kiefer-Gesichtschirurgie rechnet EBM ab, Zahnarztpraxen nicht (BEMA/GOZ)
  [/^(130|131|360|567)$/, ["chirurgie"]],
  [/^(160|161|512|559|580|581|582)$/, ["ortho"]],
  [/^(330|309|312)$/, ["ortho"]],
  [/^(19\d|220|291|535|570|578)$/, ["radiologie"]],
  [/^200$/, ["uro"]],
  [/^(089|503|561|579)$/, ["hausarzt"]],
];

export const AERZTLICHE_FAECHER = ["hausarzt", "augen", "haut", "gyn", "uro", "ortho", "hno", "kinder", "kardio", "radiologie", "neuro", "psych", "gastro", "pneumo", "endo", "chirurgie", "aesthetik", "klinik"];

/** Kapitel ohne Arztgruppen-Einschränkung: nach EBM-Kapitel zuordnen. */
function nachKapitel(kapitel: string | null): string[] {
  const k = kapitel?.split(" ")[0] ?? "";
  const tab: Record<string, string[]> = {
    "1": AERZTLICHE_FAECHER, "2": AERZTLICHE_FAECHER, "3": ["hausarzt"], "4": ["kinder"], "5": ["chirurgie", "klinik"], "6": ["augen"], "7": ["chirurgie"],
    "8": ["gyn"], "9": ["hno"], "10": ["haut"], "13": ["hausarzt", "kardio", "gastro", "pneumo", "endo"], "14": ["psych", "kinder"], "15": ["chirurgie"], "16": ["neuro"],
    "17": ["radiologie"], "18": ["ortho"], "20": ["hno"], "21": ["psych"], "22": ["psych"], "23": ["psych"], "24": ["radiologie"], "25": ["radiologie"],
    "26": ["uro"], "27": ["ortho"], "31": ["chirurgie", "ortho", "gyn", "uro", "augen", "hno", "haut", "klinik"], "32": AERZTLICHE_FAECHER, "33": AERZTLICHE_FAECHER,
    "34": ["radiologie"], "35": ["psych"], "36": ["klinik"], "37": ["hausarzt"], "38": ["hausarzt"], "40": AERZTLICHE_FAECHER,
  };
  return tab[k] ?? [];
}

export function ebmFaecher(p: Pick<EbmPosition, "arztgruppen" | "kapitel">): string[] {
  const aus = new Set<string>();
  for (const g of p.arztgruppen) for (const [re, f] of AG) if (re.test(g)) f.forEach((x) => aus.add(x));
  if (!aus.size) nachKapitel(p.kapitel).forEach((x) => aus.add(x));
  return Array.from(aus);
}
