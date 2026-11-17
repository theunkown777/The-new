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

// ── Übersetzungen eigener Leistungen ─────────────────────────────────────────────────────────────────
// Die Praxis kann Name und Hinweis einer eigenen Leistung in den Sprachen der Patientenansicht
// hinterlegen: selbst eingetragen oder als Entwurf der KI (nur mit eingeschalteten KI-Hilfen).
// Patienten sehen eine Übersetzung erst, wenn jemand aus der Praxis sie als geprüft bestätigt hat UND
// der deutsche Text seitdem nicht geändert wurde. Sonst bleibt der deutsche Text stehen.

export const LEISTUNG_SPRACHEN = ["en", "tr", "uk", "ru", "pl", "ar"] as const;
export type LeistungSprache = (typeof LEISTUNG_SPRACHEN)[number];
export const LEISTUNG_SPRACHE_NAME: Record<LeistungSprache, string> = { en: "Englisch", tr: "Türkisch", uk: "Ukrainisch", ru: "Russisch", pl: "Polnisch", ar: "Arabisch" };
export const istLeistungSprache = (x: unknown): x is LeistungSprache => typeof x === "string" && (LEISTUNG_SPRACHEN as readonly string[]).includes(x);

const eineUebersetzung = z.object({
  name: z.string().trim().max(160),
  /** Übersetzung des Hinweises zur Leistung (bei eigenen Leistungen: „Hinweis der Praxis“). */
  kurz: z.string().trim().max(400).optional(),
  /** Entwurf der KI. Bleibt als Herkunft stehen, auch nach der Prüfung. */
  maschinell: z.boolean().optional(),
  /** Von der Praxis geprüft und bestätigt. Nur dann sehen Patienten die Übersetzung. */
  geprueft: z.boolean(),
});

export const leistungUebersetzungenSchema = z.object({
  /** Deutscher Text, zu dem die Übersetzungen gehören. */
  zu: z.object({ name: z.string().trim().max(160), kurz: z.string().trim().max(400).optional() }),
  sprachen: z.object({
    en: eineUebersetzung.optional(),
    tr: eineUebersetzung.optional(),
    uk: eineUebersetzung.optional(),
    ru: eineUebersetzung.optional(),
    pl: eineUebersetzung.optional(),
    ar: eineUebersetzung.optional(),
  }),
});

export type LeistungUebersetzung = z.infer<typeof eineUebersetzung>;
export type LeistungUebersetzungen = z.infer<typeof leistungUebersetzungenSchema>;

/** Was eine Leistung für die Übersetzung mitbringen muss (eigene Leistung der Praxis: name, nutzen, uebersetzungen). */
export interface UebersetzbareLeistung {
  name: string;
  nutzen?: string | null;
  uebersetzungen?: LeistungUebersetzungen | null;
}

const gleich = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").trim().replace(/\s+/g, " ") === (b ?? "").trim().replace(/\s+/g, " ");

/** Gehören die Übersetzungen noch zum deutschen Text der Leistung? */
export function uebersetzungAktuell(l: UebersetzbareLeistung): boolean {
  const u = l.uebersetzungen;
  return !!u && gleich(u.zu.name, l.name) && gleich(u.zu.kurz, l.nutzen);
}

/** Stand je Sprache für die Anzeige in den Einstellungen. */
export function uebersetzungStand(l: UebersetzbareLeistung, lang: LeistungSprache): "fehlt" | "veraltet" | "maschinell" | "ungeprueft" | "geprueft" {
  const s = l.uebersetzungen?.sprachen[lang];
  if (!s || !s.name.trim()) return "fehlt";
  if (!uebersetzungAktuell(l)) return "veraltet";
  if (s.geprueft) return "geprueft";
  return s.maschinell ? "maschinell" : "ungeprueft";
}

const gueltig = (l: UebersetzbareLeistung, lang: string): LeistungUebersetzung | null => {
  if (!istLeistungSprache(lang) || !uebersetzungAktuell(l)) return null;
  const s = l.uebersetzungen!.sprachen[lang];
  return s && s.geprueft && s.name.trim() ? s : null;
};

/**
 * Name der Leistung in der Sprache der Patientenansicht. Nur geprüfte, aktuelle Übersetzungen;
 * sonst (und für Deutsch) der deutsche Name. Ein ungeprüfter KI-Entwurf wird nie zurückgegeben.
 */
export function nameIn(l: UebersetzbareLeistung, lang: string): string {
  return gueltig(l, lang)?.name.trim() || l.name;
}

/** Hinweis zur Leistung in der Sprache; sonst der deutsche Hinweis (oder undefined, wenn es keinen gibt). */
export function kurzIn(l: UebersetzbareLeistung, lang: string): string | undefined {
  return gueltig(l, lang)?.kurz?.trim() || l.nutzen?.trim() || undefined;
}

/**
 * Wörterbuch „deutscher Text → geprüfte Übersetzung“ für die eigenen Leistungen eines Vorschlags.
 * Gedacht als Ergänzung zum Wörterbuch der Regeltexte in lib/patientI18n.ts.
 */
export function uebersetzungsWoerterbuch(leistungen: UebersetzbareLeistung[] | null | undefined, lang: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of leistungen ?? []) {
    const s = gueltig(l, lang);
    if (!s) continue;
    out[l.name] = s.name.trim();
    if (l.nutzen?.trim() && s.kurz?.trim()) out[l.nutzen] = s.kurz.trim();
  }
  return out;
}

/**
 * Entwurf der KI einsetzen: Geprüfte, aktuelle Übersetzungen bleiben unangetastet, alle anderen Sprachen
 * bekommen den Entwurf als „maschinell, ungeprüft“.
 */
export function mitKiEntwurf(l: UebersetzbareLeistung, entwurf: Partial<Record<LeistungSprache, { name: string; kurz?: string }>>): LeistungUebersetzungen {
  const aktuell = uebersetzungAktuell(l);
  const sprachen: LeistungUebersetzungen["sprachen"] = {};
  for (const lang of LEISTUNG_SPRACHEN) {
    const alt = aktuell ? l.uebersetzungen!.sprachen[lang] : undefined;
    const neu = entwurf[lang];
    if (alt?.geprueft && alt.name.trim()) sprachen[lang] = alt;
    else if (neu?.name.trim()) sprachen[lang] = { name: neu.name.trim().slice(0, 160), kurz: neu.kurz?.trim().slice(0, 400) || undefined, maschinell: true, geprueft: false };
    else if (alt) sprachen[lang] = alt;
  }
  return { zu: { name: l.name.trim(), kurz: l.nutzen?.trim() || undefined }, sprachen };
}

/** Vor dem Speichern: leere Sprachen entfernen; ohne Inhalt ganz weglassen. */
export function uebersetzungenBereinigt(u: LeistungUebersetzungen | null | undefined): LeistungUebersetzungen | undefined {
  if (!u) return undefined;
  const sprachen: LeistungUebersetzungen["sprachen"] = {};
  for (const lang of LEISTUNG_SPRACHEN) {
    const s = u.sprachen[lang];
    if (s?.name.trim()) sprachen[lang] = { name: s.name.trim(), kurz: s.kurz?.trim() || undefined, ...(s.maschinell ? { maschinell: true } : {}), geprueft: s.geprueft === true };
  }
  return Object.keys(sprachen).length ? { zu: { name: u.zu.name.trim(), kurz: u.zu.kurz?.trim() || undefined }, sprachen } : undefined;
}
