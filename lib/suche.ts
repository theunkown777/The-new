// Suche über alles (Strg+K) und Tastenkürzel. Reine Logik ohne Datenbank und
// ohne Browser: welche Seiten zu einem Suchwort passen, in welcher Reihenfolge
// Treffer stehen und welche Taste wohin führt. Die Abfragen selbst macht
// app/api/suche/route.ts, die Oberfläche components/Suche.tsx.
//
// Gesucht wird nur in Namen, Geburtsdatum, Rechnungsnummern und in der festen
// Seitenliste. Befunde, Notizen und Berichte werden nicht durchsucht.

import type { MenueRechte } from "@/lib/rollen";

export const MIN_ZEICHEN = 2;
export const MAX_JE_GRUPPE = 8;
export const MAX_SUCHLAENGE = 60;

export type Gruppe = "patienten" | "vorschlaege" | "rechnungen" | "seiten" | "aktionen";
export const GRUPPEN_REIHENFOLGE: Gruppe[] = ["patienten", "aktionen", "vorschlaege", "rechnungen", "seiten"];

export interface Treffer {
  /** Eindeutig über alle Gruppen (für aria-activedescendant) */
  id: string;
  gruppe: Gruppe;
  titel: string;
  unter?: string;
  href: string;
  /** Nur bei Patienten: für „zuletzt geöffnet“ im Speicher des Tabs */
  patientId?: string;
}

// ------------------------------------------------------------ Text ----

/** Klein, ohne Akzente, Umlaute ausgeschrieben (ü → ue), ß → ss; damit „Mueller“ und „Müller“ dasselbe finden. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Wie gut passt ein Text zum Suchwort? 0 = gar nicht.
 * 100 gleich · 80 beginnt damit · 60 ein Wort beginnt damit · 40 enthält es ·
 * 30 alle Suchwörter kommen als Wortanfang vor.
 */
