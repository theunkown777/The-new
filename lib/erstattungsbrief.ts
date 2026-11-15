import { z } from "zod";

// Begleitbrief für die private Krankenversicherung oder Beihilfestelle, wenn
// sie eine Rechnung nur gekürzt erstattet hat. Der Brief geht im Namen des
// PATIENTEN an seine Versicherung; die Praxis liefert dazu je Posten die
// nähere Erläuterung des Steigerungssatzes.
//
// - Feste Textbausteine, keine KI. Die Praxis wählt je Posten aus und kann ergänzen.
// - Keine Diagnosen im Brief, außer die Praxis tippt sie selbst in die Ergänzung.
// - Kein Versand durch Sorrida: nur ein PDF zum Mitgeben oder Herunterladen.
// - Keine Rechtsberatung (siehe HINWEIS_ENTWURF im Dialog).
//
// Rechnungen in Sorrida (prisma Invoice) enthalten nur Titel und Betrag, keine
// einzelnen Posten, Ziffern oder Steigerungssätze. Die beanstandeten Posten
// trägt die Praxis deshalb im Dialog selbst ein (aus der Rechnung ihrer
// Praxissoftware); Ziffer und Steigerungssatz sind freie Angaben.
//
// Wortlaut der Verordnungen (nur daraus wird zitiert):
// § 5 Abs. 2 Satz 1 GOÄ und § 5 Abs. 2 Satz 1 GOZ, gleichlautend:
//   „Innerhalb des Gebührenrahmens sind die Gebühren unter Berücksichtigung der
//    Schwierigkeit und des Zeitaufwandes der einzelnen Leistung sowie der Umstände
//    bei der Ausführung nach billigem Ermessen zu bestimmen.“
// § 5 Abs. 2 Satz 2 GOÄ: „Die Schwierigkeit der einzelnen Leistung kann auch durch die
//    Schwierigkeit des Krankheitsfalles begründet sein; dies gilt nicht für die in Absatz 3
//    genannten Leistungen.“ (GOZ: derselbe Satz ohne den zweiten Halbsatz.)
// § 12 Abs. 3 Satz 2 GOÄ und § 10 Abs. 3 Satz 2 GOZ: „Auf Verlangen ist die Begründung näher zu erläutern.“
// Quellen: GOÄ nach gesetze-im-internet.de (go__1982/__5.html, __12.html, abgerufen 13.11.2026);
// GOZ nach der Textausgabe der Bundeszahnärztekammer (GOZ 2012, abgerufen 15.11.2026).

export const HINWEIS_ENTWURF = "Entwurf – bitte prüfen. Sorrida leistet keine Rechtsberatung; der Brief ersetzt keine anwaltliche Vertretung.";

export const GEBUEHRENORDNUNGEN = {
  GOAE: { kurz: "GOÄ", name: "Gebührenordnung für Ärzte", bemessung: "§ 5 Abs. 2 GOÄ", erlaeuterung: "§ 12 Abs. 3 GOÄ" },
  GOZ: { kurz: "GOZ", name: "Gebührenordnung für Zahnärzte", bemessung: "§ 5 Abs. 2 GOZ", erlaeuterung: "§ 10 Abs. 3 GOZ" },
} as const;
export type Gebuehrenordnung = keyof typeof GEBUEHRENORDNUNGEN;

/** § 5 Abs. 2 Satz 1, in GOÄ und GOZ gleichlautend (wörtlich). */
export const ZITAT_BEMESSUNG =
  "Innerhalb des Gebührenrahmens sind die Gebühren unter Berücksichtigung der Schwierigkeit und des Zeitaufwandes der einzelnen Leistung sowie der Umstände bei der Ausführung nach billigem Ermessen zu bestimmen.";

/**
 * Feste Textbausteine für die Begründung des Steigerungssatzes. Jeder Baustein
 * gehört zu einem Bemessungskriterium aus § 5 Abs. 2 GOÄ bzw. GOZ:
 * Schwierigkeit, Zeitaufwand, Umstände bei der Ausführung (Satz 1) und
 * Schwierigkeit des Krankheitsfalles (Satz 2).
 */
