import { isDental, isTherapie, specialty } from "@/lib/specialties";
import { buildMedicalProposal } from "@/lib/medicalProposals";
// Behandlungsvorschläge: aus Zahnbefunden und allgemeinen
// Befunden entstehen je Befund Behandlungsoptionen - immer zuerst die
// Kassen-/Regelleistung, danach nur Alternativen, die der Befund fachlich
// rechtfertigt. Unterdrückte Optionen werden mit Begründung ausgewiesen,
// damit nachvollziehbar bleibt, warum etwas NICHT vorgeschlagen wird.
//
// Die Empfehlung ist ein Vorschlag; die fachliche Entscheidung trifft die
// behandelnde Person, die Wahl der Patient. Alle Beträge sind Schätzungen
// in Euro (Behandlungsvolumen inkl. Material/Labor) aus der Preisliste der
// Praxis - verbindlich bleiben HKP bzw. Mehrkostenvereinbarung.
//
// Reine Funktionen ohne DB-Zugriff, damit Client (Live-Vorschau) und Server
// (Neuberechnung beim Speichern) dieselbe Logik nutzen.

export { FINDINGS, GLOBAL_FINDINGS, UPPER_TEETH, LOWER_TEETH, isValidTooth } from "@/lib/dentalFindings";
export type { FindingCode, GlobalCode } from "@/lib/dentalFindings";
import { FINDINGS, GLOBAL_FINDINGS, UPPER_TEETH, LOWER_TEETH, type FindingCode, type GlobalCode } from "@/lib/dentalFindings";
const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

export const PRICE_DEFS = [
  { key: "fk_klein", label: "Kassenfüllung, 1–2 Flächen", default: 55 },
  { key: "fk_gross", label: "Kassenfüllung, ab 3 Flächen", default: 85 },
  { key: "komp_klein", label: "Mehrschicht-Komposit, 1–2 Flächen", default: 160 },
  { key: "komp_gross", label: "Mehrschicht-Komposit, ab 3 Flächen", default: 240 },
  { key: "inlay", label: "Keramik-Inlay", default: 890 },
  { key: "krone_regel", label: "Krone, Standardausführung (nur Privatpatienten)", default: 680 },
  { key: "krone_vk", label: "Vollkeramik-Krone", default: 1050 },
  { key: "bruecke_regel", label: "Brücke 3-gliedrig, Standardausführung (nur Privatpatienten)", default: 1750 },
  { key: "bruecke_vk", label: "Vollkeramik-Brücke 3-gliedrig", default: 2450 },
  { key: "teilprothese", label: "Teilprothese Modellguss (nur Privatpatienten)", default: 1300 },
  { key: "totalprothese", label: "Totalprothese je Kiefer (nur Privatpatienten)", default: 1200 },
  { key: "implantat", label: "Implantat inkl. Krone", default: 3400 },
  { key: "wk_kasse", label: "Wurzelbehandlung, Kassenleistung", default: 240 },
  { key: "wk_plus", label: "Endo-Zusatz (maschinell, Mikroskop, Längenmessung)", default: 390 },
  { key: "zst", label: "Zahnsteinentfernung (Kasse)", default: 18 },
  { key: "pzr", label: "Professionelle Zahnreinigung", default: 110 },
  { key: "par", label: "PAR-Behandlung inkl. Nachsorge (Kasse)", default: 950 },
  { key: "schiene", label: "Aufbissschiene (Kasse)", default: 260 },
  { key: "fv_kasse", label: "Fissurenversiegelung je Zahn (Kasse)", default: 22 },
  { key: "fv_privat", label: "Fissurenversiegelung je Zahn (privat)", default: 32 },
  { key: "bleaching", label: "Bleaching", default: 390 },
] as const;
export type PriceKey = (typeof PRICE_DEFS)[number]["key"];
export type Prices = Record<PriceKey, number>;

export const DEFAULT_PRICES = Object.fromEntries(
  PRICE_DEFS.map((d) => [d.key, d.default])
) as Prices;

