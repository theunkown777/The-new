// Texte der Analyse, die auch im Browser gebraucht werden (components/AnalyseExplorer.tsx). Ohne weitere Abhängigkeiten,
// damit die Seite nicht den ganzen Regelwerk-Code lädt.

/** Ab so vielen entschiedenen Fällen je Gruppe zeigt die Analyse eine Quote. */
export const MIN_GROUP = 5;

/**
 * Satz unter einer aufgeklappten Leistung: nur die Zahl mit ihrer Grundlage. Keine Wertung und kein Rat zu Preis oder
 * Erklärung: Eine Ablehnung ist die Entscheidung des Patienten.
 */
export function annahmeSatz(g: { angenommen: number; entschieden: number; quote: number | null }): string {
  if (g.quote == null) return `Noch zu wenige Entscheidungen für eine Annahmequote. Sorrida zeigt sie ab ${MIN_GROUP} entschiedenen Vorschlägen.`;
  return `${g.angenommen} von ${g.entschieden} entschiedenen Vorschlägen angenommen. Die Zahl sagt nichts über die Gründe.`;
}
