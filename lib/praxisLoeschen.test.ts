// Löschen einer Praxis nach Vertragsende (AVV § 10, lib/praxisLoeschen.ts, scripts/praxis-loeschen.ts).
//
// Teil 1 (läuft immer): Abgleich mit dem Prisma-Schema. Jedes Modell ist eingeordnet (SCHRITTE oder OHNE_PRAXISBEZUG),
// jedes Modell mit Bezug zu einer Praxis wird gelöscht, und die Reihenfolge passt zu den Fremdschlüsseln. Ein neues
// Modell ohne Eintrag lässt den Test fehlschlagen.
//
// Teil 2 (nur mit Datenbank): Zwei Praxen mit Daten in jeder Tabelle. Eine wird gelöscht: Von ihr bleibt keine Zeile,
// die andere ist danach genau wie vorher. Dazu: Abbruch bei falschem Namen und bei Verweisen zwischen Praxen (beide Richtungen),
// abgelaufene Demo-Praxen, das Skript selbst.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { Prisma, type PrismaClient } from "@prisma/client";
import { resolveDatabaseUrls } from "./databaseUrl";
import {
  LoeschAbbruch,
  OHNE_PRAXISBEZUG,
  SCHRITTE,
  argumenteLesen,
  VOR_DEM_VERSAND,
  bestaetigungText,
  datenbankZiel,
  fremdeVerweise,
  fremdschluessel,
  praxisLoeschen,
  praxisZaehlen,
  probelaufText,
  uebersichtText,
  zeitpunktUtc,
  type FremderVerweis,
  type LoeschErgebnis,
} from "./praxisLoeschen";

// Vor allen Importen lesen: @prisma/client lädt beim Import die Datei .env nach. Ohne ausdrücklich gesetzte
// DATABASE_URL läuft nur Teil 1, wie bei den anderen Tests mit Datenbank.
const MIT_DB = vi.hoisted(() => !!process.env.DATABASE_URL);
const MODELLE = Prisma.dmmf.datamodel.models;
const IN_SCHRITTEN = new Set<string>(SCHRITTE.map((s) => s.modell));
const OHNE = new Set<string>(Object.keys(OHNE_PRAXISBEZUG));

/**
 * Laut Schema mit Bezug zu einer Praxis: ein Feld, dessen Name nach einer Kennung der Praxis klingt (practiceId, praxisId,
 * praxisKennung …; nicht Lead.practiceName, das ist ein Freitext der Anfrage),
 * oder irgendeine Beziehung zu einem Modell mit Bezug, in jeder Richtung: Fremdschlüssel im Modell selbst, Fremdschlüssel
 * auf der anderen Seite (z. B. Practice.logoId → Logo) und n:m-Beziehungen ohne Fremdschlüssel (Practice[] ↔ Tag[]).
 * Prisma verlangt das Gegenfeld auf beiden Seiten einer Beziehung; deshalb sieht jedes Modell seine Beziehungen.
 */
function mitPraxisbezug(): Set<string> {
  const mit = new Set<string>(["Practice"]);
  for (let neu = true; neu; ) {
    neu = false;
    for (const m of MODELLE) {
      if (mit.has(m.name)) continue;
      const bezug = m.fields.some((f) => (f.kind === "scalar" && /^(prax|practi)\w*(id|kennung|key|ref)$/i.test(f.name)) || (f.kind === "object" && mit.has(f.type)));
      if (bezug) {
        mit.add(m.name);
        neu = true;
      }
    }
  }
  return mit;
}

