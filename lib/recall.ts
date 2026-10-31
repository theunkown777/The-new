// Vorsorge-Erinnerungen: Leistungen, die die Kasse regelmäßig bezahlt.
// Sorrida erinnert die Praxis, wer fällig ist, und liefert den Text für
// den Patienten. Kasse zuerst: hier geht es nicht um Selbstzahlerleistungen.

export interface RecallRule {
  leistung: string;
  /** Abstand in Monaten */
  monate: number;
  abAlter?: number;
  hinweis: string;
}

const MONTH = 30.44 * 24 * 60 * 60 * 1000;

export const RECALL_RULES: Record<string, RecallRule[]> = {
  zahn: [{ leistung: "Kontrolluntersuchung (Bonusheft)", monate: 6, hinweis: "Kassenleistung, zweimal im Jahr. Die jährliche Kontrolle sichert den höheren Festzuschuss." }],
  haut: [{ leistung: "Hautkrebs-Screening", monate: 24, abAlter: 35, hinweis: "Kassenleistung alle zwei Jahre ab 35." }],
  hausarzt: [{ leistung: "Gesundheits-Check-up", monate: 36, abAlter: 35, hinweis: "Kassenleistung alle drei Jahre ab 35." }],
  gyn: [{ leistung: "Krebsfrüherkennung", monate: 12, abAlter: 20, hinweis: "Kassenleistung einmal im Jahr ab 20." }],
  uro: [{ leistung: "Krebsfrüherkennung (Männer)", monate: 12, abAlter: 45, hinweis: "Kassenleistung für Männer einmal im Jahr ab 45." }],
};

export interface RecallDue {
  leistung: string;
  hinweis: string;
  faellig: Date;
  /** Tage überfällig (negativ = bald fällig) */
  tage: number;
}

/** Fällige Vorsorge eines Patienten oder null. "bald" = in den nächsten 14 Tagen. */
export function recallFor(a: { fach: string; age: number | null; letzterKontakt: Date; erinnertAm?: Date | null }, now = new Date()): RecallDue | null {
  const rules = RECALL_RULES[a.fach] ?? [];
  for (const r of rules) {
    if (r.abAlter != null && (a.age == null || a.age < r.abAlter)) continue;
    const faellig = new Date(a.letzterKontakt.getTime() + r.monate * MONTH);
    const tage = Math.floor((now.getTime() - faellig.getTime()) / (24 * 60 * 60 * 1000));
    if (tage < -14) continue;
    // Schon nach Fälligkeit erinnert? Dann erst nach 30 Tagen wieder zeigen.
    if (a.erinnertAm && a.erinnertAm >= faellig && now.getTime() - a.erinnertAm.getTime() < 30 * 24 * 60 * 60 * 1000) continue;
    return { leistung: r.leistung, hinweis: r.hinweis, faellig, tage };
  }
  return null;
}

export function recallText(a: { firstName: string; practiceName: string; leistung: string; hinweis: string; url: string }): string {
  return `Hallo ${a.firstName}, ${a.practiceName} erinnert Sie an Ihre ${a.leistung}. ${a.hinweis} Termin vereinbaren und Unterlagen ansehen: ${a.url}`;
}