export const BAUSTEINE = [
  {
    key: "zeitaufwand",
    label: "Überdurchschnittlicher Zeitaufwand",
    kriterium: "Zeitaufwand der einzelnen Leistung",
    satz: "Der Zeitaufwand für diese Leistung lag deutlich über dem Durchschnitt.",
  },
  {
    key: "schwierigkeit",
    label: "Besondere Schwierigkeit der Leistung",
    kriterium: "Schwierigkeit der einzelnen Leistung",
    satz: "Die Leistung war in diesem Fall besonders schwierig auszuführen.",
  },
  {
    key: "umstaende",
    label: "Besondere Umstände bei der Ausführung",
    kriterium: "Umstände bei der Ausführung",
    satz: "Bei der Ausführung lagen besondere Umstände vor, die den Aufwand erhöht haben.",
  },
  {
    key: "krankheitsfall",
    label: "Schwierigkeit des Krankheitsfalles",
    kriterium: "Schwierigkeit des Krankheitsfalles",
    satz: "Die Schwierigkeit der Leistung ergab sich aus der Schwierigkeit des Krankheitsfalles.",
  },
] as const;
export type BausteinKey = (typeof BAUSTEINE)[number]["key"];
const BAUSTEIN_KEYS = BAUSTEINE.map((b) => b.key) as [BausteinKey, ...BausteinKey[]];

/** Hinweis im Dialog: Der Baustein „Krankheitsfall“ gilt in der GOÄ nicht für jede Leistung (§ 5 Abs. 2 Satz 2 GOÄ). */
export const HINWEIS_KRANKHEITSFALL_GOAE = "Gilt nach § 5 Abs. 2 Satz 2 GOÄ nicht für Leistungen der Abschnitte A, E und O des Gebührenverzeichnisses.";

export const MAX_POSTEN = 20;

// ------------------------------------------------------------ Eingabe ----

const zeile = (max: number) => z.string().trim().max(max).optional().default("");

/** Steigerungssatz lesen: „3,5“, „3.5“, „3,5fach“, „2,3-fach“. Null, wenn leer oder nicht lesbar. */
export function faktorLesen(roh: string | number | null | undefined): number | null {
  if (roh == null) return null;
  if (typeof roh === "number") return Number.isFinite(roh) && roh >= 1 && roh <= 10 ? Math.round(roh * 100) / 100 : null;
  const m = /^\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*-?\s*(fach(e[nrs]?)?)?\s*$/i.exec(roh);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return n >= 1 && n <= 10 ? n : null;
}

/** „3,5fach“ – Schreibweise wie in der Verordnung („2,3fache“). */
export const faktorText = (f: number) => `${f.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}fach`;

export const postenSchema = z
  .object({
    /** Ziffer aus der Rechnung, freie Angabe (z. B. „2197“ oder „GOÄ 5“) */
    nummer: zeile(20),
    bezeichnung: z.string().trim().min(2, "Bitte bei jedem Posten eine Bezeichnung eintragen.").max(160),
    /** Steigerungssatz, freie Angabe; leer = wird im Brief nicht genannt */
    faktor: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((v, ctx) => {
        if (v == null || (typeof v === "string" && v.trim() === "")) return null;
        const f = faktorLesen(v);
        if (f == null) {
          ctx.addIssue({ code: "custom", message: "Der Steigerungssatz ist nicht lesbar (Beispiel: 3,5)." });
          return z.NEVER;
        }
        return f;
      }),
    gruende: z.array(z.enum(BAUSTEIN_KEYS)).max(BAUSTEINE.length).default([]),
    /** Ergänzung der Praxis in eigenen Worten */
    ergaenzung: zeile(600),
  })
  .refine((p) => p.gruende.length > 0 || p.ergaenzung.length > 0, { message: "Bitte bei jedem Posten mindestens einen Grund wählen oder eine Begründung eintragen." });