export function trefferRang(text: string, suche: string): number {
  const t = norm(text);
  const q = norm(suche);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const woerter = t.split(/[ \-/]+/);
  if (woerter.some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  const teile = q.split(" ").filter(Boolean);
  if (teile.length > 1 && teile.every((teil) => woerter.some((w) => w.startsWith(teil)))) return 30;
  return 0;
}

/** Stabil nach Rang sortieren (bei Gleichstand bleibt die Reihenfolge) und begrenzen. */
export function nachRang<T>(liste: T[], rang: (t: T) => number, max = MAX_JE_GRUPPE): T[] {
  return liste
    .map((t, i) => ({ t, r: rang(t), i }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .slice(0, max)
    .map((x) => x.t);
}

// ------------------------------------------------------ Suchbegriffe ----

export interface Suchbegriffe {
  /** Wörter ohne das Geburtsdatum, höchstens fünf */
  woerter: string[];
  /** Geburtsdatum als Tagesgrenzen in UTC (so speichert Sorrida Geburtsdaten) */
  geburt: { von: Date; bis: Date } | null;
  /** Roher Suchtext, gekürzt */
  text: string;
}

/** TT.MM.JJJJ (auch T.M.JJJJ) im Suchtext finden. Ungültige Daten (31.02.) zählen nicht. */
export function geburtsdatumLesen(q: string): { von: Date; bis: Date; rest: string } | null {
  const m = /(?:^|\s)(\d{1,2})\.(\d{1,2})\.(\d{4})(?=\s|$)/.exec(q);
  if (!m) return null;
  const tag = Number(m[1]), monat = Number(m[2]), jahr = Number(m[3]);
  if (jahr < 1900 || jahr > 2100 || monat < 1 || monat > 12 || tag < 1) return null;
  const von = new Date(Date.UTC(jahr, monat - 1, tag));
  if (von.getUTCDate() !== tag || von.getUTCMonth() !== monat - 1) return null;
  return { von, bis: new Date(von.getTime() + 864e5), rest: (q.slice(0, m.index) + " " + q.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim() };
}

export function suchbegriffe(roh: string): Suchbegriffe {
  const text = roh.trim().slice(0, MAX_SUCHLAENGE);
  const g = geburtsdatumLesen(text);
  const rest = g ? g.rest : text;
  const woerter = rest.replace(/,/g, " ").split(/\s+/).filter(Boolean).slice(0, 5);
  return { woerter, geburt: g ? { von: g.von, bis: g.bis } : null, text };
}

/** Reicht die Eingabe für eine Abfrage? Ein vollständiges Geburtsdatum genügt auch allein. */
export const sucheLangGenug = (b: Suchbegriffe) => b.text.length >= MIN_ZEICHEN;

/**
 * Bedingung für Patienten (Prisma-Form, ohne practiceId – die setzt die Route):
 * jedes Wort muss in Vor- oder Nachname vorkommen, dazu ggf. das Geburtsdatum.
 * Null, wenn es nichts zu suchen gibt.
 */
export function patientBedingung(b: Suchbegriffe): { AND: Record<string, unknown>[] } | null {
  const und: Record<string, unknown>[] = b.woerter.map((w) => ({
    OR: [{ firstName: { contains: w, mode: "insensitive" } }, { lastName: { contains: w, mode: "insensitive" } }],
  }));
  if (b.geburt) und.push({ birthDate: { gte: b.geburt.von, lt: b.geburt.bis } });
  return und.length ? { AND: und } : null;
}

/** Rang eines Patienten: Nachname am Anfang schlägt Vorname, Wortanfang schlägt „enthält“. */
export function patientRang(p: { firstName: string; lastName: string }, b: Suchbegriffe): number {
  if (!b.woerter.length) return b.geburt ? 50 : 0;
  let summe = 0;
  for (const w of b.woerter) {
    const nach = trefferRang(p.lastName, w);
    const vor = trefferRang(p.firstName, w);
    const r = Math.max(nach ? nach + 5 : 0, vor);
    if (!r) return 0;
    summe += r;
  }
  return Math.round(summe / b.woerter.length) + (b.geburt ? 10 : 0);
}

// ------------------------------------------------------- Seitenliste ----

export interface SeitenEintrag {
  href: string;
  titel: string;
  art: "Seite" | "Einstellung";
  stichworte: string[];
  /** Nur in Zahnarztpraxen vorhanden */
  nurZahn?: boolean;
  /** Stichwörter, die nur in Zahnarztpraxen passen (z. B. „gebiss“) */
  zahnStichworte?: string[];
  /** Nur sichtbar, wenn das Konto dieses Recht hat */
  recht?: keyof MenueRechte;
}

/** Feste Liste aller Menüpunkte und Einstellungsseiten. `{P}` = Wort für Patienten im Fach, `{A}` = Behandlung/Versorgung. */
export const SEITEN: SeitenEintrag[] = [
  { href: "/dashboard", titel: "Übersicht", art: "Seite", stichworte: ["start", "heute", "home", "dashboard"] },
  { href: "/eingang", titel: "Eingang", art: "Seite", stichworte: ["posteingang", "rückmeldung", "gemeldet", "neu", "morgen-mail"] },
  { href: "/mein-bereich", titel: "Mein Bereich", art: "Seite", stichworte: ["meine patienten", "mein umsatz", "persönlich"] },
  { href: "/termine", titel: "Termine", art: "Seite", stichworte: ["kalender", "auslastung", "terminplan", "termin eintragen", "ausfall"] },
  { href: "/praxismanager", titel: "Praxismanager", art: "Seite", stichworte: ["aufgaben", "überblick", "tagesplan"] },
  { href: "/vorsorge", titel: "Vorsorge fällig", art: "Seite", stichworte: ["recall", "erinnerung", "kontrolle", "wiedervorstellung"] },
  { href: "/patients", titel: "{P} und Wege", art: "Seite", stichworte: ["patienten", "kartei", "behandlungsweg", "personen", "liste"] },
  { href: "/patients/new", titel: "{P}: neu anlegen", art: "Seite", stichworte: ["patient anlegen", "neuer patient", "aufnahme"] },
  { href: "/patients/import", titel: "{P}: Liste einlesen", art: "Seite", stichworte: ["import", "csv", "praxissoftware", "umzug", "einlesen", "übernahme", "excel"], recht: "import" },
  { href: "/modelle", titel: "Modelle", art: "Seite", stichworte: ["anatomie", "3d", "körper", "zeigen", "markieren"], zahnStichworte: ["gebiss", "zähne"] },
  { href: "/abschluss/new", titel: "{A} abschließen", art: "Seite", stichworte: ["abschluss", "sitzung", "fertig", "dokumentation"] },
  { href: "/proposals", titel: "Vorschläge", art: "Seite", stichworte: ["kostenvoranschlag", "angebot", "eigenanteil", "behandlungsvorschlag", "plan"] },
  { href: "/proposals/new", titel: "Neuer Vorschlag", art: "Seite", stichworte: ["vorschlag erstellen", "anlegen"] },
  { href: "/proposals/nachfassen", titel: "Nachfassen", art: "Seite", stichworte: ["offene vorschläge", "erinnern", "ohne entscheidung"] },
  { href: "/reports", titel: "Berichte", art: "Seite", stichworte: ["befund", "krankenkasse", "ki", "arztbrief"], nurZahn: true },
  { href: "/zahlungen", titel: "Zahlungen", art: "Seite", stichworte: ["rechnung", "rechnungen", "mahnung", "zahlungserinnerung", "datev", "steuerberater", "buchungsstapel", "sepa", "lastschrift", "girocode", "iban", "bankverbindung", "bankabgleich", "kontoauszug", "online-zahlung", "stripe", "begleitbrief", "versicherung", "erstattung"], recht: "zahlungen" },
  { href: "/abrechnung", titel: "Abrechnung", art: "Seite", stichworte: ["gebühren", "gebührenrechner", "faktor", "steigerungssatz", "punktwert"] },
  { href: "/abrechnungspruefung", titel: "Abrechnungsprüfung", art: "Seite", stichworte: ["vergessene leistungen", "prüfen", "lücken"] },
  { href: "/analyse", titel: "Analyse", art: "Seite", stichworte: ["umsatz", "kennzahlen", "statistik", "auswertung", "zahlen"], recht: "analyse" },
  { href: "/analyse/wirkung", titel: "Wirkungsbericht", art: "Seite", stichworte: ["wirkung", "vorher nachher", "ausgangswert", "nutzen"], recht: "analyse" },
  { href: "/leistungsverzeichnis", titel: "Leistungsverzeichnis", art: "Seite", stichworte: ["ziffer", "ziffern", "leistung", "amtlich", "katalog", "nachschlagen"] },
  { href: "/settings", titel: "Einstellungen", art: "Einstellung", stichworte: ["optionen", "konfiguration", "einrichten"] },
  { href: "/settings/security", titel: "Sicherheit", art: "Einstellung", stichworte: ["zwei-faktor", "2fa", "authenticator", "anmeldung", "passwort", "diktat", "spracherkennung", "mikrofon", "backup-codes"] },
  { href: "/settings/fachgebiet", titel: "Fachgebiet und Leistungen", art: "Einstellung", stichworte: ["fach", "fachrichtung", "preise", "selbstzahler", "eigene leistungen", "igel"], recht: "einstellungen" },
  { href: "/settings/billing", titel: "Abrechnung (Punktwerte)", art: "Einstellung", stichworte: ["punktwert", "punktwerte", "rechnungsbetrag"], nurZahn: true, recht: "einstellungen" },
  { href: "/settings/catalog", titel: "Katalog", art: "Einstellung", stichworte: ["leistungspositionen", "positionen", "punktzahl", "festbetrag", "leistungen pflegen"], recht: "einstellungen" },
  { href: "/settings/templates", titel: "Vorlagen", art: "Einstellung", stichworte: ["sitzungstyp", "sitzungstypen", "checkliste"], recht: "einstellungen" },
  { href: "/settings/connector", titel: "Praxissoftware", art: "Einstellung", stichworte: ["anbindung", "schnittstelle", "connector", "gdt", "vdds", "pvs", "schlüssel"], recht: "einstellungen" },
  { href: "/settings/proposals", titel: "Vorschlagspreise", art: "Einstellung", stichworte: ["preise", "ratenzahlung", "raten", "eigenanteil"], nurZahn: true, recht: "einstellungen" },
  { href: "/settings/lexikon", titel: "Leistungslexikon", art: "Einstellung", stichworte: ["nachschlagewerk", "selbstzahlerleistungen", "lexikon"], nurZahn: true },
  { href: "/settings/termine", titel: "Online-Termine und Kalender", art: "Einstellung", stichworte: ["buchung", "online buchen", "sprechzeiten", "kalender", "ics", "google", "outlook", "abo"], recht: "einstellungen" },
  { href: "/settings/standorte", titel: "Standorte", art: "Einstellung", stichworte: ["zweigpraxis", "filiale", "behandlungsplätze", "räume", "hauptpraxis"], recht: "einstellungen" },
  { href: "/settings/protokoll", titel: "Protokoll und Datenschutz", art: "Einstellung", stichworte: ["audit", "dsgvo", "export", "wer hat was", "anmeldungen", "löschen"], recht: "team" },
  { href: "/settings/team", titel: "Team", art: "Einstellung", stichworte: ["mitarbeiter", "mitarbeitende", "einladen", "rollen", "rechte", "behandler", "konto", "freigabe"], recht: "team" },
];

export interface SeitenKontext {
  rechte: MenueRechte;
  zahn: boolean;
  /** Wort für „Patienten“ im Fach (z. B. „Kunden“) */
  personPl: string;
  /** „Behandlung“ oder das Wort des Fachs */
  abschluss: string;
}

const titelFuer = (s: SeitenEintrag, k: Pick<SeitenKontext, "personPl" | "abschluss">) => s.titel.replace("{P}", k.personPl).replace("{A}", k.abschluss);

/** Seiten, die dieses Konto in dieser Praxis überhaupt hat. */
export function sichtbareSeiten(k: SeitenKontext): SeitenEintrag[] {
  return SEITEN.filter((s) => (!s.nurZahn || k.zahn) && (!s.recht || k.rechte[s.recht])).map((s) => ({
    ...s,
    titel: titelFuer(s, k),
    stichworte: k.zahn && s.zahnStichworte ? [...s.stichworte, ...s.zahnStichworte] : s.stichworte,
  }));
}

/** Rang einer Seite: Titel zählt voll, Stichwörter knapp darunter. */
export function seitenRang(s: Pick<SeitenEintrag, "titel" | "stichworte">, q: string): number {
  const stich = Math.max(0, ...s.stichworte.map((w) => trefferRang(w, q)));
  return Math.max(trefferRang(s.titel, q), stich ? stich - 5 : 0);
}

/** Filter der Seitenliste: passende Seiten, beste zuerst. */
export function seitenSuchen(q: string, k: SeitenKontext, max = MAX_JE_GRUPPE): Treffer[] {
  if (norm(q).length < MIN_ZEICHEN) return [];
  return nachRang(sichtbareSeiten(k), (s) => seitenRang(s, q), max).map((s) => ({
    id: `seite-${s.href}`,
    gruppe: "seiten" as const,
    titel: s.titel,
    unter: s.art === "Einstellung" && s.href !== "/settings" ? "Einstellungen" : undefined,
    href: s.href,
  }));
}

// ----------------------------------------------------------- Aktionen ----

const FESTE_AKTIONEN: { id: string; titel: string; href: string; stichworte: string[] }[] = [
  { id: "vorschlag", titel: "Neuer Vorschlag", href: "/proposals/new", stichworte: ["vorschlag", "neu", "erstellen", "kostenvoranschlag", "angebot"] },
  { id: "termin", titel: "Termin eintragen", href: "/termine", stichworte: ["termin", "neu", "eintragen", "kalender", "buchen"] },
  { id: "patient", titel: "{P} anlegen", href: "/patients/new", stichworte: ["patient", "patienten", "neu", "anlegen", "aufnahme", "aufnehmen"] },
];

/**
 * Aktionen zur Suche: „Neuer Vorschlag für <Patient>“ für die besten Patienten-Treffer,
 * dazu feste Aktionen, wenn das Suchwort zu ihnen passt.
 */
export function aktionenSuchen(q: string, patienten: { id: string; name: string }[], personSg = "Patient", max = MAX_JE_GRUPPE): Treffer[] {
  const jePatient: Treffer[] = patienten.slice(0, 3).map((p) => ({
    id: `aktion-vorschlag-${p.id}`,
    gruppe: "aktionen",
    titel: `Neuer Vorschlag für ${p.name}`,
    href: `/proposals/new?patientId=${encodeURIComponent(p.id)}`,
  }));
  const fest: Treffer[] = nachRang(
    FESTE_AKTIONEN.map((a) => ({ ...a, titel: a.titel.replace("{P}", personSg) })),
    (a) => seitenRang(a, q),
  ).map((a) => ({ id: `aktion-${a.id}`, gruppe: "aktionen", titel: a.titel, href: a.href }));
  return [...jePatient, ...fest].slice(0, max);
}

/** Aktionen, die ohne Suchwort angeboten werden (leeres Suchfenster). */
export const startAktionen = (personSg = "Patient"): Treffer[] =>
  FESTE_AKTIONEN.map((a) => ({ id: `aktion-${a.id}`, gruppe: "aktionen" as const, titel: a.titel.replace("{P}", personSg), href: a.href }));

// --------------------------------------------------------- Rangfolge ----

/** Treffer in fester Gruppenreihenfolge, je Gruppe begrenzt; leere Gruppen fallen weg. */
export function gruppieren(treffer: Treffer[], max = MAX_JE_GRUPPE): { gruppe: Gruppe; treffer: Treffer[] }[] {
  return GRUPPEN_REIHENFOLGE.map((g) => ({ gruppe: g, treffer: treffer.filter((t) => t.gruppe === g).slice(0, max) })).filter((g) => g.treffer.length > 0);
}

export const gruppenTitel = (g: Gruppe, personPl = "Patienten"): string =>
  ({ patienten: personPl, vorschlaege: "Vorschläge", rechnungen: "Rechnungen", seiten: "Seiten und Einstellungen", aktionen: "Aktionen" })[g];

/** Pfeiltasten: nächster Index mit Umlauf. -1 = nichts gewählt. */
export function naechsterIndex(aktuell: number, anzahl: number, richtung: 1 | -1): number {
  if (anzahl <= 0) return -1;
  if (aktuell < 0) return richtung === 1 ? 0 : anzahl - 1;
  return (aktuell + richtung + anzahl) % anzahl;
}

/** Zuletzt geöffnete Patienten: neuester vorn, ohne Doppelte, höchstens `max`. Lebt nur im Speicher des Tabs. */
export function zuletztMerken<T extends { patientId?: string; id: string }>(liste: T[], neu: T, max = 5): T[] {
  const gleich = (a: T, b: T) => (a.patientId ?? a.id) === (b.patientId ?? b.id);
  return [neu, ...liste.filter((t) => !gleich(t, neu))].slice(0, max);
}

// ------------------------------------------------------ Tastenkürzel ----

export interface Kuerzel {
  tasten: string[];
  text: string;
  ziel?: string;
  aktion?: "hilfe" | "suche";
}

export const KUERZEL: Kuerzel[] = [
  { tasten: ["Strg", "K"], text: "Suche öffnen (am Mac: ⌘ K)", aktion: "suche" },
  { tasten: ["g", "h"], text: "Übersicht", ziel: "/dashboard" },
  { tasten: ["g", "p"], text: "Patienten", ziel: "/patients" },
  { tasten: ["g", "e"], text: "Eingang", ziel: "/eingang" },
  { tasten: ["g", "t"], text: "Termine", ziel: "/termine" },
  { tasten: ["g", "v"], text: "Vorschläge", ziel: "/proposals" },
  { tasten: ["g", "z"], text: "Zahlungen", ziel: "/zahlungen" },
  { tasten: ["n"], text: "Neuer Vorschlag", ziel: "/proposals/new" },
  { tasten: ["?"], text: "Diese Liste zeigen", aktion: "hilfe" },
];

/** Wie lange nach „g“ auf die zweite Taste gewartet wird. */
export const G_FRIST_MS = 1500;

export interface TastenEreignis {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** Fokus steht in einem Eingabefeld (siehe istEingabefeld) */
  imEingabefeld?: boolean;
  /** Taste wird gehalten (keydown-Wiederholung) */
  repeat?: boolean;
}

export type KuerzelErgebnis = { art: "ziel"; href: string } | { art: "hilfe" } | { art: "suche" } | null;

export interface KuerzelZustand {
  /** Zeitpunkt des letzten „g“ in ms, sonst null */
  gSeit: number | null;
}

export const KUERZEL_START: KuerzelZustand = { gSeit: null };

/**
 * Zuordnung Tasten → Ziel. Strg+K / ⌘K öffnet die Suche überall. Alle anderen
 * Kürzel lösen nie aus, wenn der Fokus in einem Eingabefeld steht oder eine
 * Umschalttaste (Strg, ⌘, Alt) gehalten wird.
 */
export function kuerzelSchritt(z: KuerzelZustand, e: TastenEreignis, jetzt: number): { zustand: KuerzelZustand; ergebnis: KuerzelErgebnis } {
  const taste = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && taste === "k") return { zustand: KUERZEL_START, ergebnis: { art: "suche" } };
  if (e.imEingabefeld || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return { zustand: KUERZEL_START, ergebnis: null };

  if (z.gSeit != null && jetzt - z.gSeit <= G_FRIST_MS) {
    const k = KUERZEL.find((x) => x.tasten.length === 2 && x.tasten[0] === "g" && x.tasten[1] === taste && x.ziel);
    if (k?.ziel) return { zustand: KUERZEL_START, ergebnis: { art: "ziel", href: k.ziel } };
    // „g g“ wartet weiter, alles andere bricht die Folge ab.
    return { zustand: taste === "g" ? { gSeit: jetzt } : KUERZEL_START, ergebnis: null };
  }
  if (taste === "g") return { zustand: { gSeit: jetzt }, ergebnis: null };
  if (taste === "?") return { zustand: KUERZEL_START, ergebnis: { art: "hilfe" } };
  const einzel = KUERZEL.find((x) => x.tasten.length === 1 && x.tasten[0] === taste && x.ziel);
  if (einzel?.ziel) return { zustand: KUERZEL_START, ergebnis: { art: "ziel", href: einzel.ziel } };
  return { zustand: KUERZEL_START, ergebnis: null };
}

/** Steht der Fokus in einem Feld, in dem getippt wird? Dann keine Kürzel. */
export function istEingabefeld(el: { tagName?: string; isContentEditable?: boolean; getAttribute?: (n: string) => string | null } | null | undefined): boolean {
  if (!el) return false;
  const tag = (el.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  const rolle = el.getAttribute?.("role") ?? "";
  return rolle === "textbox" || rolle === "combobox" || rolle === "searchbox" || rolle === "spinbutton";
}
