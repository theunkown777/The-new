// Trennung der Praxen (Mandantentrennung), automatisch geprüft.
//
// Teil 1 (läuft immer): Jede Datei app/api/**/route.ts steht in lib/mandantentrennung.matrix.ts
// und ist eingeordnet. Eine neue Schnittstelle ohne Eintrag lässt den Test fehlschlagen.
//
// Teil 2 (nur mit Datenbank): Zwei Praxen A und B mit je einem vollen Datensatz. Der Test ruft die
// Route-Funktionen ohne Server auf (Sitzung und Cookies nachgebildet) und prüft:
//   - ohne Sitzung: 401
//   - als Praxis A mit IDs der Praxis B: 401/403/404/409, keine Daten von B in der Antwort,
//     Datensatz der Praxis B danach unverändert
//   - Gegenprobe: derselbe Aufruf mit eigenen IDs (frische Praxis C) endet nicht mit „nicht gefunden“
//   - Listen und Suchen: Antwort enthält eigene Daten und nichts von B
//   - Routen ohne ID: Antwort enthält nichts von B, B bleibt unverändert
//   - Patienten-Links, Empfangsmodus, Connector: mit dem eigenen Zugang kommt man nicht an Daten von B
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATRIX, SITZUNGS_BELEGE, type Datensatz, type Eintrag, type Fall, type Liste, type Methode } from "./mandantentrennung.matrix";

// Keine Mail, kein KI-Dienst, kein Zahlungsdienst, kein fremder Zähler: Die Schlüssel werden beim Laden
// der Module gelesen, deshalb hier vor allen Importen leeren.
vi.hoisted(() => {
  for (const k of Object.keys(process.env)) {
    if (/^(ANTHROPIC_API_KEY|RESEND_API_KEY|STRIPE_.*|CRON_SECRET|SUPPORT_TEAM_EMAILS)$/.test(k) || /(KV_REST_API|UPSTASH_REDIS_REST)_(URL|TOKEN)$/.test(k)) process.env[k] = "";
  }
  for (const k of ["ANTHROPIC_API_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_CLIENT_ID", "STRIPE_WEBHOOK_SECRET"]) process.env[k] = "";
  process.env.NEXTAUTH_URL ||= "http://localhost:3000";
  process.env.NEXTAUTH_SECRET ||= "nur-fuer-den-test";
});

type Sitzung = { user: { id: string; name: string; email: string; role: string; practiceId: string; practiceName: string } } | null;
let sitzung: Sitzung = null;
const jar = new Map<string, string>();
vi.mock("next-auth", () => ({ getServerSession: async () => sitzung }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    has: (n: string) => jar.has(n),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "10.9.0.1" }),
}));

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = path.join(WURZEL, "app", "api");
const METHODEN: Methode[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

function routenDateien(dir = API): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const voll = path.join(dir, e.name);
    if (e.isDirectory()) return routenDateien(voll);
    return e.name === "route.ts" ? [path.relative(API, voll).split(path.sep).join("/")] : [];
  }).sort();
}
const quelltext = (datei: string) => fs.readFileSync(path.join(API, datei), "utf8");
const methodenAusQuelle = (src: string): Methode[] =>
  METHODEN.filter((m) => new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(src));
const pfadNamen = (datei: string) => [...datei.matchAll(/\[([A-Za-z]+)\]/g)].map((m) => m[1]);

const DATEIEN = routenDateien();
const nachDatei = new Map(MATRIX.map((e) => [e.datei, e]));
const SITZUNG = MATRIX.filter((e) => e.art === "sitzung");
const MIT_FREMDEN_IDS = SITZUNG.filter((e) => e.faelle?.length);
const OHNE_ID = SITZUNG.filter((e) => !e.faelle?.length);
const LINKS = MATRIX.filter((e) => e.art === "oeffentlich" && e.faelle?.length);
const MIT_LISTEN = SITZUNG.filter((e) => e.listen?.length);