export const briefSchema = z.object({
  gebuehrenordnung: z.enum(["GOAE", "GOZ"]),
  /** Name der Versicherung oder Beihilfestelle */
  versicherung: z.string().trim().min(2, "Bitte den Namen der Versicherung eintragen.").max(120),
  /** Anschrift der Versicherung, mehrzeilig */
  versicherungAnschrift: zeile(300),
  versicherungsnummer: zeile(60),
  /** Bezug: Schreiben der Versicherung, Leistungs- oder Vorgangsnummer */
  bezug: zeile(120),
  /** Anschrift des Patienten, mehrzeilig (Sorrida speichert keine Adressen) */
  absenderAnschrift: zeile(300),
  ort: zeile(60),
  posten: z.array(postenSchema).min(1, "Bitte mindestens einen Posten eintragen.").max(MAX_POSTEN),
});
export type BriefEingabe = z.infer<typeof briefSchema>;
export type BriefPosten = z.infer<typeof postenSchema>;

// --------------------------------------------------------------- Text ----

// Die PDF-Schicht (pdfkit, Standardschrift) kennt nur westeuropäische Zeichen.
const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Text für das PDF: einzeilig, nur druckbare Zeichen; Unbekanntes wird zu „?“. */
export function druckbar(s: string, mehrzeilig = false): string {
  const t = s
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2000-\u200a\u202f]/g, " ")
    .replace(/[\u200b-\u200f\u2028\u2029\ufeff]/g, "")
    .replace(/[\u2010\u2011]/g, "-")
    .replace(/\t/g, " ");
  let out = "";
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n") out += mehrzeilig ? "\n" : " ";
    else if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) continue;
    else if (c <= 0xff || CP1252_EXTRA.includes(ch)) out += ch;
    else out += "?";
  }
  return (mehrzeilig ? out.split("\n").map((z) => z.replace(/ +/g, " ").trim()).join("\n").replace(/\n{2,}/g, "\n") : out.replace(/ +/g, " ")).trim();
}

const zeilen = (s: string) => druckbar(s, true).split("\n").filter(Boolean).slice(0, 6);
const mitPunkt = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** Überschrift eines Postens: „Nr. 2197 – Adhäsive Befestigung (3,5fach)“. */
export function postenTitel(p: Pick<BriefPosten, "nummer" | "bezeichnung" | "faktor">): string {
  const nr = druckbar(p.nummer);
  const teil = [nr ? `Nr. ${nr.replace(/^(nr\.?|ziffer|ziff\.?)\s*/i, "")}` : "", druckbar(p.bezeichnung)].filter(Boolean).join(" – ");
  return p.faktor != null ? `${teil} (Steigerungssatz ${faktorText(p.faktor)})` : teil;
}

/** Begründung eines Postens: gewählte Bausteine in fester Reihenfolge, danach die Ergänzung der Praxis. */
export function postenBegruendung(p: Pick<BriefPosten, "gruende" | "ergaenzung">): string {
  const saetze: string[] = BAUSTEINE.filter((b) => p.gruende.includes(b.key)).map((b) => b.satz);
  const erg = druckbar(p.ergaenzung);
  if (erg) saetze.push(mitPunkt(erg));
  return saetze.join(" ");
}

export interface BriefKontext {
  patientName: string;
  practiceName: string;
  rechnungNummer: string;
  /** Rechnungsdatum, schon als TT.MM.JJJJ */
  rechnungDatum: string;
  /** Datum des Briefs, schon als TT.MM.JJJJ */
  heute: string;
}

export interface Brief {
  absender: string[];
  empfaenger: string[];
  ortDatum: string;
  betreff: string;
  bezugszeilen: string[];
  anrede: string;
  einleitung: string[];
  posten: { titel: string; text: string }[];
  schluss: string[];
  gruss: string;
  unterschrift: string;
  fusszeile: string;
}

