import { Prisma, type PrismaClient } from "@prisma/client";

// Alle Daten einer Praxis löschen: nach Vertragsende (AVV § 10, app/avv/page.tsx; Skript scripts/praxis-loeschen.ts)
// und für abgelaufene Demo-Praxen (cleanupExpiredDemos in lib/demo.ts). Eine Liste für beides.
//
// SCHRITTE nennt jede Tabelle mit Bezug zu einer Praxis, in einer Reihenfolge, in der nie eine Zeile gelöscht wird, auf
// die noch eine andere Zeile zeigt. So greift keine Löschweitergabe der Datenbank (onDelete), und die Zahl je Tabelle
// stimmt genau. lib/praxisLoeschen.test.ts prüft gegen das Prisma-Schema: Jedes Modell steht entweder in SCHRITTE oder
// in OHNE_PRAXISBEZUG, und die Reihenfolge passt zu den Fremdschlüsseln. Ein neues Modell ohne Eintrag lässt den Test
// fehlschlagen.
//
// Konten: Ein Konto gehört laut Schema zu genau einer Praxis (User.practiceId ist Pflicht, keine Mitgliedschaften).
// Deshalb werden alle Konten der Praxis gelöscht.
//
// Ausgaben (Probelauf, Bestätigung) enthalten nur Zahlen, Name und Kennung der Praxis, nie Angaben zu Patienten.

type Wo = Record<string, unknown>;
type Db = Prisma.TransactionClient;

export type Schritt = {
  modell: Prisma.ModelName;
  /** Wofür die Tabelle steht, für Probelauf und Bestätigung */
  text: string;
  /** Zeilen dieser Praxis */
  wo: (praxisId: string) => Wo;
  /** Statt die Zeile zu löschen, nur diese Felder leeren (die Zeile gehört nicht allein der Praxis) */
  leeren?: Record<string, null>;
};

const direkt = (practiceId: string): Wo => ({ practiceId });

export const SCHRITTE: readonly Schritt[] = [
  // Ohne Fremdschlüssel, nur mit der Kennung der Praxis
  { modell: "AuditLog", text: "Protokoll", wo: direkt },
  // Gleicher Fehler aus mehreren Praxen ist eine Zeile (Zähler). Sie enthält keine Angaben zu Personen und wird
  // 30 Tage nach dem letzten Auftreten ohnehin gelöscht. Entfernt wird die Verbindung zur Praxis.
  { modell: "FehlerEintrag", text: "Fehlerprotokoll des Betriebs, Kennung der Praxis entfernt", wo: direkt, leeren: { practiceId: null } },
  { modell: "EmpfangParkung", text: "Empfangsmodus, geparkte Sitzungen", wo: direkt },
  { modell: "Terminanfrage", text: "Online-Terminanfragen", wo: direkt },
  { modell: "KalenderBelegung", text: "Belegte Zeiten aus dem Kalender", wo: direkt },
  { modell: "GdtAuslieferung", text: "Übergaben an die Praxissoftware (GDT)", wo: direkt },
  { modell: "ConnectorKey", text: "Schlüssel für den Connector", wo: direkt },
  { modell: "LaunchToken", text: "Start-Tokens des Connectors", wo: direkt },
  { modell: "StaffInvite", text: "Einladungen", wo: direkt },
  // Zum Patienten
  { modell: "Eingang", text: "Eingang", wo: direkt },
  { modell: "Kurzcheck", text: "Kurz-Fragebögen", wo: direkt },
  { modell: "Warteliste", text: "Warteliste", wo: direkt },
  { modell: "ModellMarkierung", text: "Markierungen am Modell", wo: direkt },
  { modell: "PortalPruefung", text: "Geburtsdatum-Prüfung im Patientenportal", wo: (id) => ({ patient: { practiceId: id } }) },
  { modell: "PatientEntry", text: "Einträge in der Akte", wo: direkt },
  { modell: "PatientDocument", text: "Dokumente", wo: direkt },
  { modell: "AnamnesisForm", text: "Anamnesebögen", wo: direkt },
  // Termine und Standorte
  { modell: "TerminRueckmeldung", text: "Rückmeldungen nach Terminen", wo: direkt },
  { modell: "Appointment", text: "Termine", wo: direkt },
  { modell: "UserLocation", text: "Zuordnung von Konten zu Standorten", wo: (id) => ({ user: { practiceId: id } }) },
  { modell: "Location", text: "Standorte", wo: direkt },
  // Rechnungen, Vorschläge, Berichte
  { modell: "Invoice", text: "Rechnungen", wo: direkt },
  { modell: "LeseLink", text: "Lese-Links", wo: (id) => ({ proposal: { practiceId: id } }) },
  { modell: "Zweitmeinung", text: "Zweitmeinungen", wo: direkt },
  { modell: "TreatmentProposal", text: "Behandlungsvorschläge", wo: direkt },
  { modell: "ReportServiceEntry", text: "Leistungen in Berichten", wo: (id) => ({ report: { practiceId: id } }) },
  { modell: "ReportRevision", text: "Frühere Fassungen von Berichten", wo: (id) => ({ report: { practiceId: id } }) },
  { modell: "Report", text: "Berichte", wo: direkt },
  // Eigene Vorlagen und Leistungen (globale Einträge mit practiceId = null bleiben)
  { modell: "ServiceTemplateItem", text: "Positionen in eigenen Vorlagen", wo: (id) => ({ template: { practiceId: id } }) },
  { modell: "ServiceTemplate", text: "Eigene Vorlagen", wo: direkt },
  { modell: "ServiceCatalogItem", text: "Eigene Leistungspositionen", wo: direkt },
  { modell: "Patient", text: "Patientinnen und Patienten", wo: direkt },
  // Konten
  { modell: "EmailVerificationToken", text: "Tokens zur Bestätigung der E-Mail-Adresse", wo: (id) => ({ user: { practiceId: id } }) },
  { modell: "PasswordResetToken", text: "Tokens zum Zurücksetzen des Passworts", wo: (id) => ({ user: { practiceId: id } }) },
  { modell: "User", text: "Konten", wo: direkt },
  { modell: "Practice", text: "Praxis mit Stammdaten und Einstellungen", wo: (id) => ({ id }) },
];