describe("Abgleich mit dem Schema", () => {
  it("jedes Modell ist eingeordnet: in SCHRITTE (wird gelöscht) oder in OHNE_PRAXISBEZUG (mit Grund)", () => {
    const fehlt = MODELLE.map((m) => m.name).filter((n) => !IN_SCHRITTEN.has(n) && !OHNE.has(n));
    expect(fehlt, `Neues Modell nicht eingeordnet: ${fehlt.join(", ")}. In lib/praxisLoeschen.ts in SCHRITTE oder OHNE_PRAXISBEZUG eintragen.`).toEqual([]);
    const beides = MODELLE.map((m) => m.name).filter((n) => IN_SCHRITTEN.has(n) && OHNE.has(n));
    expect(beides, "in beiden Listen").toEqual([]);
    for (const [modell, grund] of Object.entries(OHNE_PRAXISBEZUG)) expect(grund!.length, modell).toBeGreaterThan(20);
  });

  it("die Listen nennen nur Modelle, die es gibt, und keins doppelt", () => {
    const namen = new Set(MODELLE.map((m) => m.name));
    expect([...IN_SCHRITTEN, ...OHNE].filter((n) => !namen.has(n))).toEqual([]);
    expect(SCHRITTE.length).toBe(IN_SCHRITTEN.size);
  });

  it("OHNE_PRAXISBEZUG ist eine feste Liste: Jede Erweiterung steht ausdrücklich hier im Test", () => {
    // Ein neues Modell, das beim Löschen einer Praxis stehen bleiben soll, wird hier mit Begründung im Code ergänzt.
    // Die Schemaprüfung unten erkennt nicht jede denkbare Art von Bezug (etwa eine Kennung unter einem fremden Namen).
    expect(Object.keys(OHNE_PRAXISBEZUG).sort()).toEqual(["AmtlicheLeistung", "ApiClient", "Lead", "LexikonEntry"]);
  });

  it("jedes Modell mit Bezug zu einer Praxis wird gelöscht, keins ohne Bezug", () => {
    const mit = mitPraxisbezug();
    expect([...mit].filter((n) => !IN_SCHRITTEN.has(n)), "Bezug zur Praxis, aber nicht in SCHRITTE").toEqual([]);
    expect([...IN_SCHRITTEN].filter((n) => !mit.has(n)), "in SCHRITTE, aber laut Schema ohne Bezug zur Praxis").toEqual([]);
    expect([...OHNE].filter((n) => mit.has(n)), "in OHNE_PRAXISBEZUG, hat aber Bezug zur Praxis").toEqual([]);
  });

  it("Reihenfolge: erst die Zeile, die auf eine andere zeigt, dann die andere; die Praxis zuletzt", () => {
    const fks = fremdschluessel();
    // Zeigt, dass das Schema wirklich gelesen wurde (heute gut 50 Fremdschlüssel zwischen diesen Tabellen)
    expect(fks.length).toBeGreaterThan(40);
    const stelle = (n: string) => SCHRITTE.findIndex((s) => s.modell === n);
    const falsch = fks.filter((f) => f.von !== f.nach && stelle(f.von) >= stelle(f.nach)).map((f) => `${f.von}.${f.feld} → ${f.nach}`);
    expect(falsch, "muss vor dem Ziel gelöscht werden").toEqual([]);
    expect(SCHRITTE[SCHRITTE.length - 1].modell).toBe("Practice");
  });

  it("geleert statt gelöscht werden nur Felder, die leer sein dürfen", () => {
    for (const s of SCHRITTE.filter((x) => x.leeren)) {
      const m = MODELLE.find((x) => x.name === s.modell)!;
      for (const feld of Object.keys(s.leeren!)) expect(m.fields.find((f) => f.name === feld)?.isRequired, `${s.modell}.${feld}`).toBe(false);
    }
  });
});

describe("Aufruf des Skripts", () => {
  it("ohne --ausfuehren ist es ein Probelauf", () => {
    expect(argumenteLesen(["--praxis", "cabc123"])).toEqual({ praxisId: "cabc123", ausfuehren: false });
  });
  const loeschen = ["--praxis", "cabc123", "--ausfuehren", "--datenbank", "db.example.org:5432/app", "--bestaetigen", "Praxis Dr. Muster", "--sicherung-tage", "7"];
  it("--ausfuehren braucht Datenbank, Namen und Tage der Sicherungen", () => {
    expect(argumenteLesen(loeschen)).toEqual({ praxisId: "cabc123", ausfuehren: true, datenbank: "db.example.org:5432/app", bestaetigen: "Praxis Dr. Muster", sicherungTage: 7 });
    for (const weg of ["--datenbank", "--bestaetigen", "--sicherung-tage"]) {
      const i = loeschen.indexOf(weg);
      expect(argumenteLesen([...loeschen.slice(0, i), ...loeschen.slice(i + 2)]), weg).toHaveProperty("fehler");
    }
    for (const tage of ["0", "TAGE", "7.5", "-3", "366", "1000"]) {
      expect(argumenteLesen([...loeschen.slice(0, -1), tage]), tage).toHaveProperty("fehler");
    }
  });
  it("lehnt fehlende, doppelte und unbekannte Angaben ab", () => {
    for (const argv of [
      [],
      ["--praxis"],
      ["--praxis", "--ausfuehren"],
      ["--praxis", "a", "--praxis", "b"],
      ["--praxis", "a", "--loeschen"],
      ["--praxis", "a", "--bestaetigen", "X"],
      ["--praxis", "a", "--datenbank", "x:1/y"],
      ["--praxis", "a", "--sicherung-tage", "7"],
      [...loeschen, "--ausfuehren"],
      [...loeschen, "--datenbank", "x:1/y"],
    ]) {
      expect(argumenteLesen(argv), argv.join(" ")).toHaveProperty("fehler");
    }
  });
  it("zeigt die Datenbank ohne Benutzer und Passwort", () => {
    const ziel = datenbankZiel("postgresql://nutzer:geheim@db.example.org:5432/app?sslmode=require");
    expect(ziel).toBe("db.example.org:5432/app");
  });
});