// ---------------------------------------------------------------------------
describe("Verzeichnis aller Schnittstellen", () => {
  it("jede Route-Datei ist eingeordnet (sonst: neue Schnittstelle nicht eingeordnet)", () => {
    const fehlt = DATEIEN.filter((d) => !nachDatei.has(d));
    expect(fehlt, `neue Schnittstelle nicht eingeordnet: ${fehlt.join(", ")}. Bitte in lib/mandantentrennung.matrix.ts eintragen.`).toEqual([]);
  });
  it("die Liste nennt keine Datei, die es nicht mehr gibt, und keine doppelt", () => {
    const weg = MATRIX.map((e) => e.datei).filter((d) => !DATEIEN.includes(d));
    expect(weg, `in der Liste, aber nicht mehr vorhanden: ${weg.join(", ")}`).toEqual([]);
    expect(MATRIX.length, "doppelte Einträge in der Liste").toBe(nachDatei.size);
  });
  it("jede Sitzungs-Route prüft die Sitzung im eigenen Quelltext", () => {
    const ohne = SITZUNG.filter((e) => !SITZUNGS_BELEGE.some((b) => quelltext(e.datei).includes(b))).map((e) => e.datei);
    expect(ohne, `ohne Sitzungsprüfung (${SITZUNGS_BELEGE.join(", ")}): ${ohne.join(", ")}`).toEqual([]);
  });
  it("jede öffentliche und jede Team-Route hat eine Begründung und einen Beleg im Quelltext", () => {
    for (const e of MATRIX.filter((x) => x.art !== "sitzung")) {
      expect(e.grund?.length ?? 0, `${e.datei}: Begründung fehlt`).toBeGreaterThan(15);
      expect(e.beleg, `${e.datei}: Beleg fehlt`).toBeTruthy();
      expect(quelltext(e.datei).includes(e.beleg!), `${e.datei}: Beleg „${e.beleg}“ steht nicht (mehr) in der Datei`).toBe(true);
    }
  });
  it("öffentliche Routen ohne eigene Sitzungsprüfung sind nicht versehentlich Praxis-Routen", () => {
    // Wer eine Sitzung prüft, gehört zu "sitzung" oder "team" (Ausnahme: /api/status zeigt dem Team mehr).
    const falsch = MATRIX.filter((e) => e.art === "oeffentlich" && e.datei !== "status/route.ts" && SITZUNGS_BELEGE.some((b) => quelltext(e.datei).includes(b))).map((e) => e.datei);
    expect(falsch).toEqual([]);
  });
  it("jede Sitzungs-Route mit einer ID im Pfad wird mit fremden IDs geprüft oder nennt einen Grund", () => {
    for (const e of SITZUNG) {
      const namen = pfadNamen(e.datei);
      if (!namen.length) continue;
      if (e.offen && !e.faelle?.length) continue;
      expect(e.faelle?.length ?? 0, `${e.datei}: kein Fall mit fremder ID und kein Feld offen`).toBeGreaterThan(0);
      for (const f of e.faelle!) for (const n of namen) expect(f.pfad?.[n], `${e.datei}: Pfad-Parameter ${n} ohne Zuordnung`).toBeTruthy();
      expect(e.faelle!.some((f) => Object.values(f.pfad ?? {}).some((v) => v.startsWith("B."))), `${e.datei}: kein Fall mit einer ID der fremden Praxis`).toBe(true);
    }
  });
  it("jede öffentliche Route mit einer ID neben dem Token wird mit fremden IDs geprüft oder nennt einen Grund", () => {
    const ZUGANG = ["token", "kennung", "nextauth"];
    for (const e of MATRIX.filter((x) => x.art === "oeffentlich")) {
      const ids = pfadNamen(e.datei).filter((n) => !ZUGANG.includes(n));
      if (!ids.length) continue;
      expect(e.faelle?.length ?? 0, `${e.datei}: ID im Pfad (${ids.join(", ")}), aber kein Fall mit fremder ID`).toBeGreaterThan(0);
      expect(e.faelle!.some((f) => ids.some((n) => f.pfad?.[n]?.startsWith("B."))), `${e.datei}: kein Fall mit einer ID der fremden Praxis`).toBe(true);
    }
  });
  it("wer offen angibt, nennt einen Grund in ganzen Worten", () => {
    for (const e of MATRIX.filter((x) => x.offen !== undefined)) expect(e.offen!.length, e.datei).toBeGreaterThan(30);
  });
});

// ---------------------------------------------------------------------------
type Ids = Record<Datensatz, string> & { marke: string; name: string; email: string; schluesselRoh: string };
type Wer = { A: Ids; B: Ids };
type PrismaClient = (typeof import("@/lib/prisma"))["prisma"];
let prisma: PrismaClient;
let modelle: { name: string; pk: string | null }[] = [];
let A: Ids, B: Ids;
let markenB: string[] = [];
let abbildB: Record<string, string> = {};
const angelegt: string[] = [];
const LAUF = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const inTagen = (n: number, stunde = 9) => { const d = new Date(Date.now() + n * 864e5); d.setUTCHours(stunde, 0, 0, 0); return d; };
const delegate = (name: string) => (prisma as unknown as Record<string, { findMany: (a: unknown) => Promise<unknown[]>; deleteMany: (a: unknown) => Promise<unknown> }>)[name[0].toLowerCase() + name.slice(1)];