/**
 * Brieftext aus geprüfter Eingabe (briefSchema) und Rechnungsdaten. Sachlich, im Namen
 * des Patienten. Enthält keine Diagnosen und keine Beträge – nur Rechnungsnummer,
 * Rechnungsdatum, die genannten Posten und deren Begründung.
 */
export function briefText(e: BriefEingabe, k: BriefKontext): Brief {
  const go = GEBUEHRENORDNUNGEN[e.gebuehrenordnung];
  const name = druckbar(k.patientName);
  const praxis = druckbar(k.practiceName);
  const einzahl = e.posten.length === 1;
  const bezug = druckbar(e.bezug);
  const nr = druckbar(e.versicherungsnummer);
  return {
    absender: [name, ...zeilen(e.absenderAnschrift)],
    empfaenger: [druckbar(e.versicherung), ...zeilen(e.versicherungAnschrift)],
    ortDatum: [druckbar(e.ort), k.heute].filter(Boolean).join(", "),
    betreff: `Rechnung Nr. ${druckbar(k.rechnungNummer)} vom ${k.rechnungDatum} – Bitte um erneute Prüfung der Erstattung`,
    bezugszeilen: [nr ? `Versicherungsnummer: ${nr}` : "", bezug ? `Ihr Zeichen / Ihr Schreiben: ${bezug}` : "", `Rechnung von: ${praxis}`].filter(Boolean),
    anrede: "Sehr geehrte Damen und Herren,",
    einleitung: [
      `die oben genannte Rechnung haben Sie nicht in voller Höhe erstattet. Ich bitte Sie, die Erstattung ${einzahl ? "des folgenden Postens" : "der folgenden Posten"} erneut zu prüfen.`,
      `Nach ${go.bemessung} sind die Gebühren „unter Berücksichtigung der Schwierigkeit und des Zeitaufwandes der einzelnen Leistung sowie der Umstände bei der Ausführung nach billigem Ermessen zu bestimmen“. ` +
        `Meine Praxis hat mir die Begründung des Steigerungssatzes ${einzahl ? "zu diesem Posten" : "zu jedem dieser Posten"} näher erläutert (${go.erlaeuterung}):`,
    ],
    posten: e.posten.map((p, i) => ({ titel: `${i + 1}. ${postenTitel(p)}`, text: postenBegruendung(p) })),
    schluss: [
      "Bitte teilen Sie mir das Ergebnis Ihrer Prüfung schriftlich mit. Wenn Sie bei Ihrer Entscheidung bleiben, bitte ich um eine Begründung zu jedem einzelnen Posten.",
      "Für Rückfragen zur Behandlung wenden Sie sich bitte mit meinem Einverständnis an die Praxis.",
    ],
    gruss: "Mit freundlichen Grüßen",
    unterschrift: name,
    fusszeile: `Die Erläuterungen zu den einzelnen Posten stammen von ${praxis}.`,
  };
}

/** Der ganze Brief als reiner Text (für Tests und zum Prüfen ohne PDF). */
export function briefAlsText(b: Brief): string {
  return [
    b.absender.join("\n"),
    b.empfaenger.join("\n"),
    b.ortDatum,
    b.betreff,
    b.bezugszeilen.join("\n"),
    b.anrede,
    ...b.einleitung,
    ...b.posten.map((p) => `${p.titel}\n${p.text}`),
    ...b.schluss,
    b.gruss,
    b.unterschrift,
    b.fusszeile,
  ].join("\n\n");
}

/** Dateiname des PDFs, ohne Patientennamen. */
export const briefDateiname = (rechnungNummer: string) => `Begleitbrief-Rechnung-${rechnungNummer.replace(/[^A-Za-z0-9-]+/g, "_").slice(0, 40) || "Rechnung"}.pdf`;

/** Für wen der Brief angeboten wird: Rechnungen an privat Versicherte. */
export const briefMoeglich = (insuranceType: string | null | undefined) => insuranceType === "PKV";