describe("Texte", () => {
  const ergebnis: LoeschErgebnis = {
    praxis: { id: "cpraxis0001", name: "Zahnarztpraxis Dr. O'Neill", isDemo: false },
    zeitpunkt: new Date("2026-11-17T14:05:09.123Z"),
    zeilen: SCHRITTE.map((s, i) => ({ modell: s.modell, text: s.text, anzahl: i + 1, geleert: !!s.leeren })),
  };
  it("Zeitpunkt in UTC", () => {
    expect(zeitpunktUtc(ergebnis.zeitpunkt)).toBe("17.11.2026 um 14:05:09 Uhr (UTC)");
  });
  it("Bestätigung: Zeitpunkt, Praxis, Kennung, Zahl je Tabelle, Sicherungen mit Dauer und Datum, Zeilen zum Ausfüllen", () => {
    const text = bestaetigungText(ergebnis, { sicherungTage: 30 });
    expect(text).toContain("17.11.2026 um 14:05:09 Uhr (UTC)");
    expect(text).toContain("Praxis: Zahnarztpraxis Dr. O'Neill");
    expect(text).toContain("cpraxis0001");
    for (const z of ergebnis.zeilen) expect(text).toContain(`${z.text}: ${z.anzahl}`);
    expect(text).toContain("Sicherungen der Datenbank 30 Tage auf");
    expect(text).toContain("Mit Ablauf des 17.12.2026 (UTC) sind sie auch dort gelöscht.");
    expect(bestaetigungText(ergebnis, { sicherungTage: 1 })).toContain("1 Tag auf");
    // Branches und E-Mail-Dienst sieht das Skript nicht: Der Betreiber füllt sie vor dem Versand aus.
    expect(text).toContain(`(Branches): ${VOR_DEM_VERSAND}`);
    expect(text).toContain(`E-Mail-Dienst: ${VOR_DEM_VERSAND}`);
    // Über die Fehlereinträge nur, was die Bereinigung leistet, keine Zusage „keine Angaben zu Personen“
    expect(text).not.toMatch(/keine Angaben zu Personen/);
    expect(text).toContain("vor dem Speichern bereinigt");
    const geloescht = ergebnis.zeilen.filter((z) => !z.geleert).reduce((n, z) => n + z.anzahl, 0);
    expect(text).toContain(`Zusammen: ${geloescht}`);
  });
  it("Probelauf nennt den Befehl zum Löschen mit Datenbank und Namen, sicher für die Shell", () => {
    expect(probelaufText(ergebnis.praxis, "localhost:5432/test")).toContain(
      `--praxis cpraxis0001 --ausfuehren --datenbank 'localhost:5432/test' --bestaetigen 'Zahnarztpraxis Dr. O'\\''Neill' --sicherung-tage TAGE`,
    );
    const uebersicht = uebersichtText({ ziel: "localhost:5432/test", praxis: ergebnis.praxis, zeilen: ergebnis.zeilen, verweise: [] });
    for (const s of SCHRITTE) expect(uebersicht).toContain(s.modell);
  });
});

// ---------------------------------------------------------------------------
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAUF = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const inTagen = (n: number, stunde = 9) => {
  const d = new Date(Date.now() + n * 864e5);
  d.setUTCHours(stunde, 0, 0, 0);
  return d;
};
type Wo = Record<string, unknown>;
type Tabelle = { findMany(a: unknown): Promise<Wo[]>; count(a: unknown): Promise<number> };