/** Eine Praxis mit vollem Datensatz. Jeder Text trägt die Marke der Praxis, damit er in fremden Antworten auffällt. */
async function praxisAnlegen(k: string): Promise<Ids> {
  const marke = `Zq${LAUF}${k}`;
  const mail = marke.toLowerCase();
  const portalToken = `portal${marke}0123456789abcdef`;
  const linkToken = `link${marke}0123456789abcdef`;
  const schluesselRoh = `sor_conn_${marke}0123456789abcdef`;
  // Empfangs-PIN gesetzt, damit die Übergabe bis zur Prüfung des Patienten kommt.
  const p = (await prisma.practice.create({ data: { name: `Praxis ${marke}`, accountHolder: `Inhaber ${marke}`, empfangPinHash: bcrypt.hashSync("2580", 4) } })).id;
  angelegt.push(p);
  const nutzer = await prisma.user.create({ data: { email: `leitung-${mail}@pruef.invalid`, passwordHash: "x", name: `Leitung ${marke}`, role: "admin", practiceId: p, emailVerifiedAt: new Date() } });
  const mitarbeit = await prisma.user.create({ data: { email: `empfang-${mail}@pruef.invalid`, passwordHash: "x", name: `Empfang ${marke}`, role: "staff", practiceId: p } });
  const patient = await prisma.patient.create({
    data: {
      practiceId: p, firstName: `Vor${marke}`, lastName: `Nach${marke}`, birthDate: new Date("1980-05-06T00:00:00Z"), insuranceType: "GKV", insuranceName: `Kasse ${marke}`,
      insuranceNumber: `K${marke}`, email: `patient-${mail}@pruef.invalid`, phone: "0171 5550101", contactConsentAt: new Date(), whatsappConsentAt: new Date(), nachfassConsentAt: new Date(),
      notes: `Notiz ${marke}`, behandlerId: nutzer.id, portalTokenHash: sha(portalToken), portalExpiresAt: inTagen(7),
    },
  });
  const schnellPatient = await prisma.patient.create({ data: { practiceId: p, firstName: "Ohne Akte", lastName: `Kz${marke}`, ohneAkte: true, insuranceType: "GKV" } });
  const standort = await prisma.location.create({ data: { practiceId: p, name: `Standort ${marke}` } });
  const katalog = await prisma.serviceCatalogItem.create({ data: { practiceId: p, system: "SONSTIGES", code: `X-${marke}`, title: `Leistung ${marke}`, category: "Sonstiges", toothRelevant: false } });
  const katalogZwei = await prisma.serviceCatalogItem.create({ data: { practiceId: p, system: "SONSTIGES", code: `Y-${marke}`, title: `Zweite Leistung ${marke}`, category: "Sonstiges", toothRelevant: false } });
  // In jeder Praxis gleich: Name und Geburtsdatum passen zur Terminanfrage unten.
  const zwilling = await prisma.patient.create({ data: { practiceId: p, firstName: "Anna", lastName: "Zwilling", birthDate: new Date("1991-02-03T00:00:00Z"), insuranceType: "GKV", notes: `Zwilling ${marke}` } });
  const vorlage = await prisma.serviceTemplate.create({ data: { practiceId: p, name: `Vorlage ${marke}` } });
  const vorlagePosten = await prisma.serviceTemplateItem.create({ data: { templateId: vorlage.id, catalogItemId: katalog.id } });
  const bericht = await prisma.report.create({
    data: { practiceId: p, patientId: patient.id, authorId: nutzer.id, type: "BEFUND", serviceSummary: `Zusammenfassung ${marke}`, serviceTemplateId: vorlage.id, reviewConfirmed: true, generatedText: `Berichtstext ${marke}` },
  });
  await prisma.reportRevision.create({ data: { reportId: bericht.id, text: `Alter Text ${marke}`, editedById: nutzer.id } });
  await prisma.reportServiceEntry.create({ data: { reportId: bericht.id, catalogItemId: katalog.id, note: `Posten ${marke}` } });
  const vorschlag = await prisma.treatmentProposal.create({
    data: {
      practiceId: p, patientId: patient.id, authorId: nutzer.id, status: "BESPROCHEN",
      input: { teeth: {}, globals: {}, patient: { age: 46, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026 } },
      choices: {}, baseTotalCent: 39839, planTotalCent: 80000, eigenanteilCent: 56097, letterText: `Brief ${marke}`,
      shareTokenHash: sha(linkToken), shareExpiresAt: inTagen(7), shareCreatedAt: new Date(), patientResponse: "INTERESSE", patientRespondedAt: new Date(), patientNote: `Wunsch ${marke}`,
      agreedAt: new Date(), agreedName: `Vor${marke} Nach${marke}`, agreedChoices: {}, agreedText: `Vereinbarung ${marke}`,
    },
  });
  const vorschlagOffen = await prisma.treatmentProposal.create({
    data: {
      practiceId: p, patientId: patient.id, authorId: nutzer.id, status: "BESPROCHEN",
      input: { teeth: { "16": "zerstoert" }, globals: {}, patient: { age: 46, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026 } },
      choices: {}, baseTotalCent: 39839, planTotalCent: 39839, eigenanteilCent: 15936, letterText: `Offener Brief ${marke}`, shareCreatedAt: new Date(),
    },
  });
  const zweitmeinung = await prisma.zweitmeinung.create({ data: { practiceId: p, proposalId: vorschlag.id, leistung: `Zweitmeinung ${marke}`, eigenanteilCent: 50000 } });
  await prisma.leseLink.create({ data: { proposalId: vorschlag.id, tokenHash: sha(`${marke}-lesen`), expiresAt: inTagen(7) } });
  const rechnung = await prisma.invoice.create({ data: { practiceId: p, patientId: patient.id, proposalId: vorschlag.id, number: `R-${marke}`, title: `Rechnung ${marke}`, amountCent: 56097, dueDate: inTagen(14) } });
  const termin = await prisma.appointment.create({ data: { practiceId: p, patientId: patient.id, locationId: standort.id, start: inTagen(5), minutes: 30, reason: `Termin ${marke}` } });
  const abgesagterTermin = await prisma.appointment.create({ data: { practiceId: p, patientId: patient.id, start: inTagen(6), minutes: 30, reason: `Abgesagt ${marke}`, status: "ABGESAGT" } });
  const eingang = await prisma.eingang.create({ data: { practiceId: p, patientId: patient.id, art: "VORSCHLAG_INTERESSE", entityId: vorschlag.id, hinweis: `Hinweis ${marke}` } });
  const inhalt = Buffer.from(`Inhalt ${marke}`);
  const dokument = await prisma.patientDocument.create({ data: { practiceId: p, patientId: patient.id, name: `Dokument-${marke}.txt`, mime: "text/plain", size: inhalt.length, data: inhalt } });
  const akteneintrag = await prisma.patientEntry.create({ data: { practiceId: p, patientId: patient.id, art: "NOTIZ", text: `Eintrag ${marke}` } });
  const schluessel = await prisma.connectorKey.create({ data: { practiceId: p, name: `Schlüssel ${marke}`, keyHash: sha(schluesselRoh), keyPrefix: "sor_conn_pruef" } });
  // Ein Bericht wartet auf die Abholung durch den Connector dieser Praxis.
  await prisma.gdtAuslieferung.create({ data: { practiceId: p, art: "bericht", refId: bericht.id, keyId: schluessel.id } });
  const warteliste = await prisma.warteliste.create({ data: { practiceId: p, patientId: patient.id, anlass: `Warten ${marke}` } });
  const terminanfrage = await prisma.terminanfrage.create({
    data: { practiceId: p, firstName: "Anna", lastName: "Zwilling", birthDate: new Date("1991-02-03T00:00:00Z"), email: `neu-${mail}@pruef.invalid`, anlass: `Erster Termin ${marke}`, start: inTagen(8), minutes: 30, reserviertBis: inTagen(1), datenschutzAt: new Date() },
  });
  const anamnese = await prisma.anamnesisForm.create({ data: { practiceId: p, patientId: patient.id, tokenHash: sha(`${marke}-anamnese`), expiresAt: inTagen(7) } });
  await prisma.modellMarkierung.create({ data: { practiceId: p, patientId: patient.id, modell: "gebiss", teil: "16", notiz: `Markierung ${marke}` } });
  await prisma.kurzcheck.create({ data: { practiceId: p, patientId: patient.id, antworten: { text: `Kurzcheck ${marke}` } } });
  await prisma.auditLog.create({ data: { practiceId: p, userId: nutzer.id, userName: nutzer.name, action: "pruefung.start", summary: `Protokoll ${marke}` } });
  return {
    marke, name: patient.lastName, email: nutzer.email, schluesselRoh, portalToken, linkToken, katalogZwei: katalogZwei.id, zwilling: zwilling.id, vorschlagOffen: vorschlagOffen.id, mitarbeit: mitarbeit.id, schnellPatient: schnellPatient.id, praxis: p, nutzer: nutzer.id,
    patient: patient.id, vorschlag: vorschlag.id, rechnung: rechnung.id, termin: termin.id, abgesagterTermin: abgesagterTermin.id, eingang: eingang.id, dokument: dokument.id,
    akteneintrag: akteneintrag.id, bericht: bericht.id, standort: standort.id, katalog: katalog.id, vorlage: vorlage.id, vorlagePosten: vorlagePosten.id, schluessel: schluessel.id,
    warteliste: warteliste.id, terminanfrage: terminanfrage.id, anamnese: anamnese.id, zweitmeinung: zweitmeinung.id,
  };
}

