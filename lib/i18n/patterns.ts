// Muster für Regeltexte mit Zahlen oder eingebetteten Texten. Die Muster
// passen auf die deutschen Texte aus lib/proposals.ts und
// lib/medicalProposals.ts; jede Sprache liefert zu jedem Muster die Übersetzung.

export const PATTERNS = {
  /** „Zahn 36“ */
  tooth: /^Zahn (\d\d)$/,
  /** „Zähne 35, 36“ */
  teeth: /^Zähne (\d\d(?:, \d\d)*)$/,
  /** „3 Zähne fehlen“ */
  nMissing: /^(\d+) Zähne fehlen$/,
  bridgeUnitsStandard: /^Brücke \((\d+) Glieder\), Regelversorgung$/,
  bridgeUnitsCeramic: /^Vollkeramik-Brücke \((\d+) Glieder\)$/,
  bridgeUnitsPrivate: /^Brücke \((\d+) Glieder\), Standardausführung$/,
  nImplants: /^(\d+) Implantate mit Kronen$/,
  /** Eingebettet: Ort der Brücke („Zahn 36“, „Zähne 35, 36“). */
  notNeededWithBridge: /^Entfällt bei einer Brücke \((.+)\)$/,
  abutmentNote:
    /^Wird dieser Zahn Pfeiler einer Brücke \((.+)\), ist seine Krone dort enthalten\. Eine eigene Krone braucht er nur, wenn die Lücke anders versorgt wird\.$/,
  neighboursNeedCare: /^Die Nachbarzähne (\d\d(?:, \d\d)*) und (\d\d) brauchen ohnehin eine Versorgung\. Eine Brücke löst beides zugleich\.$/,
  neighboursHealthy: /^Die Nachbarzähne (\d\d(?:, \d\d)*) und (\d\d) sind gesund\. Ein Implantat erspart das Beschleifen\.$/,
  /** Arztpraxen: Altersgrenze der Kassenleistung, danach ggf. der Hinweis des Angebots. */
  coveredOnlyFromAge: /^Kassenleistung erst ab (\d+) Jahren\.(?: (.+))?$/,
  coveredFromAge: /^Kassenleistung ab (\d+) Jahren\.(?: (.+))?$/,
} as const;

export type PatternId = keyof typeof PATTERNS;
export const PATTERN_IDS = Object.keys(PATTERNS) as PatternId[];
