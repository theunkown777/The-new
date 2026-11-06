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

export const vddsPatientSchema = z.object({
  PVS: z.string({ required_error: "PVS fehlt in der Übergabedatei" }).min(1, "PVS fehlt in der Übergabedatei").max(30),
  // Laut Spezifikation alphanumerisch, max. 12 Stellen; manche PVS nutzen Bindestriche.
  PATID: z.string({ required_error: "PATID fehlt in der Übergabedatei" }).min(1, "PATID fehlt in der Übergabedatei").max(12).regex(/^[A-Za-z0-9_-]+$/, "PATID ungültig"),
  PATSHOWNR: z.string().max(20).optional(),
  LASTNAME: z.string({ required_error: "Nachname fehlt in der Übergabedatei" }).min(1, "Nachname fehlt in der Übergabedatei").max(100),
  FIRSTNAME: z.string({ required_error: "Vorname fehlt in der Übergabedatei" }).min(1, "Vorname fehlt in der Übergabedatei").max(100),
  TITLE: z.string().max(40).optional(),
  BIRTHDAY: z.string().regex(/^\d{8}$/).optional(),
  SEX: z.enum(["M", "W"]).optional(),
  INSURANCESTATUS: z.enum(["M", "F", "R", "P"]).optional(),
  INSURANCE: z.string().max(100).optional(),
  INFO: z.enum(["0", "1"]).optional(),
});
export type VddsPatient = z.infer<typeof vddsPatientSchema>;

/** [PATIENT]-Abschnitt aus dem INI-Text holen, leere Werte und fremde Keys entfernen. */
export function extractVddsPatient(text: string): { data?: VddsPatient; error?: string } {
  const ini = parseIni(text);
  const section = ini["PATIENT"];
  if (!section) return { error: "Abschnitt [PATIENT] fehlt in der Übergabedatei." };
  const picked: Record<string, string> = {};
  for (const key of VDDS_PATIENT_FIELDS) {
    const v = section[key];
    if (v) picked[key] = key === "SEX" || key === "INSURANCESTATUS" ? v.toUpperCase() : v;
  }
  const parsed = vddsPatientSchema.safeParse(picked);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Übergabedatei ungültig." };
  return { data: parsed.data };
}

/** BIRTHDAY im Format CCYYMMDD; ungültige Kalenderdaten ergeben null statt eines verschobenen Datums. */
export function parseVddsDate(value: string | undefined): Date | null {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
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
    geschlecht: p.SEX === "M" ? "M" : p.SEX === "W" || p.SEX === "F" ? "W" : p.SEX === "D" || p.SEX === "X" ? "D" : null,
  };
}

export const EMBED_VIEWS = ["abschluss", "bericht", "vorschlag", "verlauf"] as const;
export type EmbedView = (typeof EMBED_VIEWS)[number];
export const LAUNCH_TOKEN_TTL_MS = 5 * 60 * 1000;

// GDT (Gerätedatenträger) ist die Schnittstelle der Arzt-Praxissoftware
// (z. B. Medistar, TURBOMED, CGM M1, x.isynet, ALBIS). Jede Zeile:
// 3 Stellen Zeilenlänge, 4 Stellen Feldkennung, Inhalt. Verwendet werden nur
// Patientennummer, Name, Geburtsdatum und Geschlecht; der Connector schickt
// keine weiteren Zeilen.
export const GDT_FIELDS = { "8000": "SATZART", "8316": "SENDER", "3000": "PATID", "3101": "LASTNAME", "3102": "FIRSTNAME", "3103": "BIRTHDAY", "3110": "SEX" } as const;

export function isGdt(text: string): boolean {
  return /^﻿?\d{3}8000/.test(text.trimStart());
}

export function parseGdt(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const m = raw.match(/^\d{3}(\d{4})(.*)$/);
    if (m && !(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

/** GDT-Datensatz in dieselbe Form wie VDDS-media bringen, damit der Rest gleich bleibt. */
export function extractGdtPatient(text: string): { data?: VddsPatient; error?: string } {
  const f = parseGdt(text);
  if (!f["3000"]) return { error: "Patientennummer (3000) fehlt in der GDT-Datei." };
  const birth = f["3103"]?.match(/^(\d{2})(\d{2})(\d{4})$/);
  const sex = f["3110"] === "1" ? "M" : f["3110"] === "2" ? "W" : undefined;
  const sender = (f["8316"] || "GDT").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30) || "GDT";
  const picked: Record<string, string | undefined> = {
    PVS: `GDT-${sender}`.slice(0, 30),
    PATID: f["3000"].replace(/\s/g, ""),
    LASTNAME: f["3101"],
    FIRSTNAME: f["3102"],
    BIRTHDAY: birth ? `${birth[3]}${birth[2]}${birth[1]}` : undefined,
    SEX: sex,
  };
  const parsed = vddsPatientSchema.safeParse(Object.fromEntries(Object.entries(picked).filter(([, v]) => v)));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message.replace("Übergabedatei", "GDT-Datei") ?? "GDT-Datei ungültig." };
  return { data: parsed.data };
}

/** VDDS-media (Zahnarzt) oder GDT (Arztpraxis) automatisch erkennen. */
export function extractHandoverPatient(text: string): { data?: VddsPatient; error?: string; format: "VDDS" | "GDT" } {
  return isGdt(text) ? { ...extractGdtPatient(text), format: "GDT" } : { ...extractVddsPatient(text), format: "VDDS" };
}
