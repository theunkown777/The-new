import crypto from "crypto";
import { z } from "zod";

// Anbindung an Praxisverwaltungssysteme (PVS) über VDDS-media 1.4: Die PVS
// (DS-Win, CGM Z1, charly, evident u. a.) schreibt die Patientendaten in
// eine Windows-INI-Übergabedatei und ruft das in der VDDS_MMI.INI
// registrierte Importmodul auf - hier der Sorrida-Connector
// (public/connector/). Der Connector schickt den [PATIENT]-Abschnitt an
// /api/connector/launch; geparst und geprüft wird ausschließlich hier, damit
// die Logik an einer Stelle liegt und getestet ist.

const KEY_PREFIX = "sor_conn_";

/** Schlüssel je Praxis-Arbeitsplatz; wie API-Keys hochentropisch, daher SHA-256 statt bcrypt. */
export function generateConnectorKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashConnectorKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function connectorKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX.length + 6);
}

/**
 * Minimaler Windows-INI-Parser: Sektionen und Keys sind laut Spezifikation
 * case-insensitive und werden daher großgeschrieben abgelegt.
 */
export function parseIni(text: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  let section = "";
  for (const rawLine of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) {
      section = sec[1].trim().toUpperCase();
      out[section] ??= {};
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0 || !section) continue;
    out[section][line.slice(0, eq).trim().toUpperCase()] = line.slice(eq + 1).trim();
  }
  return out;
}

/** Nur diese Felder aus Tabelle 3 werden verarbeitet; Adresse, Telefon, Versichertennummer usw. werden verworfen. */
export const VDDS_PATIENT_FIELDS = [
  "PVS",
  "PATID",
  "PATSHOWNR",
  "LASTNAME",
  "FIRSTNAME",
  "TITLE",
  "BIRTHDAY",
  "SEX",
  "INSURANCESTATUS",
  "INSURANCE",
  "INFO",
] as const;

// Grundsatz: Nur was für die eindeutige Zuordnung nötig ist, muss stimmen (Absender, Patientennummer,
// Name). Alles Weitere ist Zusatz: Ungewohnte Schreibweisen der einzelnen Praxissoftware werden
// übersetzt, Unlesbares wird weggelassen, statt den ganzen Aufruf abzulehnen.
export const vddsPatientSchema = z.object({
  PVS: z.string({ required_error: "PVS fehlt in der Übergabedatei" }).min(1, "PVS fehlt in der Übergabedatei").max(30),
  // Laut VDDS-media höchstens 12 Stellen; manche Systeme liefern längere Nummern mit Punkt, Bindestrich oder Schrägstrich.
  PATID: z.string({ required_error: "PATID fehlt in der Übergabedatei" }).min(1, "PATID fehlt in der Übergabedatei").max(40, "Patientennummer zu lang").regex(/^[A-Za-z0-9_.\/-]+$/, "Patientennummer enthält unerlaubte Zeichen"),
  PATSHOWNR: z.string().max(20).optional(),
  LASTNAME: z.string({ required_error: "Nachname fehlt in der Übergabedatei" }).min(1, "Nachname fehlt in der Übergabedatei").max(100),
  FIRSTNAME: z.string({ required_error: "Vorname fehlt in der Übergabedatei" }).min(1, "Vorname fehlt in der Übergabedatei").max(100),
  TITLE: z.string().max(40).optional(),
  BIRTHDAY: z.string().regex(/^\d{8}$/).optional(),
  SEX: z.enum(["M", "W", "D"]).optional(),
  INSURANCESTATUS: z.enum(["M", "F", "R", "P"]).optional(),
  INSURANCE: z.string().max(100).optional(),
  INFO: z.enum(["0", "1"]).optional(),
});
export type VddsPatient = z.infer<typeof vddsPatientSchema>;

const kuerze = (v: string | undefined, max: number) => (v ? v.replace(/\s+/g, " ").trim().slice(0, max) || undefined : undefined);

/**
 * Geburtsdatum in CCYYMMDD. VDDS liefert CCYYMMDD, GDT TTMMJJJJ; beide auch mit Punkten oder
 * Bindestrichen. Zuerst gilt die Form der Quelle, dann die andere; Unmögliches ergibt undefined.
 */
export function normalisiereGeburtsdatum(v: string | undefined, zuerst: "JMT" | "TMJ" = "JMT"): string | undefined {
  if (!v) return undefined;
  const t = v.trim().replace(/[.\-/]/g, "");
  if (!/^\d{8}$/.test(t)) return undefined;
  const jmt = t;
  const tmj = `${t.slice(4, 8)}${t.slice(2, 4)}${t.slice(0, 2)}`;
  for (const k of zuerst === "JMT" ? [jmt, tmj] : [tmj, jmt]) if (parseVddsDate(k)) return k;
  return undefined;
}

/** Geschlecht aus allen üblichen Schreibweisen (VDDS M/W, GDT 2.1 1/2, GDT 3.0 M/W/D/X/U, englisch F). */
export function normalisiereGeschlecht(v: string | undefined): "M" | "W" | "D" | undefined {
  const t = (v ?? "").trim().toUpperCase();
  if (t === "M" || t === "1") return "M";
  if (t === "W" || t === "F" || t === "2") return "W";
  if (t === "D" || t === "X") return "D";
  return undefined;
}

