import { z } from "zod";

// Eigene Leistung der Praxis schnell anlegen: nur Name, auf Wunsch ein Preis. Ziffer (E1, E2 …),
// Verzeichnis und Kategorie vergibt Sorrida selbst, damit niemand vier Pflichtfelder ausfüllen muss.

/** "49", "49,90", "1.250,00" oder "49.90" → Cent; leer → null; ungültig → undefined */
export function preisInCent(wert: string | number | null | undefined): number | null | undefined {
  if (wert == null || wert === "") return null;
  if (typeof wert === "number") return Number.isFinite(wert) && wert >= 0 ? Math.round(wert * 100) : undefined;
  let s = wert.replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return undefined;
  return Math.round(Number(s) * 100);
}

export const eigeneLeistungSchema = z.object({
  name: z.string().trim().min(2, "Bitte einen Namen mit mindestens zwei Zeichen eingeben.").max(120),
  preis: z.union([z.string().max(20), z.number()]).optional().nullable(),
  kategorie: z.string().trim().max(60).optional().nullable(),
}).transform((d, ctx) => {
  const cent = preisInCent(d.preis ?? null);
  if (cent === undefined || (cent != null && cent > 10_000_000)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Der Preis ist ungültig. Beispiel: 49,90" });
    return z.NEVER;
  }
  return { name: d.name.replace(/\s+/g, " "), preisCent: cent, kategorie: d.kategorie?.replace(/\s+/g, " ") || null };
});

/** Nächste freie eigene Ziffer: E1, E2, … (Lücken werden nicht wiederverwendet). */
export function naechsteEigeneZiffer(vorhandeneCodes: string[]): string {
  const max = vorhandeneCodes.reduce((m, c) => { const t = /^E(\d{1,6})$/.exec(c.trim()); return t ? Math.max(m, Number(t[1])) : m; }, 0);
  return `E${max + 1}`;
}

/** Verzeichnis für eigene Leistungen: in der Zahnmedizin „Sonstiges“, sonst „Selbstzahler“. */
export const eigenesSystem = (systemGruppe: string) => (systemGruppe === "zahn" ? "SONSTIGES" : "SELBST");
export const EIGENE_KATEGORIE = "Eigene Leistungen";