/** Modelle ohne Bezug zu einer Praxis, mit Grund. Bleiben beim Löschen einer Praxis unberührt. */
export const OHNE_PRAXISBEZUG: Readonly<Partial<Record<Prisma.ModelName, string>>> = {
  ApiClient: "Zugang für Partnersysteme, gehört zu keiner Praxis",
  Lead: "Anfrage über die Website; ohne Kennung der Praxis, eigene Löschfrist (lib/loeschfristen.ts)",
  LexikonEntry: "Nachschlagewerk für alle Praxen",
  AmtlicheLeistung: "Amtliche Leistungsverzeichnisse für alle Praxen",
};

export type Zeile = { modell: Prisma.ModelName; text: string; anzahl: number; geleert: boolean };
export type Fremdschluessel = { von: Prisma.ModelName; feld: string; nach: Prisma.ModelName };
export type FremderVerweis = Fremdschluessel & { anzahl: number };
export type Praxis = { id: string; name: string; isDemo: boolean };
export type LoeschErgebnis = { praxis: Praxis; zeitpunkt: Date; zeilen: Zeile[] };

/** Abbruch ohne Löschung: Praxis fehlt, Name stimmt nicht oder Daten anderer Praxen zeigen auf diese Praxis. */
export class LoeschAbbruch extends Error {
  constructor(message: string, readonly verweise: FremderVerweis[] = []) {
    super(message);
    this.name = "LoeschAbbruch";
  }
}

type Tabelle = {
  count(a: { where: Wo }): Promise<number>;
  deleteMany(a: { where: Wo }): Promise<{ count: number }>;
  updateMany(a: { where: Wo; data: Wo }): Promise<{ count: number }>;
};
const tabelle = (db: Db, modell: string): Tabelle => (db as unknown as Record<string, Tabelle>)[modell[0].toLowerCase() + modell.slice(1)];
const schrittVon = new Map(SCHRITTE.map((s) => [s.modell, s] as const));

/** Alle Fremdschlüssel zwischen Tabellen aus SCHRITTE, aus dem Prisma-Schema gelesen. */
export function fremdschluessel(): Fremdschluessel[] {
  return Prisma.dmmf.datamodel.models.flatMap((m) =>
    schrittVon.has(m.name as Prisma.ModelName)
      ? m.fields
          .filter((f) => f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && schrittVon.has(f.type as Prisma.ModelName))
          .map((f) => ({ von: m.name as Prisma.ModelName, feld: f.name, nach: f.type as Prisma.ModelName }))
      : [],
  );
}

/**
 * Zeilen, die nicht zu dieser Praxis gehören, aber auf eine ihrer Zeilen zeigen (z. B. ein Bericht einer anderen Praxis
 * mit einem Konto dieser Praxis als Verfasser). Sollte es nie geben. Gäbe es sie, würde das Löschen sie mitlöschen,
 * leeren oder blockieren. Deshalb wird dann nicht gelöscht.
 */