/** Felder säubern: Pflichtfelder bleiben roh (Fehler wird gemeldet), Zusatzfelder werden passend gemacht oder weggelassen. */
function saeubern(roh: Record<string, string | undefined>, datum: "JMT" | "TMJ" = "JMT"): Record<string, string> {
  const status = (roh.INSURANCESTATUS ?? "").trim().toUpperCase();
  const info = (roh.INFO ?? "").trim();
  const out: Record<string, string | undefined> = {
    PVS: roh.PVS?.trim(),
    PATID: roh.PATID?.trim(),
    PATSHOWNR: kuerze(roh.PATSHOWNR, 20),
    LASTNAME: kuerze(roh.LASTNAME, 100),
    FIRSTNAME: kuerze(roh.FIRSTNAME, 100),
    TITLE: kuerze(roh.TITLE, 40),
    BIRTHDAY: normalisiereGeburtsdatum(roh.BIRTHDAY, datum),
    SEX: normalisiereGeschlecht(roh.SEX),
    INSURANCESTATUS: ["M", "F", "R", "P"].includes(status) ? status : undefined,
    INSURANCE: kuerze(roh.INSURANCE, 100),
    INFO: info === "1" ? "1" : info === "0" ? "0" : undefined,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Record<string, string>;
}

/** [PATIENT]-Abschnitt aus dem INI-Text holen, leere Werte und fremde Keys entfernen. */
export function extractVddsPatient(text: string): { data?: VddsPatient; error?: string } {
  const ini = parseIni(text);
  const section = ini["PATIENT"];
  if (!section) return { error: "Abschnitt [PATIENT] fehlt in der Übergabedatei." };
  const picked: Record<string, string | undefined> = {};
  for (const key of VDDS_PATIENT_FIELDS) picked[key] = section[key];
  const parsed = vddsPatientSchema.safeParse(saeubern(picked));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Übergabedatei ungültig." };
  return { data: parsed.data };
}

/** BIRTHDAY im Format CCYYMMDD; ungültige Kalenderdaten ergeben null statt eines verschobenen Datums. */
export function parseVddsDate(value: string | undefined): Date | null {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  if (y < 1850 || y > 2200) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Felder für das Patient-Modell; INSURANCESTATUS=P bedeutet privat versichert. */
export function vddsToPatientFields(p: VddsPatient) {
  return {
    firstName: p.FIRSTNAME,
    lastName: p.LASTNAME,
    birthDate: parseVddsDate(p.BIRTHDAY),
    insuranceType: p.INSURANCESTATUS ? (p.INSURANCESTATUS === "P" ? "PKV" : "GKV") : null,
    insuranceName: p.INSURANCE ?? null,
    geschlecht: p.SEX ?? null,
  };
}

export const EMBED_VIEWS = ["abschluss", "bericht", "vorschlag", "verlauf"] as const;
export type EmbedView = (typeof EMBED_VIEWS)[number];
export const LAUNCH_TOKEN_TTL_MS = 5 * 60 * 1000;

// GDT (Gerätedatenträger) ist die Schnittstelle der Arzt-Praxissoftware
// (z. B. Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS). Jede Zeile:
// 3 Stellen Zeilenlänge, 4 Stellen Feldkennung, Inhalt. Verwendet werden nur
// Satzart, die beiden GDT-Kennungen, Patientennummer, Name, Geburtsdatum und
// Geschlecht; der Connector schickt keine weiteren Zeilen. GDT 2.1 und 3.0.
export const GDT_FIELDS = { "8000": "SATZART", "8315": "EMPFAENGER", "8316": "SENDER", "3000": "PATID", "3101": "LASTNAME", "3102": "FIRSTNAME", "3103": "BIRTHDAY", "3110": "SEX" } as const;

export function isGdt(text: string): boolean {
  return /^\uFEFF?\d{3}8000/.test(text.trimStart());
}

/** Zeilen lesen; die Längenangabe wird nicht nachgerechnet, weil sie bei Umlauten je nach Zeichensatz abweicht. */
export function parseGdt(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/)) {
    const m = raw.trimStart().match(/^\d{3}(\d{4})(.*)$/);
    if (m && !(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

/** GDT-Kennung (8315/8316): höchstens 8 Zeichen, nur Buchstaben und Ziffern. */
export const gdtKennung = (v: string | undefined) => (v ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 8);

/** GDT-Datensatz in dieselbe Form wie VDDS-media bringen, damit der Rest gleich bleibt. */
export function extractGdtPatient(text: string): { data?: VddsPatient; error?: string; sorridaKennung?: string } {
  const f = parseGdt(text);
  if (!f["3000"]) return { error: "Patientennummer (3000) fehlt in der GDT-Datei." };
  const sender = gdtKennung(f["8316"]) || "GDT";
  const picked: Record<string, string | undefined> = {
    PVS: `GDT-${sender}`.slice(0, 30),
    PATID: f["3000"].replace(/\s/g, ""),
    LASTNAME: f["3101"],
    FIRSTNAME: f["3102"],
    BIRTHDAY: f["3103"],
    SEX: f["3110"],
  };
  const parsed = vddsPatientSchema.safeParse(saeubern(picked, "TMJ"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message.replace("Übergabedatei", "GDT-Datei") ?? "GDT-Datei ungültig." };
  // 8315: Unter dieser Kennung kennt die Praxissoftware Sorrida; die Rückgabe (6310) muss sie als Absender tragen.
  return { data: parsed.data, sorridaKennung: gdtKennung(f["8315"]) || undefined };
}

/** VDDS-media (Zahnarzt) oder GDT (Arztpraxis) automatisch erkennen. */
export function extractHandoverPatient(text: string): { data?: VddsPatient; error?: string; format: "VDDS" | "GDT"; sorridaKennung?: string } {
  return isGdt(text) ? { ...extractGdtPatient(text), format: "GDT" } : { ...extractVddsPatient(text), format: "VDDS" };
}


export { kennungenLesen, kennungMerken } from "@/lib/kennungen";
