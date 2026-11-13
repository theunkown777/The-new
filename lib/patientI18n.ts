// Sprachen für die Patientenansicht (Patienten-Link und Vorschlag im Portal).
// Die Praxis arbeitet auf Deutsch; die Patientin oder der Patient kann den
// Vorschlag zusätzlich in einer anderen Sprache lesen. Maßgeblich bleiben die
// deutsche Fassung und das Gespräch in der Praxis, darauf weist jede
// Fremdsprache hin (ui.langNote).
//
// Jede Sprache ist ein in sich geschlossenes Objekt in lib/i18n/<kürzel>.ts:
// Oberfläche (ui), Wörterbuch der deutschen Regeltexte (content) und Muster
// für Texte mit Zahlen (patterns, die Muster selbst stehen in
// lib/i18n/patterns.ts). Diese Datei ist der Einstieg für alle Aufrufer.
//
// lib/patientI18n.test.ts prüft für jede Sprache, dass jeder Text, den das
// zahnärztliche Regelwerk (lib/proposals.ts) erzeugen kann, übersetzt ist.
// Die Angebote der übrigen Fächer (lib/specialties.ts, lib/fachangebote.ts)
// sind NICHT übersetzt: dort werden Oberfläche, Leistungsarten und
// fachübergreifende Hinweise übersetzt, Namen und Erläuterungen der Angebote
// bleiben deutsch und die Ansicht sagt das (ui.contentNote).

import { PATTERNS, PATTERN_IDS } from "@/lib/i18n/patterns";
import type { PatientLocale, Ui } from "@/lib/i18n/types";
import { de } from "@/lib/i18n/de";
import { en } from "@/lib/i18n/en";
import { tr as tuerkisch } from "@/lib/i18n/tr";
import { uk } from "@/lib/i18n/uk";
import { ru } from "@/lib/i18n/ru";
import { pl } from "@/lib/i18n/pl";
import { ar } from "@/lib/i18n/ar";

export type { PatientLocale, Ui } from "@/lib/i18n/types";

/** Reihenfolge der Sprachwahl. Deutsch zuerst, weil es die maßgebliche Fassung ist. */
export const PATIENT_LANGS = ["de", "en", "tr", "uk", "ru", "pl", "ar"] as const;
export type PatientLang = (typeof PATIENT_LANGS)[number];

export const LOCALES: Record<PatientLang, PatientLocale> = { de, en, tr: tuerkisch, uk, ru, pl, ar };

/** Oberfläche je Sprache. */
export const UI = Object.fromEntries(PATIENT_LANGS.map((l) => [l, LOCALES[l].ui])) as Record<PatientLang, Ui>;

/** Englisches Wörterbuch der Regeltexte (bleibt als eigener Export für bestehende Aufrufer). */
export const CONTENT_EN: Record<string, string> = en.content;

export const isPatientLang = (x: unknown): x is PatientLang => typeof x === "string" && (PATIENT_LANGS as readonly string[]).includes(x);

/** Name der Sprache in eigener Schreibweise, z. B. „Türkçe“. */
export const langName = (lang: PatientLang) => LOCALES[lang].name;
/** Schreibrichtung; Arabisch läuft von rechts nach links. */
export const langDir = (lang: PatientLang) => LOCALES[lang].dir;

/**
 * Sprache der Ansicht: zuerst `?lang=`, sonst die erste unterstützte Sprache
 * aus Accept-Language (nach q-Wert), sonst Deutsch.
 */
export function pickLang(param: string | undefined, acceptLanguage: string | null): PatientLang {
  const p = param?.trim().toLowerCase();
  if (isPatientLang(p)) return p;
  const wunsch = (acceptLanguage ?? "")
    .split(",")
    .map((teil, i) => {
      const [tag, ...params] = teil.trim().toLowerCase().split(";");
      const q = params.map((x) => x.trim().match(/^q=([0-9.]+)$/)?.[1]).find((x) => x !== undefined);
      const gewicht = q === undefined ? 1 : Number(q);
      return { lang: tag.split("-")[0], q: Number.isFinite(gewicht) ? gewicht : 0, i };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const w of wunsch) if (isPatientLang(w.lang)) return w.lang;
  return "de";
}

const eigen = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Stand einer Übersetzung: „ganz“ übersetzt, „teilweise“ (ein Muster mit einem
 * eingebetteten Text, den es nur auf Deutsch gibt) oder „deutsch“ (unverändert).
 */
export type UebersetzungsStand = "ganz" | "teilweise" | "deutsch";

/** Übersetzung eines Regeltexts samt Stand. Unbekannte Texte bleiben deutsch statt falsch übersetzt. */
export function uebersetzung(text: string, lang: PatientLang): { text: string; stand: UebersetzungsStand } {
  if (lang === "de") return { text, stand: "ganz" };
  const L = LOCALES[lang];
  if (eigen(L.content, text)) return { text: L.content[text], stand: "ganz" };
  for (const id of PATTERN_IDS) {
    const m = text.match(PATTERNS[id]);
    if (!m) continue;
    let ganz = true;
    const out = L.patterns[id](m, (teil) => {
      const u = uebersetzung(teil, lang);
      if (u.stand !== "ganz") ganz = false;
      // Deutscher Rest in einem Satz von rechts nach links: als eigene Insel, damit Satzzeichen an ihrem Platz bleiben.
      return u.stand === "deutsch" && L.dir === "rtl" ? `\u2066${u.text}\u2069` : u.text;
    });
    return { text: out, stand: ganz ? "ganz" : "teilweise" };
  }
  return { text, stand: "deutsch" };
}

/** Text aus dem Regelwerk übersetzen; unbekannte Texte bleiben deutsch statt falsch übersetzt. */
export function tr(text: string, lang: PatientLang): string {
  return uebersetzung(text, lang).text;
}

/** Ob es für den Regeltext in der Sprache eine vollständige Übersetzung gibt (ohne Angabe: Englisch). */
export function hasTranslation(text: string, lang: PatientLang = "en"): boolean {
  return uebersetzung(text, lang).stand === "ganz";
}

/** Betrag in Euro, gerundet, in der Schreibweise der Sprache (immer lateinische Ziffern). */
export const euro = (n: number, lang: PatientLang) => LOCALES[lang].euro(n);

/** Datum (z. B. „gültig bis“) in der Schreibweise der Sprache. */
export const datum = (d: Date | string, lang: PatientLang) => new Date(d).toLocaleDateString(LOCALES[lang].dateLocale);

/**
 * Empfehlung je Position für die Kontrolle im Patientenvorschlag: Hat die
 * Praxis im Editor eine Option gewählt, gilt diese, sonst die Empfehlung
 * aus dem Regelwerk.
 */
export function empfehlungJe(
  items: { key: string; recommended?: string | null; options: { id: string }[] }[],
  praxisWahl: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    items.map((i) => {
      const p = praxisWahl[i.key];
      const id = p && i.options.some((o) => o.id === p) ? p : i.options.some((o) => o.id === i.recommended) ? i.recommended! : (i.options[0]?.id ?? "");
      return [i.key, id];
    }),
  );
}