/** Alles, was zu einer Praxis gehört, als Text je Tabelle (zum Vergleich vorher/nachher). */
async function abbild(practiceId: string): Promise<Record<string, string>> {
  const paare = await Promise.all([
    ...modelle.map(async (m) => [m.name, await delegate(m.name).findMany({ where: { practiceId }, ...(m.pk ? { orderBy: { [m.pk]: "asc" } } : {}) })] as const),
    ["Practice", await prisma.practice.findUnique({ where: { id: practiceId } })] as const,
    ["LeseLink", await prisma.leseLink.findMany({ where: { proposal: { practiceId } }, orderBy: { id: "asc" } })] as const,
    ["ReportRevision", await prisma.reportRevision.findMany({ where: { report: { practiceId } }, orderBy: { id: "asc" } })] as const,
    ["ReportServiceEntry", await prisma.reportServiceEntry.findMany({ where: { report: { practiceId } }, orderBy: { id: "asc" } })] as const,
    ["ServiceTemplateItem", await prisma.serviceTemplateItem.findMany({ where: { template: { practiceId } }, orderBy: { id: "asc" } })] as const,
    ["UserLocation", await prisma.userLocation.findMany({ where: { user: { practiceId } }, orderBy: [{ userId: "asc" }, { locationId: "asc" }] })] as const,
    ["PortalPruefung", await prisma.portalPruefung.findMany({ where: { patient: { practiceId } }, orderBy: { linkHash: "asc" } })] as const,
  ]);
  return Object.fromEntries(paare.map(([k, v]) => [k, JSON.stringify(v)]));
}
async function bUnveraendert(wo: string) {
  const jetzt = await abbild(B.praxis);
  const anders = Object.keys(abbildB).filter((k) => abbildB[k] !== jetzt[k]);
  expect(anders, `${wo}: Daten der Praxis B wurden verändert (${anders.join(", ")})`).toEqual([]);
}

const ersetzen = (v: unknown, wer: Wer): unknown => {
  if (typeof v === "string") return v.replace(/\$lauf/g, `Zq${LAUF}`).replace(/\$jahr/g, String(new Date().getFullYear())).replace(/\$([AB])\.([A-Za-z]+)/g, (_, k: "A" | "B", n: keyof Ids) => wer[k][n] ?? `unbekannt-${n}`);
  if (Array.isArray(v)) return v.map((x) => ersetzen(x, wer));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ersetzen(x, wer)]));
  return v;
};