export async function fremdeVerweise(db: Db, praxisId: string): Promise<FremderVerweis[]> {
  const aus: FremderVerweis[] = [];
  for (const fk of fremdschluessel()) {
    const ziel = { [fk.feld]: schrittVon.get(fk.nach)!.wo(praxisId) };
    const alle = await tabelle(db, fk.von).count({ where: ziel });
    if (!alle) continue;
    const eigene = await tabelle(db, fk.von).count({ where: { AND: [schrittVon.get(fk.von)!.wo(praxisId), ziel] } });
    if (alle > eigene) aus.push({ ...fk, anzahl: alle - eigene });
  }
  return aus;
}

/** Zahl der Zeilen je Tabelle, die beim Löschen wegfielen (bzw. geleert würden). Löscht nichts. */
export async function praxisZaehlen(db: Db, praxisId: string): Promise<Zeile[]> {
  const aus: Zeile[] = [];
  for (const s of SCHRITTE) aus.push({ modell: s.modell, text: s.text, anzahl: await tabelle(db, s.modell).count({ where: s.wo(praxisId) }), geleert: !!s.leeren });
  return aus;
}

/**
 * Löscht alle Daten der Praxis in einer Transaktion. Mit `name`: nur, wenn er genau dem Namen der Praxis entspricht.
 * Bricht ohne Änderung ab (LoeschAbbruch), wenn die Praxis fehlt, der Name nicht stimmt oder fremde Verweise bestehen.
 */
export async function praxisLoeschen(db: PrismaClient, praxisId: string, opts: { name?: string } = {}): Promise<LoeschErgebnis> {
  const { praxis, zeilen } = await db.$transaction(
    async (tx) => {
      const praxis = await tx.practice.findUnique({ where: { id: praxisId }, select: { id: true, name: true, isDemo: true } });
      if (!praxis) throw new LoeschAbbruch(`Keine Praxis mit der Kennung ${praxisId}. Nichts gelöscht.`);
      if (opts.name !== undefined && opts.name !== praxis.name) throw new LoeschAbbruch("Der Name zur Bestätigung stimmt nicht genau mit dem Namen der Praxis überein. Nichts gelöscht.");
      const verweise = await fremdeVerweise(tx, praxisId);
      if (verweise.length) throw new LoeschAbbruch(`Daten anderer Praxen zeigen auf diese Praxis. Nichts gelöscht.\n${verweiseText(verweise)}`, verweise);
      const zeilen: Zeile[] = [];
      for (const s of SCHRITTE) {
        const t = tabelle(tx, s.modell);
        const r = s.leeren ? await t.updateMany({ where: s.wo(praxisId), data: s.leeren }) : await t.deleteMany({ where: s.wo(praxisId) });
        zeilen.push({ modell: s.modell, text: s.text, anzahl: r.count, geleert: !!s.leeren });
      }
      return { praxis, zeilen };
    },
    // Große Praxen mit vielen Dokumenten brauchen länger als die üblichen 5 Sekunden.
    { maxWait: 15_000, timeout: 5 * 60_000 },
  );
  return { praxis, zeitpunkt: new Date(), zeilen };
}

// ---------------------------------------------------------------------------
// Aufruf und Texte für scripts/praxis-loeschen.ts

export type Aufruf = { praxisId: string; ausfuehren: boolean; bestaetigen?: string };

export const NUTZUNG = [
  "Nutzung:",
  "  Probelauf (löscht nichts):",
  "    npx tsx scripts/praxis-loeschen.ts --praxis <Kennung>",
  "  Löschen:",
  '    npx tsx scripts/praxis-loeschen.ts --praxis <Kennung> --ausfuehren --bestaetigen "<genauer Name der Praxis>"',
].join("\n");

/** Befehlszeile lesen. Unbekannte oder doppelte Angaben sind ein Fehler. */
export function argumenteLesen(argv: readonly string[]): Aufruf | { fehler: string } {
  let praxisId: string | undefined;
  let bestaetigen: string | undefined;
  let ausfuehren = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ausfuehren") {
      if (ausfuehren) return { fehler: "--ausfuehren ist doppelt angegeben." };
      ausfuehren = true;
    } else if (a === "--praxis" || a === "--bestaetigen") {
      const wert = argv[++i];
      if (wert === undefined || wert === "" || wert.startsWith("--")) return { fehler: `${a} braucht einen Wert.` };
      if ((a === "--praxis" ? praxisId : bestaetigen) !== undefined) return { fehler: `${a} ist doppelt angegeben.` };
      if (a === "--praxis") praxisId = wert;
      else bestaetigen = wert;
    } else {
      return { fehler: `Unbekannte Angabe: ${a}` };
    }
  }
  if (!praxisId) return { fehler: "--praxis <Kennung> fehlt." };
  if (ausfuehren && bestaetigen === undefined) return { fehler: '--ausfuehren braucht --bestaetigen "<genauer Name der Praxis>".' };
  if (!ausfuehren && bestaetigen !== undefined) return { fehler: "--bestaetigen gilt nur zusammen mit --ausfuehren." };
  return { praxisId, ausfuehren, ...(bestaetigen !== undefined ? { bestaetigen } : {}) };
}