describe.skipIf(!MIT_DB)("Löschen in der Datenbank", () => {
  let prisma: PrismaClient;
  const angelegt: string[] = [];
  const abdruecke: string[] = [];
  const tabelle = (modell: string) => (prisma as unknown as Record<string, Tabelle>)[modell[0].toLowerCase() + modell.slice(1)];
  const pk = (modell: string) => {
    const m = MODELLE.find((x) => x.name === modell)!;
    return m.primaryKey?.fields ?? m.fields.filter((f) => f.isId).map((f) => f.name);
  };

  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
  });
  afterAll(async () => {
    if (!prisma) return;
    for (const id of angelegt) await praxisLoeschen(prisma, id).catch(() => {});
    await prisma.fehlerEintrag.deleteMany({ where: { fingerabdruck: { in: abdruecke } } });
  }, 60_000);

  /** Praxis mit mindestens einer Zeile in jeder Tabelle aus SCHRITTE. Optional mit Verweisen auf globale Einträge. */
  async function praxisAnlegen(k: string, opts: { isDemo?: boolean; demoExpiresAt?: Date; globalKatalog?: string; globalVorlage?: string } = {}) {
    const m = `Pl${LAUF}${k}`;
    const ml = m.toLowerCase();
    const p = (await prisma.practice.create({ data: { name: `Praxis ${m}`, isDemo: !!opts.isDemo, demoExpiresAt: opts.demoExpiresAt } })).id;
    angelegt.push(p);
    const leitung = await prisma.user.create({ data: { email: `leitung-${ml}@pruef.invalid`, passwordHash: "x", name: `Leitung ${m}`, role: "admin", practiceId: p } });
    const team = await prisma.user.create({ data: { email: `team-${ml}@pruef.invalid`, passwordHash: "x", name: `Team ${m}`, practiceId: p } });
    await prisma.emailVerificationToken.create({ data: { userId: team.id, tokenHash: sha(`${m}-ev`), expiresAt: inTagen(1) } });
    await prisma.passwordResetToken.create({ data: { userId: leitung.id, tokenHash: sha(`${m}-pr`), expiresAt: inTagen(1) } });
    await prisma.staffInvite.create({ data: { practiceId: p, email: `neu-${ml}@pruef.invalid`, tokenHash: sha(`${m}-inv`), expiresAt: inTagen(7) } });
    const patient = await prisma.patient.create({
      data: { practiceId: p, firstName: `Vor${m}`, lastName: `Nach${m}`, birthDate: new Date("1980-05-06T00:00:00Z"), behandlerId: leitung.id, email: `patient-${ml}@pruef.invalid`, notes: `Notiz ${m}` },
    });
    await prisma.portalPruefung.create({ data: { linkHash: sha(`${m}-portal`), patientId: patient.id, fehler: 1 } });
    const ort = await prisma.location.create({ data: { practiceId: p, name: `Standort ${m}` } });
    await prisma.userLocation.create({ data: { userId: team.id, locationId: ort.id } });
    const katalog = await prisma.serviceCatalogItem.create({ data: { practiceId: p, system: "SONSTIGES", code: `X-${m}`, title: `Leistung ${m}`, category: "Sonstiges" } });
    const vorlage = await prisma.serviceTemplate.create({ data: { practiceId: p, name: `Vorlage ${m}` } });
    await prisma.serviceTemplateItem.create({ data: { templateId: vorlage.id, catalogItemId: katalog.id } });
    if (opts.globalKatalog) await prisma.serviceTemplateItem.create({ data: { templateId: vorlage.id, catalogItemId: opts.globalKatalog, position: 1 } });
    const bericht = await prisma.report.create({
      data: { practiceId: p, patientId: patient.id, authorId: leitung.id, type: "BEFUND", serviceSummary: `Zusammenfassung ${m}`, serviceTemplateId: vorlage.id, generatedText: `Text ${m}` },
    });
    await prisma.reportRevision.create({ data: { reportId: bericht.id, text: `Alter Text ${m}`, editedById: team.id } });
    await prisma.reportServiceEntry.create({ data: { reportId: bericht.id, catalogItemId: katalog.id } });
    if (opts.globalKatalog || opts.globalVorlage) {
      const zweiter = await prisma.report.create({
        data: { practiceId: p, patientId: patient.id, authorId: team.id, type: "BEFUND", serviceSummary: `Global ${m}`, serviceTemplateId: opts.globalVorlage ?? null },
      });
      if (opts.globalKatalog) await prisma.reportServiceEntry.create({ data: { reportId: zweiter.id, catalogItemId: opts.globalKatalog } });
    }
    const vorschlag = await prisma.treatmentProposal.create({
      data: { practiceId: p, patientId: patient.id, authorId: leitung.id, reportId: bericht.id, input: {}, choices: {}, baseTotalCent: 100, planTotalCent: 200, eigenanteilCent: 100, letterText: `Brief ${m}` },
    });
    await prisma.leseLink.create({ data: { proposalId: vorschlag.id, tokenHash: sha(`${m}-lese`), expiresAt: inTagen(7) } });
    await prisma.zweitmeinung.create({ data: { practiceId: p, proposalId: vorschlag.id, leistung: `Zweitmeinung ${m}`, eigenanteilCent: 100 } });
    await prisma.invoice.create({ data: { practiceId: p, patientId: patient.id, proposalId: vorschlag.id, number: `R-${m}`, title: `Rechnung ${m}`, amountCent: 100, dueDate: inTagen(14) } });
    const termin = await prisma.appointment.create({ data: { practiceId: p, patientId: patient.id, locationId: ort.id, start: inTagen(3), reason: `Termin ${m}` } });
    await prisma.terminRueckmeldung.create({ data: { practiceId: p, appointmentId: termin.id, stufe: 5, text: `Gut ${m}` } });
    const schluessel = await prisma.connectorKey.create({ data: { practiceId: p, name: `Schlüssel ${m}`, keyHash: sha(`${m}-key`), keyPrefix: "sor_conn_pruef" } });
    await prisma.gdtAuslieferung.create({ data: { practiceId: p, art: "bericht", refId: bericht.id, keyId: schluessel.id } });
    await prisma.launchToken.create({ data: { practiceId: p, patientId: patient.id, tokenHash: sha(`${m}-launch`), expiresAt: inTagen(1) } });
    await prisma.anamnesisForm.create({ data: { practiceId: p, patientId: patient.id, tokenHash: sha(`${m}-anam`), expiresAt: inTagen(7) } });
    await prisma.patientEntry.create({ data: { practiceId: p, patientId: patient.id, art: "NOTIZ", text: `Eintrag ${m}` } });
    await prisma.patientDocument.create({ data: { practiceId: p, patientId: patient.id, name: `Dokument-${m}.txt`, mime: "text/plain", size: 3, data: Buffer.from("abc") } });
    await prisma.modellMarkierung.create({ data: { practiceId: p, patientId: patient.id, modell: "gebiss", teil: "16", notiz: `Markierung ${m}` } });
    await prisma.kalenderBelegung.create({ data: { practiceId: p, start: inTagen(2), ende: inTagen(2, 10) } });
    await prisma.eingang.create({ data: { practiceId: p, patientId: patient.id, art: "VORSCHLAG_INTERESSE", entityId: vorschlag.id } });
    await prisma.kurzcheck.create({ data: { practiceId: p, patientId: patient.id, antworten: {} } });
    await prisma.warteliste.create({ data: { practiceId: p, patientId: patient.id, anlass: `Warten ${m}` } });
    await prisma.terminanfrage.create({
      data: { practiceId: p, firstName: `Neu${m}`, lastName: `Anfrage${m}`, birthDate: new Date("1990-01-01T00:00:00Z"), anlass: "Kontrolle", start: inTagen(9), minutes: 30, reserviertBis: inTagen(1), datenschutzAt: new Date() },
    });
    await prisma.empfangParkung.create({ data: { id: sha(`${m}-park`), practiceId: p, expiresAt: inTagen(1) } });
    await prisma.auditLog.create({ data: { practiceId: p, userId: leitung.id, userName: leitung.name, action: "pruefung", summary: `Protokoll ${m}` } });
    const abdruck = sha(`${m}-fehler`);
    abdruecke.push(abdruck);
    await prisma.fehlerEintrag.create({ data: { fingerabdruck: abdruck, quelle: "server", ort: "/pruefung", meldung: "Prüfung", practiceId: p } });
    return { id: p, name: `Praxis ${m}`, marke: m, abdruck, nutzer: leitung.id, patient: patient.id, personen: [`Vor${m}`, `Nach${m}`, `Leitung ${m}`, `Team ${m}`, `Neu${m}`] };
  }

  /** Alle Zeilen der Praxis je Tabelle als Text, zum Vergleich vorher/nachher. */
  async function abbild(praxisId: string): Promise<Record<string, string>> {
    const aus: Record<string, string> = {};
    for (const s of SCHRITTE) aus[s.modell] = JSON.stringify(await tabelle(s.modell).findMany({ where: s.wo(praxisId), orderBy: pk(s.modell).map((f) => ({ [f]: "asc" })) }));
    return aus;
  }
  /** Primärschlüssel aller Zeilen der Praxis je Tabelle. */
  async function schluesselJeTabelle(praxisId: string): Promise<Record<string, Wo[]>> {
    const aus: Record<string, Wo[]> = {};
    for (const s of SCHRITTE) aus[s.modell] = await tabelle(s.modell).findMany({ where: s.wo(praxisId), select: Object.fromEntries(pk(s.modell).map((f) => [f, true])) });
    return aus;
  }

  it("löscht Praxis A vollständig; Praxis B und globale Einträge bleiben genau wie vorher", async () => {
    const globalKatalog = (await prisma.serviceCatalogItem.findFirst({ where: { practiceId: null }, select: { id: true } }))?.id;
    const globalVorlage = (await prisma.serviceTemplate.findFirst({ where: { practiceId: null }, select: { id: true } }))?.id;
    const A = await praxisAnlegen("A", { globalKatalog, globalVorlage });
    const B = await praxisAnlegen("B");

    const vorher = await praxisZaehlen(prisma, A.id);
    expect(vorher.filter((z) => z.anzahl === 0).map((z) => z.modell), "Testdaten fehlen in diesen Tabellen").toEqual([]);
    expect(await fremdeVerweise(prisma, A.id)).toEqual([]);
    const abbildB = await abbild(B.id);
    const zeilenA = await schluesselJeTabelle(A.id);

    // Falscher Name (auch nur ein Leerzeichen mehr): nichts gelöscht
    await expect(praxisLoeschen(prisma, A.id, { name: `${A.name} ` })).rejects.toBeInstanceOf(LoeschAbbruch);
    expect(await praxisZaehlen(prisma, A.id)).toEqual(vorher);

    const ergebnis = await praxisLoeschen(prisma, A.id, { name: A.name });
    expect(ergebnis.praxis).toEqual({ id: A.id, name: A.name, isDemo: false });
    // Dieselben Zahlen wie im Probelauf: Keine Zeile ging per Löschweitergabe verloren, ohne gezählt zu werden.
    expect(ergebnis.zeilen).toEqual(vorher);

    // Von A bleibt in keiner Tabelle eine Zeile, auch nicht über die Primärschlüssel gesucht
    expect((await praxisZaehlen(prisma, A.id)).filter((z) => z.anzahl > 0)).toEqual([]);
    for (const s of SCHRITTE.filter((x) => !x.leeren)) {
      expect(await tabelle(s.modell).count({ where: { OR: zeilenA[s.modell] } }), s.modell).toBe(0);
    }
    // Fehlereintrag bleibt, ohne Kennung der Praxis
    expect(await prisma.fehlerEintrag.findUnique({ where: { fingerabdruck: A.abdruck } })).toMatchObject({ practiceId: null });
    // Globale Positionen und Vorlagen bleiben
    if (globalKatalog) expect(await prisma.serviceCatalogItem.count({ where: { id: globalKatalog } })).toBe(1);
    if (globalVorlage) expect(await prisma.serviceTemplate.count({ where: { id: globalVorlage } })).toBe(1);

    // B unverändert, Zeile für Zeile
    const jetztB = await abbild(B.id);
    expect(Object.keys(abbildB).filter((k) => abbildB[k] !== jetztB[k]), "Daten der Praxis B verändert").toEqual([]);
    expect(JSON.parse(jetztB.Patient)).toHaveLength(1);

    // Bestätigung: nur Zahlen, keine Angaben zu Personen
    const text = bestaetigungText(ergebnis, { sicherungTage: 7 });
    expect(text).toContain(A.id);
    for (const wort of A.personen) expect(text).not.toContain(wort);
  }, 60_000);

  it("bricht ohne Änderung ab, wenn Daten einer anderen Praxis auf die Praxis zeigen", async () => {
    const C = await praxisAnlegen("C");
    const D = await praxisAnlegen("D");
    // Bericht der Praxis D mit einem Konto der Praxis C als Verfasser: Darf es nicht geben, das Löschen müsste ihn anfassen.
    const fremd = await prisma.report.create({ data: { practiceId: D.id, patientId: D.patient, authorId: C.nutzer, type: "BEFUND", serviceSummary: "fremd" } });
    const vorher = await praxisZaehlen(prisma, C.id);
    const abbildD = await abbild(D.id);
    const erwartet = [{ von: "Report", feld: "author", nach: "User", richtung: "hinein", anzahl: 1 }];
    expect(await fremdeVerweise(prisma, C.id)).toEqual(erwartet);
    const fehler = await praxisLoeschen(prisma, C.id, { name: C.name }).catch((e: unknown) => e);
    expect(fehler).toBeInstanceOf(LoeschAbbruch);
    expect((fehler as LoeschAbbruch).verweise).toEqual(erwartet);
    expect(await praxisZaehlen(prisma, C.id)).toEqual(vorher);
    expect(await abbild(D.id)).toEqual(abbildD);
    await prisma.report.delete({ where: { id: fremd.id } });
    expect(await fremdeVerweise(prisma, C.id)).toEqual([]);
  }, 60_000);

  it("bricht auch ab, wenn Zeilen der Praxis auf Daten einer anderen Praxis zeigen (umgekehrte Richtung)", async () => {
    const G = await praxisAnlegen("G");
    const H = await praxisAnlegen("H");
    // Akteneintrag der Praxis G am Patienten der Praxis H: Er wäre bei H sichtbar und würde mit G gelöscht.
    const eintrag = await prisma.patientEntry.create({ data: { practiceId: G.id, patientId: H.patient, art: "NOTIZ", text: "fremd" } });
    const erwartetG: FremderVerweis[] = [{ von: "PatientEntry", feld: "patient", nach: "Patient", richtung: "hinaus", anzahl: 1 }];
    expect(await fremdeVerweise(prisma, G.id)).toEqual(erwartetG);
    expect(await fremdeVerweise(prisma, H.id)).toEqual([{ von: "PatientEntry", feld: "patient", nach: "Patient", richtung: "hinein", anzahl: 1 }]);
    const vorher = await praxisZaehlen(prisma, G.id);
    const fehler = await praxisLoeschen(prisma, G.id, { name: G.name }).catch((e: unknown) => e);
    expect(fehler).toBeInstanceOf(LoeschAbbruch);
    expect((fehler as LoeschAbbruch).verweise).toEqual(erwartetG);
    expect(await praxisZaehlen(prisma, G.id)).toEqual(vorher);
    expect(await prisma.patientEntry.count({ where: { id: eintrag.id } })).toBe(1);
    const uebersicht = uebersichtText({ ziel: "x", praxis: { id: G.id, name: G.name, isDemo: false }, zeilen: vorher, verweise: erwartetG });
    expect(uebersicht).toContain("Zeile(n) dieser Praxis zeigen auf Daten einer anderen Praxis");
    await prisma.patientEntry.delete({ where: { id: eintrag.id } });
    expect(await fremdeVerweise(prisma, G.id)).toEqual([]);
  }, 60_000);

  it("abgelaufene Demo-Praxen löscht der tägliche Lauf mit derselben Liste", async () => {
    // Ablauf weit in der Vergangenheit, damit der Aufruf nur diese Praxis trifft und keine anderen Demo-Praxen der Datenbank.
    const E = await praxisAnlegen("E", { isDemo: true, demoExpiresAt: new Date("1970-01-01T00:00:01Z") });
    const { cleanupExpiredDemos } = await import("./demo");
    expect(await cleanupExpiredDemos(new Date("1970-01-01T00:00:02Z"))).toBe(1);
    expect((await praxisZaehlen(prisma, E.id)).filter((z) => z.anzahl > 0)).toEqual([]);
    expect(await prisma.fehlerEintrag.findUnique({ where: { fingerabdruck: E.abdruck } })).toMatchObject({ practiceId: null });
  }, 60_000);

  it("gleichzeitiges Löschen derselben Praxis: ein Aufruf löscht, der andere findet keine Praxis mehr, keine Scheinverweise", async () => {
    const G = await praxisAnlegen("P", { isDemo: true, demoExpiresAt: new Date("1970-01-01T00:00:01Z") });
    const ergebnisse = await Promise.allSettled([praxisLoeschen(prisma, G.id), praxisLoeschen(prisma, G.id)]);
    expect(ergebnisse.filter((e) => e.status === "fulfilled")).toHaveLength(1);
    const abgelehnt = ergebnisse.find((e) => e.status === "rejected") as PromiseRejectedResult;
    expect(abgelehnt.reason).toBeInstanceOf(LoeschAbbruch);
    expect((abgelehnt.reason as LoeschAbbruch).praxisFehlt).toBe(true);
    expect((abgelehnt.reason as LoeschAbbruch).verweise).toEqual([]);
    // Zwei Läufe der Demo-Löschung zugleich: eine schon gelöschte Praxis zählt nicht als Fehler.
    const H = await praxisAnlegen("Q", { isDemo: true, demoExpiresAt: new Date("1970-01-01T00:00:01Z") });
    const { abgelaufeneDemosLoeschen } = await import("./demo");
    const jetzt = new Date("1970-01-01T00:00:02Z");
    const [a, b] = await Promise.all([abgelaufeneDemosLoeschen(jetzt, { hoechstens: 3 }), abgelaufeneDemosLoeschen(jetzt, { hoechstens: 3 })]);
    expect(a.geloescht + b.geloescht).toBe(1);
    expect([...a.fehler, ...b.fehler]).toEqual([]);
    expect(await prisma.practice.count({ where: { id: H.id } })).toBe(0);
  }, 60_000);

  it("nächtlicher Lauf: Eine Demo-Praxis, die sich nicht löschen lässt, hält den Lauf nicht an und kommt ins Fehlerlog", async () => {
    const J = await praxisAnlegen("J", { isDemo: true, demoExpiresAt: new Date("1970-01-01T00:00:01Z") });
    const K = await praxisAnlegen("K");
    // Bericht der Praxis K mit einem Konto der Demo-Praxis J als Verfasser: Das Löschen von J bricht ab.
    const fremd = await prisma.report.create({ data: { practiceId: K.id, patientId: K.patient, authorId: J.nutzer, type: "BEFUND", serviceSummary: "fremd" } });
    const { aufraeumen } = await import("./aufraeumen");
    // Zeitpunkt weit in der Vergangenheit: Die übrigen Fristen treffen dann keine Zeile der Datenbank.
    const jetzt = new Date("1970-01-01T00:00:02Z");
    const ort = { ort: "/api/cron/aufraeumen", createdAt: jetzt };
    try {
      expect(await aufraeumen(jetzt)).toMatchObject({ demos: 0, demosFehler: 1 });
      expect(await prisma.practice.count({ where: { id: J.id } })).toBe(1);
      expect(await prisma.fehlerEintrag.count({ where: ort })).toBe(1);
      await prisma.report.delete({ where: { id: fremd.id } });
      expect(await aufraeumen(jetzt)).toMatchObject({ demos: 1, demosFehler: 0 });
      expect(await prisma.practice.count({ where: { id: J.id } })).toBe(0);
    } finally {
      await prisma.report.deleteMany({ where: { id: fremd.id } });
      await prisma.fehlerEintrag.deleteMany({ where: ort });
    }
  }, 60_000);

  it("Skript: ohne DATABASE_URL nichts, Probelauf löscht nichts, falsche Datenbank oder falscher Name bricht ab, richtiger Aufruf löscht", async () => {
    const F = await praxisAnlegen("F");
    const tsx = path.join(WURZEL, "node_modules", ".bin", "tsx");
    const skript = path.join(WURZEL, "scripts", "praxis-loeschen.ts");
    const lauf = (args: string[], env: NodeJS.ProcessEnv = process.env) =>
      new Promise<{ code: number; aus: string; fehler: string }>((resolve) =>
        execFile(tsx, [skript, ...args], { cwd: WURZEL, env, timeout: 60_000 }, (e, aus, fehler) =>
          resolve({ code: e ? (typeof e.code === "number" ? e.code : -1) : 0, aus: String(aus), fehler: String(fehler) }),
        ),
      );
    const vorher = await praxisZaehlen(prisma, F.id);
    const allesAusgegeben: string[] = [];
    const ziel = datenbankZiel(resolveDatabaseUrls({ DATABASE_URL: process.env.DATABASE_URL })!.direct);
    const loeschen = (name: string, db = ziel) => ["--praxis", F.id, "--ausfuehren", "--datenbank", db, "--bestaetigen", name, "--sicherung-tage", "7"];

    const { DATABASE_URL: _weg, ...ohneDb } = process.env;
    const ohne = await lauf(["--praxis", F.id], ohneDb);
    expect(ohne.code).toBe(2);
    expect(ohne.fehler).toContain("DATABASE_URL fehlt");

    const probe = await lauf(["--praxis", F.id]);
    allesAusgegeben.push(probe.aus, probe.fehler);
    expect(probe.code, probe.fehler).toBe(0);
    expect(probe.aus).toContain(`Praxis:      ${F.name}`);
    expect(probe.aus).toContain("Probelauf: Es wurde nichts gelöscht.");
    expect(probe.aus).toMatch(/Patient\s+1\s+Patientinnen und Patienten/);
    expect(probe.aus).toContain(`--datenbank '${ziel}'`);
    expect(await praxisZaehlen(prisma, F.id)).toEqual(vorher);

    // Andere Datenbank (z. B. ein Branch mit gleichen Kennungen und Namen): bricht vor dem Lesen ab
    const andereDb = await lauf(loeschen(F.name, `anderer-${ziel}`));
    allesAusgegeben.push(andereDb.aus, andereDb.fehler);
    expect(andereDb.code).toBe(1);
    expect(andereDb.fehler).toContain("--datenbank stimmt nicht");
    expect(await praxisZaehlen(prisma, F.id)).toEqual(vorher);

    const falsch = await lauf(loeschen(F.name.toUpperCase()));
    allesAusgegeben.push(falsch.aus, falsch.fehler);
    expect(falsch.code).toBe(1);
    expect(falsch.fehler).toContain("Nichts gelöscht");
    expect(await praxisZaehlen(prisma, F.id)).toEqual(vorher);

    const echt = await lauf(loeschen(F.name));
    allesAusgegeben.push(echt.aus, echt.fehler);
    expect(echt.code, echt.fehler).toBe(0);
    expect(echt.aus).toContain("Bestätigung der Löschung");
    expect(echt.aus).toContain("Uhr (UTC)");
    expect(echt.aus).toContain("- Patientinnen und Patienten: 1");
    expect(echt.aus).toContain("Sicherungen der Datenbank 7 Tage auf");
    expect(echt.aus).toContain("Vor dem Versand");
    expect((await praxisZaehlen(prisma, F.id)).filter((z) => z.anzahl > 0)).toEqual([]);

    // Nie Namen von Patienten, Konten oder Anfragenden in der Ausgabe
    const alles = allesAusgegeben.join("\n");
    for (const wort of F.personen) expect(alles).not.toContain(wort);
  }, 120_000);
});