interface Ergebnis { status: number | "Ausnahme"; text: string }
const tabelle: string[] = [];
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const geladen = new Map<string, Record<string, unknown>>();
async function modul(datei: string): Promise<Record<string, unknown>> {
  if (!geladen.has(datei)) geladen.set(datei, await import(/* @vite-ignore */ path.join(API, datei)));
  return geladen.get(datei)!;
}
const methodenVon = async (e: Eintrag) => { const m = await modul(e.datei); return METHODEN.filter((x) => typeof m[x] === "function"); };

let aufrufe = 0;
async function aufruf(e: Eintrag, methode: Methode, fall?: Pick<Fall, "pfad" | "query" | "body">, wer: Wer = { A, B }, kopf: Record<string, string> = {}): Promise<Ergebnis> {
  const handler = (await modul(e.datei))[methode] as Handler;
  // Jede Anfrage von einer anderen Adresse, damit die Begrenzung je Adresse den Test nicht ausbremst.
  const ip = `10.9.${(++aufrufe >> 8) & 255}.${aufrufe & 255}`;
  const params: Record<string, string> = {};
  let pfad = `/api/${e.datei.replace(/\/route\.ts$/, "")}`;
  for (const n of pfadNamen(e.datei)) {
    const v = fall?.pfad?.[n];
    params[n] = v ? String(ersetzen(`$${v}`, wer)) : "gibt-es-nicht";
    pfad = pfad.replace(`[${n}]`, params[n]);
  }
  const url = new URL(`http://localhost${pfad}`);
  for (const [k, v] of Object.entries(fall?.query ?? {})) url.searchParams.set(k, String(ersetzen(v, wer)));
  const init: RequestInit = { method: methode, headers: { "x-forwarded-for": ip, ...(methode === "GET" ? {} : { "content-type": "application/json" }), ...kopf } };
  if (methode !== "GET") init.body = typeof fall?.body === "string" ? String(ersetzen(fall.body, wer)) : JSON.stringify(ersetzen(fall?.body ?? {}, wer));
  try {
    const res = await handler(new Request(url, init), { params: Promise.resolve(params) });
    if (process.env.MANDANT_TABELLE && res.status === 400) tabelle.push(`  400 bei ${methode} ${e.datei}: ${(await res.clone().text()).slice(0, 160)}`);
    return { status: res.status, text: `${await res.text()} ${res.headers.get("location") ?? ""} ${res.headers.get("content-disposition") ?? ""}` };
  } catch (err) {
    return { status: "Ausnahme", text: String((err as Error)?.message ?? err) };
  }
}
const nichtsVonB = (wo: string, r: Ergebnis) => {
  const treffer = markenB.filter((m) => r.text.includes(m));
  expect(treffer, `${wo}: Antwort (${r.status}) enthält Daten der Praxis B`).toEqual([]);
};
const SITZUNGS_COOKIE = "next-auth.session-token";
function anmelden(p: Ids) {
  jar.clear();
  jar.set(SITZUNGS_COOKIE, `sitzung-${p.marke}`);
  sitzung = { user: { id: p.nutzer, name: `Leitung ${p.marke}`, email: p.email, role: "admin", practiceId: p.praxis, practiceName: `Praxis ${p.marke}` } };
}
const alsA = () => anmelden(A);
const abmelden = () => { jar.clear(); sitzung = null; };

/** Antworten auf die Aufrufe mit fremden IDs, für den Vergleich in der Gegenprobe */
const fremdAntwort = new Map<string, string>();
const kurz = (r: Ergebnis) => `${r.status} ${r.text.slice(0, 80)}`;
const zeile = (art: string, wo: string, r: Ergebnis) => tabelle.push(`${art} | ${wo} | ${r.status} | ${r.text.slice(0, 110).replace(/\s+/g, " ")}`);
const zaehler = { fremdAufrufe: 0, fremdRouten: 0, ohneSitzung: 0, ohneId: 0, gegenproben: 0, listen: 0, linkAufrufe: 0 };
const ERLAUBT = [401, 403, 404, 409];
const fallName = (methode: Methode, e: Eintrag, fall?: { name?: string }) => `${methode} ${e.datei}${fall?.name ? ` (${fall.name})` : ""}`;