/** Rechner, Port und Datenbank aus der Adresse, ohne Benutzer und Passwort. */
export function datenbankZiel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(Adresse nicht lesbar)";
  }
}

const summe = (zeilen: readonly Zeile[]) => zeilen.filter((z) => !z.geleert).reduce((n, z) => n + z.anzahl, 0);

function verweiseText(verweise: readonly FremderVerweis[]): string {
  return verweise.map((v) => `  ${v.von}.${v.feld} → ${v.nach}: ${v.anzahl} Zeile(n) einer anderen Praxis`).join("\n");
}

/** Shell-taugliche Schreibweise des Namens für den Beispielbefehl. */
const shellWort = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Übersicht vor dem Löschen (Probelauf und vor --ausfuehren). */
export function uebersichtText(a: { ziel: string; praxis: Praxis; zeilen: readonly Zeile[]; verweise: readonly FremderVerweis[] }): string {
  const breite = Math.max(...a.zeilen.map((z) => z.modell.length));
  const zahl = Math.max(...a.zeilen.map((z) => String(z.anzahl).length), 5);
  return [
    `Datenbank:   ${a.ziel}`,
    `Praxis:      ${a.praxis.name}`,
    `Kennung:     ${a.praxis.id}`,
    `Demo-Praxis: ${a.praxis.isDemo ? "ja" : "nein"}`,
    "",
    "Zeilen je Tabelle:",
    ...a.zeilen.map((z) => `  ${z.modell.padEnd(breite)}  ${String(z.anzahl).padStart(zahl)}  ${z.text}${z.geleert ? " (wird nicht gelöscht, nur geleert)" : ""}`),
    `  ${"Summe gelöscht".padEnd(breite)}  ${String(summe(a.zeilen)).padStart(zahl)}`,
    ...(a.verweise.length ? ["", "Achtung: Daten anderer Praxen zeigen auf diese Praxis. So wird nicht gelöscht, erst klären:", verweiseText(a.verweise)] : []),
  ].join("\n");
}

export function probelaufText(praxis: Praxis): string {
  return [
    "Probelauf: Es wurde nichts gelöscht.",
    "Zum Löschen, wenn Datenbank und Praxis stimmen:",
    `  npx tsx scripts/praxis-loeschen.ts --praxis ${praxis.id} --ausfuehren --bestaetigen ${shellWort(praxis.name)}`,
  ].join("\n");
}

/** „17.11.2026 um 14:05:09 Uhr (UTC)“ */
export function zeitpunktUtc(d: Date): string {
  const [datum, zeit] = d.toISOString().split("T");
  const [j, m, t] = datum.split("-");
  return `${t}.${m}.${j} um ${zeit.slice(0, 8)} Uhr (UTC)`;
}

/** Text, den der Betreiber der Praxis als Bestätigung in Textform schickt. Nur Zahlen, keine Angaben zu Personen. */
export function bestaetigungText(e: LoeschErgebnis): string {
  const geloescht = e.zeilen.filter((z) => !z.geleert);
  const geleert = e.zeilen.filter((z) => z.geleert);
  return [
    "Bestätigung der Löschung (§ 10 des Vertrags zur Auftragsverarbeitung)",
    "",
    `Praxis: ${e.praxis.name}`,
    `Kennung in Sorrida: ${e.praxis.id}`,
    `Gelöscht am ${zeitpunktUtc(e.zeitpunkt)}`,
    "",
    "Sorrida hat alle Daten der Praxis aus der Datenbank gelöscht. Gelöschte Einträge je Tabelle:",
    ...geloescht.map((z) => `- ${z.text}: ${z.anzahl}`),
    `Zusammen: ${summe(e.zeilen)}`,
    "",
    ...geleert.flatMap((z) => [
      `${z.text}: ${z.anzahl} Einträge. Diese Einträge enthalten keine Angaben zu Personen und werden 30 Tage nach dem letzten Auftreten des Fehlers gelöscht.`,
      "",
    ]),
    "Sicherungen: Der Datenbank-Anbieter bewahrt Sicherungen der Datenbank für einen festen Zeitraum auf. Bis dieser Zeitraum",
    "abgelaufen ist, sind die Daten dort noch enthalten. Danach sind sie auch dort gelöscht.",
  ].join("\n");
}