/** Praxis-Overrides (aus der DB, evtl. unvollständig) über die Standardwerte legen. */
export function resolvePrices(overrides: unknown): Prices {
  const out = { ...DEFAULT_PRICES };
  if (overrides && typeof overrides === "object") {
    for (const d of PRICE_DEFS) {
      const v = (overrides as Record<string, unknown>)[d.key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[d.key] = v;
    }
  }
  return out;
}

export type OptionType =
  | "kasse"
  | "mehrkosten"
  | "privat"
  | "privatzusatz"
  | "regel"
  | "gleichartig"
  | "andersartig"
  /** Individuelle Gesundheitsleistung (Arztpraxen außerhalb der Zahnmedizin). */
  | "igel";

export interface ProposalOption {
  id: string;
  type: OptionType;
  name: string;
  total: number;
  benefits: string[];
  /** Kassenäquivalent bei Mehrkosten/Privatzusatz (§ 28 Abs. 2 SGB V). */
  base?: number;
  /** Kosten der Regelversorgung (Preis der Praxis), nur noch Rückfall, wenn kein Befund hinterlegt ist. */
  regel?: number;
  /** Festzuschuss-Befunde nach der Festzuschuss-Richtlinie (z. B. ["1.1", "1.3"]); bestimmen den Kassenanteil. */
  befunde?: string[];
  /** Wann die Kasse eine Selbstzahlerleistung doch übernimmt (Arztpraxen). */
  hinweis?: string;
  /** Ehrliche Angabe zum belegten Nutzen (Arztpraxen). */
  nutzen?: string;
  /** Gesetzliche Zuzahlung für Erwachsene (siehe zuzahlungBetrag). */
  zuzahlung?: boolean | "heilmittel" | "hilfsmittel";
  /** Eigene Bezeichnung der Leistungsart, z. B. "Selbstzahlerleistung" in Therapiepraxen. */
  typeLabel?: string;
  /** Rein kosmetisch (z. B. Bleaching): Zusatzversicherung und Privattarif erstatten nichts. */
  ohneErstattung?: boolean;
}

export interface ProposalItem {
  key: string;
  where: string;
  title: string;
  options: ProposalOption[];
  recommended: string | null;
  notes: { kind: "info" | "warn"; text: string }[];
  excluded: string[];
}

export interface PatientFactors {
  age: number | null;
  insurance: "GKV" | "PKV";
  bonusYears: 0 | 5 | 10;
  haertefall: boolean;
  /** GKV: Erstattung der Zahnzusatzversicherung auf den Eigenanteil; PKV: Tariferstattung auf den Gesamtbetrag. */
  erstattungProzent: number;
  /**
   * Nach welchen Festzuschuss-Sätzen gerechnet wird. Maßgeblich ist das
   * Bewilligungsdatum des HKP durch die Kasse, nicht der Behandlungstermin.
   * Fehlt der Wert, gilt das Jahr aus defaultZuschussJahr().
   */
  zuschussJahr?: ZuschussJahr;
}

/** Eigene Leistung einer Arztpraxis (Einstellungen → Vorschlagspreise). */
export interface CustomOffer {
  id: string;
  anlass: string;
  name: string;
  price: number;
  kasse?: boolean;
  kasseWenn?: string;
  nutzen?: string;
  benefits?: string[];
}

/** Praxisdaten für Arztpraxen, beim Speichern in den Vorschlag übernommen. */
export interface MedInput {
  prices?: Record<string, number>;
  custom?: CustomOffer[];
}

export interface ProposalInput {
  teeth: Partial<Record<string, FindingCode>>;
  globals: Partial<Record<GlobalCode, boolean>>;
  patient: PatientFactors;
  /** Fachgebiet (lib/specialties.ts); fehlt es, gilt Zahnmedizin. */
  fach?: string;
  /** Gewählte Anlässe bei Arztpraxen. */
  anlaesse?: string[];
  med?: MedInput;
}



const pos = (n: number) => n % 10;
const toothKind = (n: number) => (pos(n) <= 3 ? "front" : pos(n) <= 5 ? "pre" : "molar");

/** Mesialer und distaler Nachbar nach FDI; 11 grenzt an 21, 41 an 31. */
export function neighbors(n: number): number[] {
  const q = Math.floor(n / 10);
  const d = pos(n);
  const out: number[] = [];
  if (d > 1) out.push(q * 10 + d - 1);
  else out.push(({ 1: 2, 2: 1, 3: 4, 4: 3 } as Record<number, number>)[q] * 10 + 1);
  if (d < 8) out.push(q * 10 + d + 1);
  return out;
}

const needsWork = (f: FindingCode | undefined) =>
  f === "zerstoert" || f === "karies_gross" || f === "wurzel";

function emptyItem(key: string, where: string, title: string): ProposalItem {
  return { key, where, title, options: [], recommended: null, notes: [], excluded: [] };
}

function toothItem(n: number, f: FindingCode, input: ProposalInput, P: Prices, anker?: { where: string; bruecke: boolean }): ProposalItem {
  const k = toothKind(n);
  const g = input.globals;
  const r = emptyItem(`t${n}`, `Zahn ${n}`, FINDINGS[f]);
  const info = (text: string) => r.notes.push({ kind: "info", text });
  const warn = (text: string) => r.notes.push({ kind: "warn", text });

  switch (f) {
    case "karies_klein":
    case "fuellung_defekt":
      if (k === "front") {
        r.options.push({ id: "fk", type: "kasse", name: "Komposit-Füllung", total: P.fk_klein, benefits: ["zahnfarben", "im Frontzahnbereich Kassenleistung"] });
        r.excluded.push("Mehrschicht-Komposit gegen Aufpreis: im Frontzahnbereich ist Komposit bereits Kassenleistung.");
        r.recommended = "fk";
      } else {
        r.options.push({ id: "fk", type: "kasse", name: "Kassenfüllung (selbstadhäsiv)", total: P.fk_klein, benefits: ["zahnfarben, schnell gelegt", "kürzere Haltbarkeit"] });
        r.options.push({ id: "komp", type: "mehrkosten", name: "Mehrschicht-Komposit, adhäsiv", total: P.komp_klein, base: P.fk_klein, benefits: ["hochwertige Schichttechnik", "dicht und langlebig", "Kasse zahlt Kassenfüllung anteilig"] });
        r.excluded.push("Keramik-Inlay: bei kleinen Defekten müsste unnötig gesunde Zahnsubstanz abgetragen werden.");
        r.recommended = "komp";
      }
      if (f === "fuellung_defekt") info("Alte Amalgamfüllungen nur ersetzen, wenn sie defekt sind. Intakte Füllungen bleiben.");
      break;

    case "karies_gross":
      if (k === "front") {
        r.options.push({ id: "fk", type: "kasse", name: "Komposit-Füllung", total: P.fk_gross, benefits: ["zahnfarben", "Kassenleistung"] });
        r.excluded.push("Keramik-Inlay: im Frontzahnbereich nicht üblich.");
        warn("Bei sehr großem Defekt am Frontzahn prüfen, ob eine Krone langfristig sinnvoller ist.");
        r.recommended = "fk";
      } else {
        r.options.push({ id: "fk", type: "kasse", name: "Kassenfüllung (selbstadhäsiv)", total: P.fk_gross, benefits: ["schnelle Lösung", "bei großen Flächen begrenzt haltbar"] });
        r.options.push({ id: "komp", type: "mehrkosten", name: "Mehrschicht-Komposit, adhäsiv", total: P.komp_gross, base: P.fk_gross, benefits: ["zahnfarben, gute Randdichte", "Kasse zahlt Kassenfüllung anteilig"] });
        r.options.push({ id: "inlay", type: "mehrkosten", name: "Keramik-Inlay", total: P.inlay, base: P.fk_gross, benefits: ["sehr langlebig", "stabilisiert den geschwächten Zahn", "Kasse zahlt Kassenfüllung anteilig"] });
        r.recommended = k === "molar" ? "inlay" : "komp";
        if (g.bruxismus) warn("Knirschen erhöht die Bruchgefahr. Zusätzlich eine Aufbissschiene einplanen.");
      }
      break;

    case "wurzel":
      r.options.push({ id: "wk", type: "kasse", name: "Wurzelbehandlung, Kassenleistung", total: P.wk_kasse, benefits: ["erhält den Zahn", "Standardinstrumente"] });
      r.options.push({ id: "wkplus", type: "privatzusatz", name: "Wurzelbehandlung mit Endo-Zusatz", total: P.wk_kasse + P.wk_plus, base: P.wk_kasse, benefits: ["maschinelle Aufbereitung und Mikroskop", "höhere Erfolgsquote bei gekrümmten Kanälen", "Kasse zahlt Grundleistung"] });
      r.recommended = k === "molar" ? "wkplus" : "wk";
      if (k === "molar") info("Seitenzähne brauchen nach einer Wurzelbehandlung meist eine Krone, damit sie nicht brechen.");
      else info("Bei Front- und Prämolaren mit geradem Kanal reicht die Kassenleistung meist aus.");
      break;

    case "zerstoert": {
      // Kassenpatienten: Die Regelversorgung wird nach BEMA und BEL II abgerechnet, nicht nach dem Preis der Praxis.
      // Geschätzt wird sie mit den Durchschnittskosten der Festzuschuss-Richtlinie (100-%-Betrag des Befunds).
      const kb = kronenBefunde(n);
      const sichtbar = VERBLENDBEREICH.has(n);
      const gkv = input.patient.insurance === "GKV";
      r.options.push({ id: "kr", type: "regel", name: "Krone, Regelversorgung", total: gkv ? regelKosten(kb) : P.krone_regel, regel: P.krone_regel, befunde: kb, benefits: [sichtbar ? "Metall mit Keramikverblendung auf der sichtbaren Seite" : "Metall, im Seitenzahnbereich unverblendet", "bewährt und haltbar"] });
      r.options.push({ id: "krvk", type: "gleichartig", name: "Vollkeramik-Krone", total: P.krone_vk, regel: P.krone_regel, befunde: kb, benefits: ["metallfrei, natürliche Optik", "sehr gut verträglich", "gleicher Festzuschuss"] });
      if (!sichtbar) {
        r.recommended = "kr";
        info("Im Seitenzahnbereich ist die Kassenkrone funktional gleichwertig. Vollkeramik ist hier vor allem eine Frage der Optik.");
      } else {
        r.recommended = "krvk";
      }
      if (anker) {
        // Nachbar einer Lücke: Bei einer Brücke ist die Krone des Pfeilerzahns in der Brücke enthalten.
        r.options.push({ id: "anker", type: "regel", typeLabel: "In der Brücke enthalten", name: `Entfällt bei einer Brücke (${anker.where})`, total: 0, benefits: ["als Brückenpfeiler in der Brücke enthalten", "keine eigene Krone nötig"] });
        if (anker.bruecke) r.recommended = "anker";
        info(`Wird dieser Zahn Pfeiler einer Brücke (${anker.where}), ist seine Krone dort enthalten. Eine eigene Krone braucht er nur, wenn die Lücke anders versorgt wird.`);
      }
      if (g.bruxismus) warn("Bei Knirschen monolithisches Zirkon wählen, keine verblendete Keramik.");
      break;
    }

    case "fehlt":
      // Lücken werden je Kiefer gemeinsam geplant (lueckenItem). Hier kommt nur der Weisheitszahn an.
      r.excluded.push("Ersatz eines fehlenden Weisheitszahns ist nicht nötig.");
      break;

    case "fissur": {
      const age = input.patient.age;
      const kid = age != null && age < 18;
      if (kid && (pos(n) === 6 || pos(n) === 7) && input.patient.insurance === "GKV") {
        r.options.push({ id: "fv", type: "kasse", name: "Fissurenversiegelung", total: P.fv_kasse, benefits: ["schützt tiefe Fissuren vor Karies", "Kassenleistung bis 17 Jahre"] });
        r.recommended = "fv";
      } else if (kid || input.patient.insurance === "PKV") {
        r.options.push({ id: "fv", type: "privat", name: "Fissurenversiegelung", total: P.fv_privat, benefits: ["schützt tiefe Fissuren vor Karies"] });
        r.recommended = "fv";
      } else {
        r.excluded.push("Fissurenversiegelung bei Erwachsenen: nur bei erhöhtem Kariesrisiko sinnvoll. Im Befund nicht angegeben.");
      }
      break;
    }
  }
  return r;
}

function globalItem(code: GlobalCode, input: ProposalInput, P: Prices): ProposalItem | null {
  const g = input.globals;
  const r = emptyItem(`g${code}`, "Allgemein", GLOBAL_FINDINGS[code]);
  switch (code) {
    case "zahnstein":
      r.options.push({ id: "zst", type: "kasse", name: "Zahnsteinentfernung", total: P.zst, benefits: ["einmal im Kalenderjahr Kassenleistung", "entfernt harte Beläge"] });
      if (g.psi) {
        r.recommended = "zst";
        r.excluded.push("PZR vor der PAR-Behandlung: die Kasse übernimmt die Vorbehandlung. PZR erst danach als Nachsorge anbieten.");
      } else {
        r.options.push({ id: "pzr", type: "privat", name: "Professionelle Zahnreinigung", total: P.pzr, benefits: ["auch weiche Beläge und Verfärbungen", "Zahnzwischenräume, Politur, Fluorid", "viele Zusatzversicherungen erstatten"] });
        r.recommended = "pzr";
      }
      return r;
    case "psi":
      r.options.push({ id: "par", type: "kasse", name: "Parodontitis-Behandlung mit Nachsorge", total: P.par, benefits: ["Kassenleistung inklusive Nachsorge (UPT)", "stoppt Knochenabbau"] });
      r.excluded.push("Laser-Zusatzbehandlung: kein belegter Zusatznutzen gegenüber der Kassen-PAR, daher kein Vorschlag.");
      r.recommended = "par";
      return r;
    case "bruxismus":
      r.options.push({ id: "schiene", type: "kasse", name: "Aufbissschiene", total: P.schiene, benefits: ["schützt Zähne und Versorgungen", "bei Indikation Kassenleistung"] });
      r.recommended = "schiene";
      return r;
    case "bleaching": {
      r.options.push({ id: "bl", type: "privat", name: "Bleaching", total: P.bleaching, ohneErstattung: true, benefits: ["auf ausdrücklichen Wunsch (§ 2 Abs. 3 GOZ)", "Ergebnis hält 1–3 Jahre"] });
      r.recommended = "bl";
      const hasKaries = Object.values(input.teeth).some(
        (f) => f === "karies_klein" || f === "karies_gross" || f === "fuellung_defekt"
      );
      if (hasKaries) r.notes.push({ kind: "warn", text: "Erst kariöse Zähne versorgen, dann aufhellen. Füllungen hellen nicht mit auf und werden danach farblich angepasst." });
      return r;
    }
    case "raucher":
      // Nur Patientenfaktor für andere Regeln, kein eigener Befund mit Optionen.
      return null;
  }
}

const SCHNEIDEZAEHNE = new Set([12, 11, 21, 22, 42, 41, 31, 32]);

/** Zusammengehörige Lücken eines Kiefers mit den Befunden der Festzuschuss-Richtlinie. */
export interface LueckenGruppe {
  kiefer: "OK" | "UK";
  /** 2 = zahnbegrenzte Lücken (Brücke), 3 = Freiend oder mehr als vier fehlende Zähne (Teilprothese), 4 = Restbestand bis drei Zähne oder zahnlos. */
  klasse: 2 | 3 | 4;
  zaehne: number[];
  /** Pfeilerzähne neben den Lücken (nur Klasse 2). */
  anker: number[];
  befunde: string[];
}

/**
 * Plant die Lücken eines Kiefers. Weisheitszähne zählen weder als fehlend noch als Pfeiler.
 * Klasse 2 (Befunde 2.1 bis 2.5, dazu 2.7 je sichtbarem ersetztem Zahn und Pfeiler): höchstens vier fehlende
 * Zähne im Kiefer, keine Lücke am Ende der Zahnreihe, je Lücke höchstens drei Zähne bzw. vier Schneidezähne.
 * Sonst einmal 3.1 je Kiefer; bei höchstens drei verbliebenen Zähnen 4.1/4.3, zahnlos 4.2/4.4.
 */
export function planKiefer(arch: readonly number[], teeth: ProposalInput["teeth"]): LueckenGruppe[] {
  const oben = Math.floor(arch[0] / 10) <= 2;
  const kiefer = oben ? "OK" : "UK";
  const row = arch.filter((n) => pos(n) !== 8);
  const fehlt = (n: number | undefined) => n != null && teeth[String(n)] === "fehlt";
  const luecken: { zaehne: number[]; anker: number[]; freiend: boolean }[] = [];
  for (let i = 0; i < row.length; i++) {
    if (!fehlt(row[i])) continue;
    let j = i;
    while (fehlt(row[j + 1])) j++;
    luecken.push({
      zaehne: row.slice(i, j + 1),
      freiend: i === 0 || j === row.length - 1,
      anker: [row[i - 1], row[j + 1]].filter((x): x is number => x != null),
    });
    i = j;
  }
  const alle = luecken.flatMap((l) => l.zaehne);
  if (!alle.length) return [];
  if (alle.length === row.length) return [{ kiefer, klasse: 4, zaehne: alle, anker: [], befunde: [oben ? "4.2" : "4.4"] }];
  if (row.length - alle.length <= 3) return [{ kiefer, klasse: 4, zaehne: alle, anker: [], befunde: [oben ? "4.1" : "4.3"] }];
  const bruecke =
    alle.length <= 4 &&
    luecken.every((l) => !l.freiend && (l.zaehne.length <= 3 || (l.zaehne.length === 4 && l.zaehne.every((z) => SCHNEIDEZAEHNE.has(z)))));
  if (!bruecke) return [{ kiefer, klasse: 3, zaehne: alle, anker: [], befunde: ["3.1"] }];

  // Lücken mit gemeinsamem Pfeiler gehören zu einer Brücke: die größte bekommt 2.1 bis 2.4, eine angrenzende Einzellücke 2.5.
  const gruppen: (typeof luecken)[] = [];
  for (const l of luecken) {
    const prev = gruppen[gruppen.length - 1];
    if (prev && prev[prev.length - 1].anker.includes(l.anker[0])) prev.push(l);
    else gruppen.push([l]);
  }
  return gruppen.map((gr) => {
    const haupt = gr.reduce((a, b) => (b.zaehne.length > a.zaehne.length ? b : a));
    const befunde = gr.map((l) => (l !== haupt && l.zaehne.length === 1 ? "2.5" : `2.${l.zaehne.length}`));
    const zaehne = gr.flatMap((l) => l.zaehne);
    const anker = [...new Set(gr.flatMap((l) => l.anker))];
    befunde.push(...[...zaehne, ...anker].filter((z) => VERBLENDBEREICH.has(z)).map(() => "2.7"));
    return { kiefer, klasse: 2 as const, zaehne, anker, befunde };
  });
}

const lueckenWo = (g: LueckenGruppe) =>
  g.zaehne.length === 1 ? `Zahn ${g.zaehne[0]}` : g.klasse === 2 ? `Zähne ${g.zaehne.join(", ")}` : g.kiefer === "OK" ? "Oberkiefer" : "Unterkiefer";

/** Schlüssel des Eintrags: Einzelzahnlücken behalten „t36“, damit gespeicherte Vorschläge ihre Wahl behalten. */
const lueckenKey = (g: LueckenGruppe) => (g.zaehne.length === 1 ? `t${g.zaehne[0]}` : g.klasse === 2 ? `l${g.zaehne.join("-")}` : `k${g.kiefer}`);

function lueckenItem(g: LueckenGruppe, input: ProposalInput, P: Prices): ProposalItem {
  const gl = input.globals;
  const gkv = input.patient.insurance === "GKV";
  const n = g.zaehne.length;
  const zahnlos = g.befunde[0] === "4.2" || g.befunde[0] === "4.4";
  const r = emptyItem(lueckenKey(g), lueckenWo(g), n === 1 ? FINDINGS.fehlt : zahnlos ? "Zahnloser Kiefer" : `${n} Zähne fehlen`);
  const info = (text: string) => r.notes.push({ kind: "info", text });
  const warn = (text: string) => r.notes.push({ kind: "warn", text });
  const implantate = n === 1 ? "Implantat mit Krone" : `${n} Implantate mit Kronen`;

  if (g.klasse === 2) {
    const glieder = n + g.anker.length;
    const faktor = glieder / 3;
    const brName = glieder === 3 ? "Brücke, Regelversorgung" : `Brücke (${glieder} Glieder), Regelversorgung`;
    r.options.push({ id: "br", type: "regel", name: brName, total: gkv ? regelKosten(g.befunde) : Math.round(P.bruecke_regel * faktor), regel: P.bruecke_regel, befunde: g.befunde, benefits: ["festsitzend", "Nachbarzähne werden beschliffen"] });
    r.options.push({ id: "brvk", type: "gleichartig", name: glieder === 3 ? "Vollkeramik-Brücke" : `Vollkeramik-Brücke (${glieder} Glieder)`, total: Math.round(P.bruecke_vk * faktor), regel: P.bruecke_regel, befunde: g.befunde, benefits: ["zahnfarben, metallfrei", "gleicher Festzuschuss"] });
    r.options.push({ id: "impl", type: "andersartig", name: implantate, total: P.implantat * n, regel: P.bruecke_regel, befunde: g.befunde, benefits: ["Nachbarzähne bleiben unberührt", "Kieferknochen bleibt belastet", "gleicher Festzuschuss"] });
    const nf = g.anker.map((x) => input.teeth[String(x)]);
    const nbZ = n === 1 ? neighbors(g.zaehne[0]) : g.anker;
    const nb = { join: () => (nbZ.length <= 2 ? nbZ.join(" und ") : `${nbZ.slice(0, -1).join(", ")} und ${nbZ[nbZ.length - 1]}`) };
    if (nf.some(needsWork)) {
      r.recommended = "br";
      info(`Die Nachbarzähne ${nb.join()} brauchen ohnehin eine Versorgung. Eine Brücke löst beides zugleich.`);
    } else if (n === 1 && nf.every((x) => x === undefined || x === "fissur")) {
      r.recommended = "impl";
      info(`Die Nachbarzähne ${nb.join()} sind gesund. Ein Implantat erspart das Beschleifen.`);
    } else {
      r.recommended = "br";
      if (n > 1) info("Bei mehreren fehlenden Zähnen ist die Brücke die Regelversorgung. Implantate sind möglich, aber deutlich aufwendiger.");
    }
  } else if (g.klasse === 3) {
    r.options.push({ id: "tp", type: "regel", name: "Teilprothese (Modellguss)", total: gkv ? regelKosten(g.befunde) : P.teilprothese, regel: P.teilprothese, befunde: g.befunde, benefits: ["herausnehmbar", n === 1 ? "ersetzt den fehlenden Zahn" : "ersetzt alle fehlenden Zähne des Kiefers"] });
    if (n <= 3) r.options.push({ id: "impl", type: "andersartig", name: implantate, total: P.implantat * n, regel: P.teilprothese, befunde: g.befunde, benefits: ["festsitzend", "Kieferknochen bleibt belastet", "Festzuschuss wie Regelversorgung"] });
    else r.excluded.push("Implantate: bei so vielen fehlenden Zähnen wird individuell geplant, deshalb hier keine Schätzung.");
    r.excluded.push(n > 4 ? "Brücke: mehr als vier fehlende Zähne im Kiefer." : "Brücke: am Ende der Zahnreihe fehlt der hintere Pfeilerzahn.");
    r.recommended = "tp";
    if (n === 1) info("Fehlt nur der letzte Backenzahn, ist ein Ersatz oft nicht nötig (verkürzte Zahnreihe). Bitte im Gespräch klären.");
  } else {
    r.options.push({ id: "tot", type: "regel", name: zahnlos ? "Totalprothese" : "Deckprothese über den verbliebenen Zähnen", total: gkv ? regelKosten(g.befunde) : P.totalprothese, regel: P.totalprothese, befunde: g.befunde, benefits: ["herausnehmbar", "ersetzt alle Zähne des Kiefers"] });
    r.excluded.push("Implantatgetragener Zahnersatz: wird individuell geplant, deshalb hier keine Schätzung.");
    r.recommended = "tot";
  }
  if (gl.raucher && r.options.some((o) => o.id === "impl")) {
    warn("Rauchen erhöht das Risiko eines Implantatverlusts deutlich. Vorher Rauchstopp besprechen.");
    if (r.recommended === "impl") r.recommended = g.klasse === 2 ? "br" : "tp";
  }
  if (gl.psi) warn("Vor Implantat oder Brücke zuerst die Parodontitis behandeln.");
  return r;
}

export function buildProposal(input: ProposalInput, prices: Prices): ProposalItem[] {
  if (!isDental(input.fach)) return buildMedicalProposal(input);
  // Lücken zuerst je Kiefer planen: ein Eintrag je Lücke bzw. Kiefer statt je fehlendem Zahn.
  const gruppen = [...planKiefer(UPPER_TEETH, input.teeth), ...planKiefer(LOWER_TEETH, input.teeth)];
  const lueckeBei = new Map<number, ProposalItem>();
  const ankerVon = new Map<number, { where: string; bruecke: boolean }>();
  for (const g of gruppen) {
    const item = lueckenItem(g, input, prices);
    lueckeBei.set(ALL_TEETH.find((n) => g.zaehne.includes(n))!, item);
    for (const a of g.anker) ankerVon.set(a, { where: item.where, bruecke: item.recommended === "br" });
  }
  const items: ProposalItem[] = [];
  for (const n of ALL_TEETH) {
    const luecke = lueckeBei.get(n);
    if (luecke) items.push(luecke);
    const f = input.teeth[String(n)];
    if (!f || !(f in FINDINGS)) continue;
    if (f === "fehlt" && pos(n) !== 8) continue;
    items.push(toothItem(n, f, input, prices, ankerVon.get(n)));
  }
  for (const code of Object.keys(GLOBAL_FINDINGS) as GlobalCode[]) {
    if (!input.globals[code]) continue;
    const item = globalItem(code, input, prices);
    if (item) items.push(item);
  }
  // Privatpatienten: keine Begriffe der gesetzlichen Kasse (Festzuschuss, Kassenfüllung) in den Vorteilen und Hinweisen.
  if (input.patient.insurance === "PKV") {
    const kassenwort = /Kasse|Festzuschuss|Regelversorgung/;
    for (const it of items) {
      for (const o of it.options) {
        o.benefits = o.benefits.filter((b) => !kassenwort.test(b));
        o.name = o.name.replace(", Regelversorgung", ", Standardausführung");
      }
      it.notes = it.notes.map((n) => ({ ...n, text: n.text.replace("die Kassenkrone", "die Krone in Standardausführung").replace("ist die Brücke die Regelversorgung", "ist die Brücke die übliche Versorgung") }));
      it.excluded = it.excluded.filter((e) => !/Kassen(leistung|-PAR)/.test(e));
    }
  }
  return items;
}

export interface Money {
  total: number;
  kasse: number;
  eigen: number;
  erstattet: number;
  netto: number;
}

// Festzuschuss-Sätze nach § 55 SGB V in Prozent der Regelversorgung. Das
// GKV-Beitragssatzstabilisierungsgesetz (2026) senkt sie für alle ab dem
// 1.1.2027 bewilligten Heil- und Kostenpläne um zehn Prozentpunkte; bis
// 31.12.2026 bewilligte Pläne behalten die alten Sätze. Härtefälle erhalten
// weiterhin die volle Regelversorgung (bei anderer Versorgung den doppelten Festzuschuss).
export const FESTZUSCHUSS_SAETZE = {
  2026: { 0: 0.6, 5: 0.7, 10: 0.75 },
  2027: { 0: 0.5, 5: 0.6, 10: 0.65 },
} as const;
export type ZuschussJahr = keyof typeof FESTZUSCHUSS_SAETZE;

/** Kalendertag in deutscher Zeit als "JJJJ-MM-TT": Stichtage gelten nach deutschem Datum, egal wo der Server steht. */
export const berlinTag = (d: Date = new Date()): string => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const STICHTAG_TAG = "2026-12-31";

export function defaultZuschussJahr(today = new Date()): ZuschussJahr {
  return berlinTag(today) > STICHTAG_TAG ? 2027 : 2026;
}

/** Ob der Vergleich 2026/2027 noch eine Entscheidung beeinflussen kann. */
export function showsJahresvergleich(today = new Date()): boolean {
  return berlinTag(today) <= STICHTAG_TAG;
}

/** Verbleibende Kalendertage bis einschließlich Stichtag (0 am Stichtag selbst, negativ danach). */
export function tageBisStichtag(today = new Date()): number {
  const [y, m, d] = berlinTag(today).split("-").map(Number);
  return Math.round((Date.UTC(2026, 11, 31) - Date.UTC(y, m - 1, d)) / 86400000);
}

/**
 * Festzuschüsse bei 100 % (Härtefall) je Befund, gültig ab 1.1.2026, bundeseinheitlich.
 * Quelle: GKV-Spitzenverband „Festzuschussbeträge ab 01.01.2026“ (G-BA-Beschluss vom 05.12.2025,
 * BAnz AT 04.02.2026 B3), gegengeprüft mit der KZBV-Abrechnungshilfe 2026. Die Euro-Beträge für 2027
 * sind noch nicht veröffentlicht (Stand 12.11.2026); bis dahin rechnet Sorrida 2027 mit diesen
 * Beträgen und den neuen Sätzen und kennzeichnet das Ergebnis als „voraussichtlich“.
 */
export const FESTZUSCHUSS_BEFUNDE: Record<string, { name: string; euro: number }> = {
  "1.1": { name: "Krone (stark zerstörter Zahn)", euro: 398.39 },
  "1.2": { name: "Teilkrone (große Substanzdefekte)", euro: 457.27 },
  "1.3": { name: "Verblendung einer Krone im sichtbaren Bereich", euro: 134.44 },
  "1.4": { name: "Konfektionierter Stiftaufbau", euro: 83.52 },
  "1.5": { name: "Gegossener Stiftaufbau", euro: 251.57 },
  "2.1": { name: "Lücke mit einem fehlenden Zahn", euro: 921.6 },
  "2.2": { name: "Lücke mit zwei fehlenden Zähnen", euro: 1051.84 },
  "2.3": { name: "Lücke mit drei fehlenden Zähnen", euro: 1174.89 },
  "2.4": { name: "Frontzahnlücke mit vier fehlenden Zähnen", euro: 1287.9 },
  "2.5": { name: "Angrenzende weitere Lücke mit einem fehlenden Zahn", euro: 511.35 },
  "2.6": { name: "Disparallele Pfeilerzähne (Zuschlag)", euro: 378.71 },
  "2.7": { name: "Verblendung eines ersetzten Zahns im sichtbaren Bereich", euro: 132.44 },
  "3.1": { name: "Teilprothese (Lückensituation II, je Kiefer)", euro: 952.15 },
  "3.2": { name: "Kombinationsversorgung, je Eckzahn oder erstem Prämolar", euro: 667.91 },
  "4.1": { name: "Restzahnbestand bis 3 Zähne, Oberkiefer", euro: 994.8 },
  "4.2": { name: "Zahnloser Oberkiefer", euro: 960.74 },
  "4.3": { name: "Restzahnbestand bis 3 Zähne, Unterkiefer", euro: 1027.99 },
  "4.4": { name: "Zahnloser Unterkiefer", euro: 1029.54 },
};

/** Verblendbereich der Festzuschuss-Richtlinie: Zähne 15 bis 25 und 34 bis 44. */
export const VERBLENDBEREICH = new Set([15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 34, 33, 32, 31, 41, 42, 43, 44]);

/** Befunde einer Einzelkrone: 1.1, im sichtbaren Bereich zusätzlich die Verblendung 1.3. */
export const kronenBefunde = (n: number): string[] => (VERBLENDBEREICH.has(n) ? ["1.1", "1.3"] : ["1.1"]);

/** Befunde einer Einzelzahnlücke: 2.1, je Zahn im sichtbaren Bereich (Lücke und Anker) eine Verblendung 2.7. */
export const brueckenBefunde = (n: number, anker: number[]): string[] => [
  "2.1",
  ...[n, ...anker].filter((z) => VERBLENDBEREICH.has(z)).map(() => "2.7"),
];

const cent = (x: number) => Math.round(x * 100) / 100;

/**
 * Durchschnittskosten der Regelversorgung für die Befunde (100-%-Beträge der Festzuschuss-Richtlinie).
 * Die Regelversorgung rechnet die Praxis nach BEMA und BEL II ab, nicht nach eigener Preisliste; die tatsächlichen
 * Kosten weichen je nach Punktwert der KZV und Labor leicht ab. Verbindlich ist der Heil- und Kostenplan.
 */
export const regelKosten = (befunde: string[]): number => cent(befunde.reduce((sum, b) => sum + (FESTZUSCHUSS_BEFUNDE[b]?.euro ?? 0), 0));

/** Festzuschuss in Euro für die Befunde einer Option; null, wenn keine Befunde hinterlegt sind. */
export function festzuschussEuro(o: Pick<ProposalOption, "befunde">, p: PatientFactors, jahr?: ZuschussJahr): number | null {
  if (!o.befunde?.length) return null;
  const q = festzuschussQuote(p, jahr);
  return cent(o.befunde.reduce((sum, b) => sum + cent((FESTZUSCHUSS_BEFUNDE[b]?.euro ?? 0) * q), 0));
}

/** Festzuschuss-Quote: je nach Bewilligungsjahr und Bonusheft, Härtefall 100 %. */
export function festzuschussQuote(p: PatientFactors, jahr: ZuschussJahr = p.zuschussJahr ?? defaultZuschussJahr()): number {
  if (p.haertefall) return 1;
  return FESTZUSCHUSS_SAETZE[jahr][p.bonusYears];
}

/** Option rechnet mit Festzuschuss, hängt also vom Bewilligungsjahr ab. */
export const isZahnersatz = (o: ProposalOption) =>
  o.type === "regel" || o.type === "gleichartig" || o.type === "andersartig";

export function money(o: ProposalOption, p: PatientFactors, jahr?: ZuschussJahr): Money {
  const total = o.total;
  const satz = Number.isFinite(p.erstattungProzent) ? p.erstattungProzent : 0;
  const pct = o.ohneErstattung ? 0 : Math.min(100, Math.max(0, satz)) / 100;
  if (p.insurance === "PKV") {
    const kasse = total * pct;
    return { total, kasse, eigen: total - kasse, erstattet: 0, netto: total - kasse };
  }
  let kasse = 0;
  if (o.type === "kasse") kasse = o.zuzahlung && (p.age == null || p.age >= 18) ? Math.max(0, total - zuzahlungBetrag(o.zuzahlung, total)) : total;
  else if (o.type === "mehrkosten" || o.type === "privatzusatz") {
    kasse = Math.min(o.base ?? 0, total);
    // Hilfsmittel mit Aufzahlung: Die gesetzliche Zuzahlung fällt zusätzlich an (vom Kassenanteil).
    if (o.zuzahlung && (p.age == null || p.age >= 18)) kasse = Math.max(0, kasse - zuzahlungBetrag(o.zuzahlung, kasse));
  }
  else if (o.type === "privat" || o.type === "igel") kasse = 0;
  // Härtefall (§ 55 Abs. 2 SGB V): Die Kasse trägt die tatsächlichen Kosten der Regelversorgung, sonst den doppelten Festzuschuss.
  else if (p.haertefall && o.type === "regel") kasse = total;
  else kasse = Math.min(festzuschussEuro(o, p, jahr) ?? (o.regel ?? 0) * festzuschussQuote(p, jahr), total);
  const eigen = total - kasse;
  const erstattet = eigen * pct;
  return { total, kasse, eigen, erstattet, netto: eigen - erstattet };
}

/**
 * Pauschale je Verordnung bei Heilmitteln: 10 €, für ab 1.1.2027 ausgestellte Verordnungen 15 €
 * (GKV-Beitragssatzstabilisierungsgesetz; Quelle: TK „Gesundheitsreform 2026/2027“, Stand 11.11.2026).
 */
export const heilmittelPauschale = (today = new Date()) => (berlinTag(today) >= "2027-01-01" ? 15 : 10);
/** Text zur Heilmittel-Zuzahlung, passend zum Datum. */
export const heilmittelZuzahlungText = (today = new Date()) => `10 % der Kosten plus ${heilmittelPauschale(today)} € je Verordnung`;
/** Gesetzliche Zuzahlung bei Heilmitteln: 10 % der Kosten plus Pauschale je Verordnung (§ 32 Abs. 2, § 61 SGB V). */
export const heilmittelZuzahlung = (total: number, today = new Date()) => total * 0.1 + heilmittelPauschale(today);

/** Hilfs- und Arzneimittel: 10 %, mindestens 5 €, höchstens 10 €, nie mehr als die Kosten (§ 61 SGB V). */
export const hilfsmittelZuzahlung = (total: number) => Math.min(total, Math.min(10, Math.max(5, total * 0.1)));

export function zuzahlungBetrag(art: ProposalOption["zuzahlung"], total: number): number {
  if (!art) return 0;
  return art === "hilfsmittel" ? hilfsmittelZuzahlung(total) : heilmittelZuzahlung(total);
}

/** Bezeichnung der Leistungsart einer Option (eigene Bezeichnung hat Vorrang). */
export function typeLabelOf(o: Pick<ProposalOption, "type" | "typeLabel">, insurance: "GKV" | "PKV"): string {
  return o.typeLabel ?? optionTypeLabel(o.type, insurance);
}

/** Wert in der Auswahl, wenn eine freiwillige Leistung ausdrücklich nicht gewünscht ist. */
export const ABGEWAEHLT = "-";

/** Freiwillig ist ein Punkt, der nur aus einer einzigen Selbstzahlerleistung besteht: Der Patient kann ihn weglassen. */
export const istFreiwillig = (item: ProposalItem) =>
  item.options.length === 1 && item.options[0].type !== "kasse" && item.options[0].type !== "regel";

export function chosenOption(item: ProposalItem, choices: Record<string, string>): ProposalOption | null {
  if (!item.options.length) return null;
  const c = choices[item.key];
  if (c === ABGEWAEHLT) return null;
  return (
    item.options.find((o) => o.id === c) ??
    item.options.find((o) => o.id === item.recommended) ??
    item.options[0]
  );
}

export interface ProposalSummary {
  baseTotal: number;
  planTotal: number;
  eigen: number;
  netto: number;
}

export interface JahresVergleich {
  /** Eigenanteil (nach Zusatzversicherung) der gewählten Optionen bei Bewilligung bis 31.12.2026. */
  netto2026: number;
  /** … bei Bewilligung ab 1.1.2027. */
  netto2027: number;
  mehrkosten: number;
  /** Ob überhaupt eine gewählte Option vom Festzuschuss abhängt. */
  betroffen: boolean;
}

/** Eigenanteil der gewählten Optionen nach den Sätzen 2026 und 2027 (nur GKV relevant). */
export function vergleicheJahre(items: ProposalItem[], choices: Record<string, string>, p: PatientFactors): JahresVergleich {
  let netto2026 = 0, netto2027 = 0, betroffen = false;
  for (const item of items) {
    const o = chosenOption(item, choices);
    if (!o) continue;
    if (p.insurance === "GKV" && isZahnersatz(o) && !p.haertefall) betroffen = true;
    netto2026 += money(o, p, 2026).netto;
    netto2027 += money(o, p, 2027).netto;
  }
  return { netto2026, netto2027, mehrkosten: netto2027 - netto2026, betroffen };
}

/**
 * Aufteilung aus Sicht des Patienten: was Kasse bzw. Versicherung (samt Zusatzversicherung) voraussichtlich trägt
 * und was er selbst zahlt. Diese eine Rechnung gilt für Vorschlag, Einverständnis und Portal.
 */
export function patientAnteile(items: ProposalItem[], choices: Record<string, string>, p: PatientFactors): { kasse: number; eigen: number } {
  let kasse = 0, eigen = 0;
  for (const item of items) {
    const o = chosenOption(item, choices);
    if (!o) continue;
    const m = money(o, p);
    kasse += m.kasse + m.erstattet;
    eigen += m.netto;
  }
  return { kasse, eigen };
}

/** Basis = jeweils erste Option (Kasse/Regel), Plan = gewählte Optionen. */
export function summarize(items: ProposalItem[], choices: Record<string, string>, p: PatientFactors): ProposalSummary {
  let baseTotal = 0, planTotal = 0, eigen = 0, netto = 0;
  for (const item of items) {
    const o = chosenOption(item, choices);
    if (!o) continue;
    if (item.options.some((x) => x.type === "igel")) {
      // Arztpraxen: Die IGeL kommt zur Kassenleistung hinzu; Mehrumsatz ist nur der Selbstzahleranteil.
      planTotal += o.type === "igel" ? o.total : o.type === "mehrkosten" ? o.total - (o.base ?? 0) : 0;
    } else {
      // Zahnmedizin: Basis = Kassen-/Regelleistung, Plan = gewählte Option.
      baseTotal += item.options[0].total;
      planTotal += o.total;
    }
    const m = money(o, p);
    eigen += m.eigen;
    netto += m.netto;
  }
  return { baseTotal, planTotal, eigen, netto };
}

const TYPE_LABELS: Record<OptionType, string> = {
  kasse: "Kassenleistung",
  mehrkosten: "Mehrkostenvereinbarung",
  privat: "Privatleistung",
  privatzusatz: "Kasse + Privatzusatz",
  regel: "Regelversorgung",
  gleichartig: "Gleichartig",
  andersartig: "Andersartig",
  igel: "Selbstzahlerleistung (IGeL)",
};

export function optionTypeLabel(t: OptionType, insurance: "GKV" | "PKV"): string {
  if (insurance === "PKV") {
    if (t === "kasse") return "Basisleistung";
    if (t === "regel") return "Basisversorgung";
    if (t === "privatzusatz") return "Basis + Zusatz";
    if (t === "mehrkosten" || t === "privat" || t === "gleichartig" || t === "andersartig") return "Wahlleistung";
    if (t === "igel") return "Privatleistung";
  }
  return TYPE_LABELS[t];
}

export const formatEuro = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

export function buildLetter(args: {
  items: ProposalItem[];
  choices: Record<string, string>;
  patient: PatientFactors;
  patientName: string;
  practiceName: string;
  date: Date;
  /** Fachgebiet; außerhalb der Zahnmedizin gelten die Regeln für Selbstzahlerleistungen (IGeL). */
  fach?: string;
}): string {
  const { items, choices, patient, patientName, practiceName, date } = args;
  const dental = isDental(args.fach);
  const therapie = isTherapie(specialty(args.fach));
  const jv = vergleicheJahre(items, choices, patient);
  // Den Vergleich nur zeigen, solange eine Bewilligung zu den alten Sätzen noch möglich ist.
  const vergleich = showsJahresvergleich(date) && jv.betroffen && (patient.zuschussJahr ?? defaultZuschussJahr(date)) === 2026;
  const L: string[] = [];
  L.push(`${practiceName} – Ihr persönlicher Behandlungsvorschlag`);
  L.push(`Datum: ${date.toLocaleDateString("de-DE")}`);
  L.push("");
  L.push(`Guten Tag ${patientName},`);
  L.push("");
  L.push(
    `vielen Dank für Ihren Besuch. Hier finden Sie unsere Befunde und die Behandlungsmöglichkeiten, die wir mit Ihnen besprochen haben. ${dental ? "Bei jedem Punkt steht zuerst die Leistung, die Ihre" : "Wo es eine Kassenleistung gibt, steht zuerst die Leistung, die Ihre"} ${patient.insurance === "GKV" ? "Krankenkasse" : "Versicherung"} übernimmt${dental ? " oder bezuschusst" : ""}.`
  );
  let i = 0;
  for (const item of items) {
    const chosen = chosenOption(item, choices);
    if (!chosen) continue;
    i++;
    L.push("");
    L.push(`${i}. ${item.where}: ${item.title}`);
    item.options.forEach((o, j) => {
      const m = money(o, patient);
      const later =
        vergleich && isZahnersatz(o) && patient.insurance === "GKV" && !patient.haertefall
          ? ` (bei Bewilligung ab 1.1.2027: ca. ${formatEuro(money(o, patient, 2027).netto)})`
          : "";
      L.push(
        `   ${String.fromCharCode(97 + j)}) ${o.name} (${typeLabelOf(o, patient.insurance)}): Ihr Eigenanteil ca. ${formatEuro(m.netto)}${later}${o.id === item.recommended ? "  ← unsere Empfehlung" : ""}`
      );
    });
    for (const o of item.options) {
      if (o.hinweis) L.push(`      ${o.name}: ${o.hinweis}`);
      if (o.nutzen) L.push(`      Zum Nutzen: ${o.nutzen}`);
    }
    const why = item.notes.filter((n) => n.kind === "info").map((n) => n.text);
    if (why.length) L.push(`   Warum: ${why.join(" ")}`);
    // Nur was wirklich ausgewählt wurde, heißt „besprochene Wahl“; sonst steht die Empfehlung der Praxis da.
    if (item.options.length > 1) L.push(choices[item.key] && item.options.some((o) => o.id === choices[item.key]) ? `   Besprochene Wahl: ${chosen.name}` : `   Noch nicht entschieden. Unsere Empfehlung: ${chosen.name}`);
  }
  if (!i) {
    L.push("");
    L.push("Aktuell besteht kein Behandlungsbedarf.");
  }
  const s = summarize(items, choices, patient);
  L.push("");
  const alleGewaehlt = items.every((it) => it.options.length <= 1 || it.options.some((o) => o.id === choices[it.key]));
  const wahlWort = alleGewaehlt ? "bei der besprochenen Wahl" : "bei besprochener Wahl bzw. unserer Empfehlung";
  L.push(`Summe Ihres Eigenanteils ${wahlWort}: ca. ${formatEuro(s.netto)}`);
  if (!alleGewaehlt) {
    const nurKasse = items.reduce((sum, it) => sum + (it.options.length ? money(it.options[0], patient).netto : 0), 0);
    if (Math.abs(nurKasse - s.netto) > 0.5) L.push(`Wenn Sie überall die zuerst genannte Leistung wählen: ca. ${formatEuro(nurKasse)}`);
  }
  if (vergleich && jv.mehrkosten > 0.5) {
    L.push("");
    L.push(
      `Bitte beachten: Zum 1. Januar 2027 sinkt der Festzuschuss der gesetzlichen Krankenkassen für Zahnersatz per Gesetz um zehn Prozentpunkte. Maßgeblich ist das Datum, an dem Ihre Krankenkasse den Heil- und Kostenplan bewilligt, nicht der Behandlungstermin. Wird Ihr Plan bis zum 31.12.2026 bewilligt, gilt der oben genannte Eigenanteil. Bei einer Bewilligung ab dem 1.1.2027 steigt er ${wahlWort} voraussichtlich auf ca. ${formatEuro(jv.netto2027)} (ca. ${formatEuro(jv.mehrkosten)} mehr). Die Beträge für 2027 sind vorläufig, weil die neuen Festzuschüsse erst zum Jahresende veröffentlicht werden.`
    );
  }
  L.push("");
  if (therapie) {
    const arten = new Set(items.flatMap((i) => i.options.map((o) => o.zuzahlung)).filter(Boolean));
    if (arten.size) {
      L.push(
        `Für Leistungen auf Verordnung gilt bei Volljährigen die gesetzliche Zuzahlung: ${arten.has("hilfsmittel") ? "10 % des Preises, mindestens 5 €, höchstens 10 €" : heilmittelZuzahlungText()}. Kinder und Jugendliche sind befreit, ebenso Versicherte mit Befreiungsbescheid.`
      );
      L.push("");
    }
    L.push(
      "Selbstzahlerleistungen sind freiwillig und werden privat nach unserer Preisliste berechnet. Nehmen Sie sich Zeit für Ihre Entscheidung; vor der Behandlung vereinbaren wir sie schriftlich mit Ihnen. Alle Beträge sind Schätzungen."
    );
    L.push("");
    L.push("Bei Fragen rufen Sie uns gern an.");
    L.push(`Ihr Team der ${practiceName}`);
    return L.join("\n");
  }
  if (!dental) {
    L.push(
      "Wichtig: Selbstzahlerleistungen (IGeL) sind freiwillig und nicht Teil der Kassenleistung. Nehmen Sie sich Zeit für Ihre Entscheidung. Vor der Leistung schließen wir mit Ihnen eine schriftliche Vereinbarung mit den voraussichtlichen Kosten nach der Gebührenordnung für Ärzte (GOÄ). Alle Beträge sind Schätzungen. Diese Information erhalten Sie nach § 630c Abs. 3 BGB in Textform."
    );
    L.push("");
    L.push("Bei Fragen rufen Sie uns gern an.");
    L.push(`Ihr Team der ${practiceName}`);
    return L.join("\n");
  }
  const kasseUeberall = patient.insurance === "GKV" && items.every((it) => !it.options.length || it.options.some((o) => o.type === "kasse" || o.type === "regel"));
  L.push(
    (kasseUeberall ? "Wichtig: Die Kassenleistung ist bei jedem Punkt möglich. " : "Wichtig: ") + "Alle Beträge sind Schätzungen. Verbindlich sind der Heil- und Kostenplan bzw. die schriftliche Mehrkostenvereinbarung, die wir vor Behandlungsbeginn mit Ihnen abschließen. Diese Information erhalten Sie nach § 630c Abs. 3 BGB in Textform."
  );
  L.push("");
  L.push("Bei Fragen rufen Sie uns gern an.");
  L.push(`Ihr Team der ${practiceName}`);
  return L.join("\n");
}

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  ENTWURF: "Entwurf",
  BESPROCHEN: "Besprochen",
  ANGENOMMEN: "Angenommen",
  ABGELEHNT: "Abgelehnt",
};
export const PROPOSAL_STATUSES = ["ENTWURF", "BESPROCHEN", "ANGENOMMEN", "ABGELEHNT"] as const;

export function ageFromBirthDate(birthDate: Date | string | null | undefined, today = new Date()): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}