describe.skipIf(!process.env.DATABASE_URL)("Trennung der Praxen: Praxis A kommt nie an Daten der Praxis B", () => {
  beforeAll(async () => {
    const { Prisma } = await import("@prisma/client");
    prisma = (await import("@/lib/prisma")).prisma;
    modelle = Prisma.dmmf.datamodel.models
      .filter((m) => m.name !== "Practice" && m.fields.some((f) => f.name === "practiceId"))
      .map((m) => ({ name: m.name, pk: m.fields.find((f) => f.isId)?.name ?? null }));
    A = await praxisAnlegen("A");
    B = await praxisAnlegen("B");
    const { marke, name, email, ...ids } = B;
    void name; void email;
    markenB = [marke, ...Object.values(ids)];
    abbildB = await abbild(B.praxis);
  }, 120_000);

  afterAll(async () => {
    // MANDANT_TABELLE=<Datei>: jede geprüfte Antwort als Zeile, zum Nachlesen.
    if (process.env.MANDANT_TABELLE) fs.writeFileSync(process.env.MANDANT_TABELLE, `${tabelle.join("\n")}\n`);
    if (!prisma) return;
    const where = { practiceId: { in: angelegt } };
    const nutzer = { user: where };
    await prisma.passwordResetToken.deleteMany({ where: nutzer }).catch(() => {});
    await prisma.emailVerificationToken.deleteMany({ where: nutzer }).catch(() => {});
    await prisma.reportRevision.deleteMany({ where: { report: where } }).catch(() => {});
    await prisma.reportServiceEntry.deleteMany({ where: { report: where } }).catch(() => {});
    await prisma.serviceTemplateItem.deleteMany({ where: { template: where } }).catch(() => {});
    // Reihenfolge der Fremdschlüssel nicht fest verdrahten: so oft wiederholen, bis alles gelöscht ist.
    let offen = modelle.map((m) => m.name);
    for (let runde = 0; runde < 6 && offen.length; runde++) {
      const rest: string[] = [];
      for (const name of offen) await delegate(name).deleteMany({ where }).catch(() => void rest.push(name));
      offen = rest;
    }
    await prisma.practice.deleteMany({ where: { id: { in: angelegt } } });
    await prisma.$disconnect();
  }, 120_000);

  it("legt zwei getrennte Praxen mit vollem Datensatz an", async () => {
    expect(A.praxis).not.toBe(B.praxis);
    for (const tabelleName of ["User", "Patient", "TreatmentProposal", "Invoice", "Appointment", "Eingang", "PatientDocument", "PatientEntry", "Report", "Location", "Warteliste", "Terminanfrage"]) {
      expect(JSON.parse(abbildB[tabelleName]).length, `Praxis B ohne ${tabelleName}`).toBeGreaterThan(0);
    }
    expect(markenB.length).toBeGreaterThan(15);
  });

  it("die Liste stimmt mit den wirklich exportierten Methoden überein", async () => {
    for (const e of SITZUNG) {
      const echt = await methodenVon(e);
      expect(echt.length, `${e.datei}: keine Methode gefunden`).toBeGreaterThan(0);
      expect(methodenAusQuelle(quelltext(e.datei)), e.datei).toEqual(echt);
    }
  }, 120_000);

  describe("ohne Sitzung: 401", () => {
    for (const e of SITZUNG) {
      it(e.datei, async () => {
        for (const methode of await methodenVon(e)) {
          abmelden();
          const fall = e.faelle?.find((f) => !f.methoden || f.methoden.includes(methode)) ?? e.faelle?.[0];
          const r = await aufruf(e, methode, fall);
          zaehler.ohneSitzung++;
          expect(r.status, `${methode} ${e.datei} ohne Sitzung`).toBe(401);
          nichtsVonB(`${methode} ${e.datei} ohne Sitzung`, r);
        }
        await bUnveraendert(`${e.datei} ohne Sitzung`);
      }, 60_000);
    }
  });

  describe("als Praxis A mit IDs der Praxis B: abgelehnt, nichts gelesen, nichts verändert", () => {
    for (const e of MIT_FREMDEN_IDS) {
      it(e.datei, async () => {
        const methoden = await methodenVon(e);
        zaehler.fremdRouten++;
        for (const fall of e.faelle!) {
          for (const methode of methoden.filter((x) => !fall.methoden || fall.methoden.includes(x))) {
            alsA();
            const r = await aufruf(e, methode, fall);
            const wo = fallName(methode, e, fall);
            zaehler.fremdAufrufe++;
            zeile("fremd", wo, r);
            fremdAntwort.set(wo, kurz(r));
            expect(fall.erwartet ?? ERLAUBT, `${wo}: Antwort ${r.status} ${r.text.slice(0, 200)}`).toContain(r.status);
            nichtsVonB(wo, r);
            await bUnveraendert(wo);
          }
        }
        // Methoden, für die kein Fall gilt (z. B. die Liste neben dem Anlegen): Antwort ohne Daten von B.
        for (const methode of methoden.filter((x) => !e.faelle!.some((f) => !f.methoden || f.methoden.includes(x)))) {
          alsA();
          const r = await aufruf(e, methode);
          zeile("rest", `${methode} ${e.datei}`, r);
          nichtsVonB(`${methode} ${e.datei}`, r);
          await bUnveraendert(`${methode} ${e.datei}`);
        }
      }, 60_000);
    }
  });

  describe("Listen und Suchen: eigene Daten ja, Daten der Praxis B nie", () => {
    for (const e of MIT_LISTEN) {
      it(e.datei, async () => {
        for (const l of e.listen as Liste[]) {
          alsA();
          const methode = l.methode ?? "GET";
          const r = await aufruf(e, methode, l);
          const wo = fallName(methode, e, l);
          zaehler.listen++;
          zeile("liste", wo, r);
          expect(r.status, `${wo}: ${r.text.slice(0, 200)}`).toBe(200);
          if (l.enthaelt) expect(r.text.includes(String(ersetzen(l.enthaelt, { A, B }))), `${wo}: eigene Daten fehlen in der Antwort (${l.enthaelt})`).toBe(true);
          nichtsVonB(wo, r);
        }
        await bUnveraendert(e.datei);
      }, 60_000);
    }
  });

  describe("Routen ohne ID (Einstellungen, Sammel-Aktionen): nichts von Praxis B in der Antwort, B unverändert", () => {
    for (const e of OHNE_ID) {
      it(e.datei, async () => {
        for (const methode of await methodenVon(e)) {
          alsA();
          const r = await aufruf(e, methode);
          zaehler.ohneId++;
          zeile("ohneId", `${methode} ${e.datei}`, r);
          expect(r.status, `${methode} ${e.datei}: ${r.text.slice(0, 200)}`).not.toBe(401);
          nichtsVonB(`${methode} ${e.datei}`, r);
        }
        await bUnveraendert(e.datei);
      }, 60_000);
    }
  });

  describe("Patienten-Links: mit dem eigenen Link kommt man nicht an Daten der Praxis B", () => {
    for (const e of LINKS) {
      it(e.datei, async () => {
        const methoden = await methodenVon(e);
        for (const fall of e.faelle!) {
          for (const methode of methoden.filter((x) => !fall.methoden || fall.methoden.includes(x))) {
            abmelden();
            if (e.datei.startsWith("empfang/patient/")) await uebergeben(A);
            if (fall.vorher === "geburtsdatum") await geburtsdatumBestaetigen(A);
            const r = await aufruf(e, methode, fall);
            const wo = fallName(methode, e, fall);
            zaehler.linkAufrufe++;
            zeile("link", wo, r);
            fremdAntwort.set(wo, kurz(r));
            expect(fall.erwartet ?? ERLAUBT, `${wo}: Antwort ${r.status} ${r.text.slice(0, 200)}`).toContain(r.status);
            nichtsVonB(wo, r);
            await bUnveraendert(wo);
          }
        }
        abmelden();
      }, 60_000);
    }
  });

  type MitCookies = Response & { cookies: { getAll: () => { name: string; value: string; maxAge?: number }[] } };
  // Gelesen werden die Set-Cookie-Zeilen, nicht res.cookies: Die Bestätigung im Portal setzt ihr Cookie als fertige
  // Zeilen für die beiden Pfade des Links und löscht eine alte Fassung unter "/" (lib/portalPruefungCookie.ts).
  // Dieser Krug kennt keine Pfade. Er übernimmt, was die Antwort setzt, und löscht nur, was sie nirgends neu setzt.
  const cookiesUebernehmen = (res: MitCookies) => {
    const gesetzt = new Map<string, string>();
    const geloescht = new Set<string>();
    for (const zeile of res.headers.getSetCookie()) {
      const paar = zeile.split(";")[0];
      const name = paar.slice(0, paar.indexOf("=")).trim();
      let wert = paar.slice(paar.indexOf("=") + 1).trim();
      try { wert = decodeURIComponent(wert); } catch { /* Wert bleibt, wie er ist */ }
      if (!wert || /;\s*Max-Age=0\s*(;|$)/i.test(zeile)) geloescht.add(name);
      else gesetzt.set(name, wert);
    }
    for (const name of geloescht) if (!gesetzt.has(name)) jar.delete(name);
    for (const [name, wert] of gesetzt) jar.set(name, wert);
  };
  /** Patientenportal: Geburtsdatum bestätigen, wie es der Patient vor der Unterschrift tut. */
  async function geburtsdatumBestaetigen(p: Ids) {
    const POST = (await modul("portal/[token]/pruefung/route.ts")).POST as (req: Request, ctx: { params: Promise<{ token: string }> }) => Promise<MitCookies>;
    const res = await POST(new Request(`http://localhost/api/portal/${p.portalToken}/pruefung`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.8.${++aufrufe >> 8}.${aufrufe & 255}` }, body: JSON.stringify({ tag: 6, monat: 5, jahr: 1980 }) }), { params: Promise.resolve({ token: p.portalToken }) });
    expect(res.status, "Geburtsdatum bestätigen").toBe(200);
    cookiesUebernehmen(res);
  }

  /** Empfangsmodus: Das Tablet wird an einen Patienten übergeben; danach gilt nur noch das Übergabe-Cookie. */
  async function uebergeben(p: Ids) {
    anmelden(p);
    const POST = (await modul("empfang/uebergabe/route.ts")).POST as (req: Request) => Promise<MitCookies>;
    const res = await POST(new Request("http://localhost/api/empfang/uebergabe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ patientId: p.patient, kontakt: true, anamnese: true, unterschrift: true }) }));
    expect(res.status, "Übergabe an den eigenen Patienten").toBe(200);
    cookiesUebernehmen(res);
    sitzung = null;
    expect(jar.has(SITZUNGS_COOKIE), "Praxis-Sitzung ist nach der Übergabe aus dem Browser").toBe(false);
  }

  // Ohne Gegenprobe könnte ein Fall aus dem falschen Grund bestehen (z. B. weil der Body nicht passt).
  // Deshalb: frische Praxis C, derselbe Aufruf mit lauter eigenen IDs. Er darf nicht mit 401/403/404 enden.
  describe("Gegenprobe: derselbe Aufruf mit eigenen IDs wird nicht als fremd abgewiesen", () => {
    let n = 0;
    for (const e of [...MIT_FREMDEN_IDS, ...LINKS]) {
      it(e.datei, async () => {
        const methoden = await methodenVon(e);
        for (const fall of e.faelle!.filter((f) => !f.ohneGegenprobe)) {
          for (const methode of methoden.filter((x) => !fall.methoden || fall.methoden.includes(x))) {
            const C = await praxisAnlegen(`C${++n}`);
            if (e.art === "sitzung") anmelden(C);
            else abmelden();
            if (e.datei.startsWith("empfang/patient/")) await uebergeben(C);
            if (fall.vorher === "geburtsdatum") await geburtsdatumBestaetigen(C);
            const r = await aufruf(e, methode, fall, { A: C, B: C });
            const wo = fallName(methode, e, fall);
            zaehler.gegenproben++;
            zeile("eigen", wo, r);
            const hinweis = `${wo}: Mit eigenen IDs kommt ${r.status} ${r.text.slice(0, 200)}. Der Fall beweist so nichts; bitte Body oder Datensatz anpassen.`;
            expect([401, 403, 404, "Ausnahme"], hinweis).not.toContain(r.status);
            // Dieselbe Antwort wie beim fremden Datensatz hieße: Die Route kam gar nicht bis zur Prüfung der Praxis.
            expect(kurz(r), hinweis).not.toBe(fremdAntwort.get(wo));
            nichtsVonB(wo, r);
          }
        }
        await bUnveraendert(`${e.datei} Gegenprobe`);
      }, 120_000);
    }
  });

  it("Connector: Der Schlüssel der Praxis A liefert und bestätigt nichts von Praxis B", async () => {
    abmelden();
    const mitSchluessel = { authorization: `Bearer ${A.schluesselRoh}` };
    const ergebnisse = nachDatei.get("connector/ergebnisse/route.ts")!;
    // Bestätigung für den wartenden Bericht der Praxis B: zählt nicht.
    const b = await aufruf(ergebnisse, "POST", { body: `bericht\t$B.bericht\r\nvorschlag\t$B.vorschlag\r\n` }, { A, B }, mitSchluessel);
    zeile("connector", "POST connector/ergebnisse (fremder Bericht)", b);
    expect(b.status).toBe(200);
    expect(JSON.parse(b.text.trim()).bestaetigt).toBe(0);
    await bUnveraendert("Connector-Bestätigung");
    // Gegenprobe: Der eigene wartende Bericht lässt sich bestätigen.
    const eigen = await aufruf(ergebnisse, "POST", { body: `bericht\t$A.bericht\r\n` }, { A, B }, mitSchluessel);
    expect(JSON.parse(eigen.text.trim()).bestaetigt).toBe(1);
    for (const [datei, methode] of [["connector/ergebnisse/route.ts", "GET"], ["connector/ping/route.ts", "GET"]] as const) {
      const r = await aufruf(nachDatei.get(datei)!, methode, undefined, { A, B }, mitSchluessel);
      zeile("connector", `${methode} ${datei}`, r);
      expect(r.status, `${methode} ${datei}: ${r.text.slice(0, 200)}`).toBe(200);
      nichtsVonB(`${methode} ${datei}`, r);
    }
    // Ohne Schlüssel und mit falschem Schlüssel: 401.
    for (const datei of ["connector/ergebnisse/route.ts", "connector/ping/route.ts", "connector/launch/route.ts"]) {
      const e = nachDatei.get(datei)!;
      for (const methode of await methodenVon(e)) {
        expect((await aufruf(e, methode)).status, `${methode} ${datei} ohne Schlüssel`).toBe(401);
        expect((await aufruf(e, methode, undefined, { A, B }, { authorization: "Bearer sor_conn_falsch" })).status, `${methode} ${datei} mit falschem Schlüssel`).toBe(401);
      }
    }
    await bUnveraendert("Connector");
  }, 60_000);

  describe("nur Sorrida-Team", () => {
    for (const e of MATRIX.filter((x) => x.art === "team")) {
      it(`${e.datei}: Praxis-Konto und Besucher werden abgewiesen`, async () => {
        for (const methode of await methodenVon(e)) {
          abmelden();
          expect([401, 403], `${methode} ${e.datei} ohne Sitzung`).toContain((await aufruf(e, methode)).status);
          alsA();
          expect([401, 403], `${methode} ${e.datei} als Praxis-Leitung`).toContain((await aufruf(e, methode)).status);
        }
      }, 60_000);
    }
  });

  it("am Ende verweist kein Datensatz der Praxis A auf Praxis B, und B ist unverändert", async () => {
    const a = await abbild(A.praxis);
    for (const [name, text] of Object.entries(a)) {
      const treffer = markenB.filter((mk) => text.includes(mk));
      expect(treffer, `Tabelle ${name} der Praxis A enthält Verweise auf Praxis B`).toEqual([]);
    }
    await bUnveraendert("Abschluss");
    tabelle.push(
      `Mandantentrennung: ${MATRIX.length} Schnittstellen (sitzung ${SITZUNG.length}, oeffentlich ${MATRIX.filter((x) => x.art === "oeffentlich").length}, team ${MATRIX.filter((x) => x.art === "team").length}); ` +
        `${zaehler.fremdRouten} Sitzungs-Routen mit ${zaehler.fremdAufrufe} Aufrufen mit fremden IDs, ${zaehler.gegenproben} Gegenproben, ${zaehler.listen} Listen, ${zaehler.linkAufrufe} Aufrufe über Patienten-Links, ` +
        `${zaehler.ohneSitzung} Aufrufe ohne Sitzung, ${zaehler.ohneId} Aufrufe ohne ID; offen: ${MATRIX.filter((x) => x.offen).length}`,
    );
  }, 60_000);
});
