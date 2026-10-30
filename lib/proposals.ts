// Behandlungsvorschläge ("Klarplan"): aus Zahnbefunden und allgemeinen
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

export const FINDINGS = {
  karies_klein: "Karies, 1–2 Flächen",
  karies_gross: "Karies, ab 3 Flächen",
  fuellung_defekt: "Alte Füllung defekt",
  wurzel: "Entzündeter Nerv",
  zerstoert: "Stark zerstört, Krone nötig",
  fehlt: "Zahn fehlt",
  fissur: "Tiefe Fissuren, kariesfrei",
} as const;
export type FindingCode = keyof typeof FINDINGS;

export const GLOBAL_FINDINGS = {
  zahnstein: "Zahnstein und Beläge",
  psi: "Parodontitis (PSI-Code 3 oder 4)",
  bruxismus: "Knirschen oder Pressen",
  raucher: "Raucher",
  bleaching: "Patient wünscht hellere Zähne",
} as const;
export type GlobalCode = keyof typeof GLOBAL_FINDINGS;

export const PRICE_DEFS = [
  { key: "fk_klein", label: "Kassenfüllung, 1–2 Flächen", default: 55 },
  { key: "fk_gross", label: "Kassenfüllung, ab 3 Flächen", default: 85 },
  { key: "komp_klein", label: "Mehrschicht-Komposit, 1–2 Flächen", default: 160 },
  { key: "komp_gross", label: "Mehrschicht-Komposit, ab 3 Flächen", default: 240 },
  { key: "inlay", label: "Keramik-Inlay", default: 890 },
  { key: "krone_regel", label: "Krone, Regelversorgung", default: 680 },
  { key: "krone_vk", label: "Vollkeramik-Krone", default: 1050 },
  { key: "bruecke_regel", label: "Brücke 3-gliedrig, Regelversorgung", default: 1750 },
  { key: "bruecke_vk", label: "Vollkeramik-Brücke 3-gliedrig", default: 2450 },
  { key: "teilprothese", label: "Teilprothese Modellguss, Regelversorgung", default: 1300 },
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
  | "andersartig";

export interface ProposalOption {
  id: string;
  type: OptionType;
  name: string;
  total: number;
  benefits: string[];
  /** Kassenäquivalent bei Mehrkosten/Privatzusatz (§ 28 Abs. 2 SGB V). */
  base?: number;
  /** Kosten der Regelversorgung als Basis des Festzuschusses (Zahnersatz). */
  regel?: number;
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
}

export interface ProposalInput {
  teeth: Partial<Record<string, FindingCode>>;
  globals: Partial<Record<GlobalCode, boolean>>;
  patient: PatientFactors;
}

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

export function isValidTooth(n: number): boolean {
  return ALL_TEETH.includes(n);
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

function toothItem(n: number, f: FindingCode, input: ProposalInput, P: Prices): ProposalItem {
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
        r.options.push({ id: "inlay", type: "privat", name: "Keramik-Inlay", total: P.inlay, benefits: ["sehr langlebig", "stabilisiert den geschwächten Zahn"] });
        r.recommended = k === "molar" ? "inlay" : "komp";
        if (g.bruxismus) warn("Knirschen erhöht die Bruchgefahr. Zusätzlich eine Aufbissschiene einplanen.");
      }
      break;

    case "wurzel":
      r.options.push({ id: "wk", type: "kasse", name: "Wurzelbehandlung, Kassenleistung", total: P.wk_kasse, benefits: ["erhält den Zahn", "Standardinstrumente"] });
      r.options.push({ id: "wkplus", type: "privatzusatz", name: "Wurzelbehandlung mit Endo-Zusatz", total: P.wk_kasse + P.wk_plus, base: P.wk_kasse, benefits: ["maschinelle Aufbereitung und Mikroskop", "höhere Erfolgsquote bei gekrümmten Kanälen", "Kasse zahlt Grundleistung"] });
      r.recommended = k === "molar" ? "wkplus" : "wk";
      if (k === "molar") info("Seitenzähne werden nach einer Wurzelbehandlung meist überkront. Das gleich im Gespräch ankündigen.");
      else info("Bei Front- und Prämolaren mit geradem Kanal reicht die Kassenleistung meist aus.");
      break;

    case "zerstoert":
      r.options.push({ id: "kr", type: "regel", name: "Krone, Regelversorgung", total: P.krone_regel, regel: P.krone_regel, benefits: [k === "molar" ? "Metall, im Seitenzahnbereich unverblendet" : "Metall mit Keramikverblendung", "bewährt und haltbar"] });
      r.options.push({ id: "krvk", type: "gleichartig", name: "Vollkeramik-Krone", total: P.krone_vk, regel: P.krone_regel, benefits: ["metallfrei, natürliche Optik", "sehr gut verträglich", "gleicher Festzuschuss"] });
      if (k === "molar") {
        r.recommended = "kr";
        info("Im Seitenzahnbereich ist die Kassenkrone funktional gleichwertig. Vollkeramik ist hier vor allem eine Frage der Optik.");
      } else {
        r.recommended = "krvk";
      }
      if (g.bruxismus) warn("Bei Knirschen monolithisches Zirkon wählen, keine verblendete Keramik.");
      break;

    case "fehlt": {
      if (pos(n) === 8) {
        r.excluded.push("Ersatz eines fehlenden Weisheitszahns ist nicht nötig.");
        break;
      }
      const nb = neighbors(n);
      const nf = nb.map((x) => input.teeth[String(x)]);
      const gapNext = nf.some((x) => x === "fehlt");
      const nbWork = nf.some(needsWork);
      const nbHealthy = nf.every((x) => x === undefined || x === "fissur");
      if (gapNext) {
        r.options.push({ id: "tp", type: "regel", name: "Teilprothese (Modellguss)", total: P.teilprothese, regel: P.teilprothese, benefits: ["herausnehmbar", "ersetzt mehrere Zähne"] });
        r.options.push({ id: "impl", type: "andersartig", name: "Implantat mit Krone", total: P.implantat, regel: P.teilprothese, benefits: ["festsitzend", "Kieferknochen bleibt belastet", "Festzuschuss wie Regelversorgung"] });
        r.excluded.push("Brücke: Nachbarlücke vorhanden, keine ausreichenden Pfeilerzähne.");
        r.recommended = "impl";
      } else {
        r.options.push({ id: "br", type: "regel", name: "Brücke, Regelversorgung", total: P.bruecke_regel, regel: P.bruecke_regel, benefits: ["festsitzend", "Nachbarzähne werden beschliffen"] });
        r.options.push({ id: "brvk", type: "gleichartig", name: "Vollkeramik-Brücke", total: P.bruecke_vk, regel: P.bruecke_regel, benefits: ["zahnfarben, metallfrei", "gleicher Festzuschuss"] });
        r.options.push({ id: "impl", type: "andersartig", name: "Implantat mit Krone", total: P.implantat, regel: P.bruecke_regel, benefits: ["Nachbarzähne bleiben unberührt", "Kieferknochen bleibt belastet", "gleicher Festzuschuss"] });
        if (nbWork) {
          r.recommended = "br";
          info(`Die Nachbarzähne ${nb.join(" und ")} brauchen ohnehin eine Versorgung. Eine Brücke löst beides zugleich.`);
        } else if (nbHealthy) {
          r.recommended = "impl";
          info(`Die Nachbarzähne ${nb.join(" und ")} sind gesund. Ein Implantat erspart das Beschleifen.`);
        } else {
          r.recommended = "br";
        }
      }
      if (g.raucher) {
        warn("Rauchen erhöht das Risiko eines Implantatverlusts deutlich. Vorher Rauchstopp besprechen.");
        if (r.recommended === "impl") r.recommended = gapNext ? "tp" : "br";
      }
      if (g.psi) warn("Vor Implantat oder Brücke zuerst die Parodontitis behandeln.");
      break;
    }

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
      r.options.push({ id: "bl", type: "privat", name: "Bleaching", total: P.bleaching, benefits: ["auf ausdrücklichen Wunsch (§ 2 Abs. 3 GOZ)", "Ergebnis hält 1–3 Jahre"] });
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

export function buildProposal(input: ProposalInput, prices: Prices): ProposalItem[] {
  const items: ProposalItem[] = [];
  for (const n of ALL_TEETH) {
    const f = input.teeth[String(n)];
    if (f && f in FINDINGS) items.push(toothItem(n, f, input, prices));
  }
  for (const code of Object.keys(GLOBAL_FINDINGS) as GlobalCode[]) {
    if (!input.globals[code]) continue;
    const item = globalItem(code, input, prices);
    if (item) items.push(item);
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

/** Festzuschuss-Quote nach § 55 SGB V: 60 %, mit Bonusheft 70/75 %, Härtefall 100 %. */
export function festzuschussQuote(p: PatientFactors): number {
  if (p.haertefall) return 1;
  return p.bonusYears === 10 ? 0.75 : p.bonusYears === 5 ? 0.7 : 0.6;
}

export function money(o: ProposalOption, p: PatientFactors): Money {
  const total = o.total;
  const pct = Math.min(100, Math.max(0, p.erstattungProzent)) / 100;
  if (p.insurance === "PKV") {
    const kasse = total * pct;
    return { total, kasse, eigen: total - kasse, erstattet: 0, netto: total - kasse };
  }
  let kasse = 0;
  if (o.type === "kasse") kasse = total;
  else if (o.type === "mehrkosten" || o.type === "privatzusatz") kasse = o.base ?? 0;
  else if (o.type === "privat") kasse = 0;
  else kasse = Math.min((o.regel ?? 0) * festzuschussQuote(p), total);
  const eigen = total - kasse;
  const erstattet = eigen * pct;
  return { total, kasse, eigen, erstattet, netto: eigen - erstattet };
}

export function chosenOption(item: ProposalItem, choices: Record<string, string>): ProposalOption | null {
  if (!item.options.length) return null;
  const c = choices[item.key];
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

/** Basis = jeweils erste Option (Kasse/Regel), Plan = gewählte Optionen. */
export function summarize(items: ProposalItem[], choices: Record<string, string>, p: PatientFactors): ProposalSummary {
  let baseTotal = 0, planTotal = 0, eigen = 0, netto = 0;
  for (const item of items) {
    const o = chosenOption(item, choices);
    if (!o) continue;
    baseTotal += item.options[0].total;
    planTotal += o.total;
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
};

export function optionTypeLabel(t: OptionType, insurance: "GKV" | "PKV"): string {
  if (insurance === "PKV") {
    if (t === "kasse") return "Basisleistung";
    if (t === "regel") return "Basisversorgung";
    if (t === "privatzusatz") return "Basis + Zusatz";
    if (t === "mehrkosten" || t === "privat") return "Wahlleistung";
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
}): string {
  const { items, choices, patient, patientName, practiceName, date } = args;
  const L: string[] = [];
  L.push(`${practiceName} – Ihr persönlicher Behandlungsvorschlag`);
  L.push(`Datum: ${date.toLocaleDateString("de-DE")}`);
  L.push("");
  L.push(`Guten Tag ${patientName},`);
  L.push("");
  L.push(
    `vielen Dank für Ihren Besuch. Hier finden Sie unsere Befunde und die Behandlungsmöglichkeiten, die wir mit Ihnen besprochen haben. Bei jedem Punkt steht zuerst die Leistung, die Ihre ${patient.insurance === "GKV" ? "Krankenkasse" : "Versicherung"} übernimmt oder bezuschusst.`
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
      L.push(
        `   ${String.fromCharCode(97 + j)}) ${o.name} (${optionTypeLabel(o.type, patient.insurance)}): Ihr Eigenanteil ca. ${formatEuro(m.netto)}${o.id === item.recommended ? "  ← unsere Empfehlung" : ""}`
      );
    });
    const why = item.notes.filter((n) => n.kind === "info").map((n) => n.text);
    if (why.length) L.push(`   Warum: ${why.join(" ")}`);
    L.push(`   Besprochene Wahl: ${chosen.name}`);
  }
  if (!i) {
    L.push("");
    L.push("Aktuell besteht kein Behandlungsbedarf.");
  }
  const s = summarize(items, choices, patient);
  L.push("");
  L.push(`Summe Ihres Eigenanteils bei der besprochenen Wahl: ca. ${formatEuro(s.netto)}`);
  L.push("");
  L.push(
    "Wichtig: Die Kassenleistung ist bei jedem Punkt möglich. Alle Beträge sind Schätzungen. Verbindlich sind der Heil- und Kostenplan bzw. die schriftliche Mehrkostenvereinbarung, die wir vor Behandlungsbeginn mit Ihnen abschließen. Diese Information erhalten Sie nach § 630c Abs. 3 BGB in Textform."
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
