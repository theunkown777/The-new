// Brücke zwischen Praxen, ohne Verbindung auf dem Server: statische Wächter (ohne Datenbank).
//
// Sorrida ist Auftragsverarbeiter jeder Praxis; jede Praxis ist ein eigener Mandant (AVV § 1, Anlage 1). Die Brücke für
// Patienten, die bei mehreren Praxen sind, ist das Gerät des Patienten („Meine Praxen auf diesem Gerät“). Diese Tests
// halten fest, was dabei nie passieren darf:
//   1. /meine-praxen lädt nichts aus der Datenbank und ruft beim Öffnen keine Schnittstelle auf.
//   2. Keine Schnittstelle nimmt mehrere Patienten-Tokens in einem Aufruf an.
//   3. Keine Abfrage sucht Patienten über Name, Geburtsdatum, E-Mail, Telefon oder Versichertennummer ohne Praxis.
//   4. Seiten unter app/portal laden Patienten nur über den Link (die Matrix in lib/mandantentrennung.matrix.ts sieht nur route.ts).
//   5. Der Speicher auf dem Gerät wird nur an den vorgesehenen Stellen angefasst, nie in der Praxis-App.
//   6. Cookies eines Patienten-Links gehen nur an die Seiten dieses Links, nie an "/" (sonst an jede Praxis).
//   7. „Eigene Angaben mitnehmen“ (lib/meineAngaben.ts): keine neue Schnittstelle, kein Abgleich auf dem Server. Die Akte
//      und der Eingang der zweiten Praxis zeigen nur den Hinweis mit dem Stand, nie Herkunft, Praxis oder Fach.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ANGABEN_UI, GERAET_UI, PORTAL_LANGS } from "@/lib/portalI18n";
import { pruefCookieName, pruefCookiePfade, pruefCookieZeilen, pruefToken } from "@/lib/portalPruefungCookie";
import { hashToken } from "@/lib/tokens";
import { freiOhneZugang } from "@/lib/vorschau";

const WURZEL = process.cwd();
const lies = (datei: string) => readFileSync(join(WURZEL, datei), "utf8");
const lauf = (ordner: string, test = /\.(ts|tsx)$/): string[] =>
  readdirSync(join(WURZEL, ordner), { withFileTypes: true }).flatMap((e) => {
    const pfad = `${ordner}/${e.name}`;
    if (e.isDirectory()) return e.name === "node_modules" ? [] : lauf(pfad, test);
    return test.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [pfad] : [];
  });
const QUELLEN = [...lauf("app"), ...lauf("lib"), ...lauf("components")];
const ohneKommentare = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// --- kleiner Leser für Klammern (überspringt Zeichenketten) ---
function bisZu(text: string, start: number): number {
  // start zeigt auf eine öffnende Klammer; liefert die Stelle nach der passenden schließenden.
  let tiefe = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < text.length && text[i] !== q; i++) if (text[i] === "\\") i++;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") tiefe++;
    else if (c === ")" || c === "}" || c === "]") {
      tiefe--;
      if (tiefe === 0) return i + 1;
    }
  }
  return text.length;
}

/** Wert hinter `name:` bzw. `name =` (Objekt, Aufruf oder Name) ab Stelle `ab`. `await` und der Kopf einer Pfeilfunktion zählen nicht. */
function wertAb(text: string, ab: number): string {
  let i = ab;
  while (/\s/.test(text[i] ?? "")) i++;
  if (/^await\s/.test(text.slice(i, i + 6))) return wertAb(text, i + 5);
  if ("{[(".includes(text[i])) {
    const ende = bisZu(text, i);
    const pfeil = /^\s*(:\s*[\w<>[\]., ]+)?\s*=>\s*/.exec(text.slice(ende));
    if (text[i] === "(" && pfeil) return wertAb(text, ende + pfeil[0].length);
    const wert = text.slice(i, ende);
    return /^\(\s*\{/.test(wert) ? wert.slice(1, -1).trim() : wert;
  }
  const name = /^[\w$.!]+/.exec(text.slice(i))?.[0] ?? "";
  const nach = i + name.length;
  return text[nach] === "(" ? text.slice(i, bisZu(text, nach)) : name;
}

/** Schlüssel `name` auf oberster Ebene eines Objekts „{…}“: Stelle nach dem Doppelpunkt, "kurz" bei `{ name }`, sonst -1. */
function obersterSchluessel(obj: string, name: string): number | "kurz" {
  let tiefe = 0;
  for (let i = 0; i < obj.length; i++) {
    const c = obj[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < obj.length && obj[i] !== q; i++) if (obj[i] === "\\") i++;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") tiefe++;
    else if (c === ")" || c === "}" || c === "]") tiefe--;
    else if (tiefe === 1 && obj.startsWith(name, i) && !/[\w$]/.test(obj[i - 1] ?? "") && !/[\w$]/.test(obj[i + name.length] ?? "")) {
      const m = /^\s*(:|,|\})/.exec(obj.slice(i + name.length));
      if (m) return m[1] === ":" ? i + name.length + m[0].length : "kurz";
    }
  }
  return -1;
}

const ALS_MUSTER = (name: string) => name.replace(/\$/g, "\\$");
/** Wert einer Konstanten: in derselben Datei oder, bei `import { name } from "@/…"`, in der eingebundenen Datei. */
function aufloesen(datei: string, name: string, tiefe = 0): string | null {
  const d = new RegExp(`\\b(?:const|let)\\s+${ALS_MUSTER(name)}\\b[^=;]*=`).exec(datei);
  if (d) return wertAb(datei, d.index + d[0].length);
  if (tiefe > 0) return null;
  const imp = new RegExp(`import\\s*\\{[^}]*\\b${ALS_MUSTER(name)}\\b[^}]*\\}\\s*from\\s*["']@/([^"']+)["']`).exec(datei);
  const ziel = imp && [`${imp[1]}.ts`, `${imp[1]}.tsx`].find((p) => existsSync(join(WURZEL, p)));
  return ziel ? aufloesen(ohneKommentare(lies(ziel)), name, 1) : null;
}

/** Ein Objekt „{…}“, direkt oder über eine Konstante bzw. eine Hilfsfunktion `name(…)`; sonst null (nicht sichtbar). */
function sichtbaresObjekt(datei: string, wert: string): string | null {
  if (wert.startsWith("{")) return wert;
  const m = /^([\w$]+)(\(|$)/.exec(wert);
  const r = m ? aufloesen(datei, m[1]) : null;
  return r && r.startsWith("{") ? r : null;
}

/**
 * Bedingung (where) eines Prisma-Aufrufs samt der Konstanten und Hilfsfunktionen, die darin vorkommen.
 * `sichtbar` ist falsch, wenn der Prüfer sie nicht ganz lesen kann: `findMany(args)` mit unbekanntem `args`,
 * `where: filter` mit einem Parameter, `{ ...extra }` mit unbekanntem `extra`.
 */
function bedingung(datei: string, argument: string): { text: string; sichtbar: boolean } {
  const obj = sichtbaresObjekt(datei, argument.slice(1, -1).trim());
  if (!obj) return { text: argument, sichtbar: false };
  const stelle = obersterSchluessel(obj, "where");
  if (stelle === -1) return { text: "", sichtbar: true };
  const roh = stelle === "kurz" ? "where" : wertAb(obj, stelle);
  const kern = sichtbaresObjekt(datei, roh);
  let text = kern ?? roh;
  for (let runde = 0; runde < 2; runde++) {
    for (const name of new Set(text.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])) {
      const r = aufloesen(datei, name);
      if (r) text += " " + r;
    }
  }
  const sichtbar = !!kern && [...kern.matchAll(/\.\.\.\s*([\w$]+)/g)].every((m) => sichtbaresObjekt(datei, m[1]) !== null);
  return { text, sichtbar };
}

// Personen im Schema: Patient und Terminanfrage (Name, Geburtsdatum, Kontakt). Dazu Felder mit dem Namen des Patienten
// in anderen Modellen (Lastschrift, Einverständnis). User, StaffInvite und Lead tragen Daten von Praxisteams und
// Interessenten, keine Patientendaten.
const KENNZEICHEN = /\b(firstName|lastName|birthDate|email|phone|insuranceNumber|patientNummer)\b/;
const MANDANT = /\b(practiceId|portalTokenHash)\b/;
const NAMENSFELDER: Record<string, RegExp> = { patient: KENNZEICHEN, terminanfrage: KENNZEICHEN, invoice: /\bsepaName\b/, treatmentProposal: /\bagreedName\b/ };
const PERSONEN = new Set(["Patient", "Terminanfrage"]);
const MODELLE = new Map<string, { name: string; typ: string }[]>(
  [...lies("prisma/schema.prisma").matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map((m) => [m[1], [...m[2].matchAll(/^\s+(\w+)\s+(\w+)/gm)].map((f) => ({ name: f[1], typ: f[2] }))]),
);
/** Beziehungsfelder, über die eine Bedingung Personen filtern kann (patient, patients, terminanfragen, …). */
const BEZIEHUNGEN = [...new Set([...MODELLE.values()].flat().filter((f) => PERSONEN.has(f.typ)).map((f) => f.name))];
/** Modelle, deren Bedingung (auch über Beziehungen, beliebig tief) Personen erreicht. Nur dort muss jede Bedingung lesbar sein. */
const ERREICHT_PERSONEN = (() => {
  const erreicht = new Set(PERSONEN);
  for (let neu = true; neu; ) {
    neu = false;
    for (const [m, felder] of MODELLE) if (!erreicht.has(m) && felder.some((f) => erreicht.has(f.typ))) neu = !!erreicht.add(m);
  }
  return new Set([...[...erreicht].map((m) => m[0].toLowerCase() + m.slice(1)), ...Object.keys(NAMENSFELDER)]);
})();

const ABFRAGE = /\.(\w+)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|groupBy|aggregate|updateMany|deleteMany)\s*\(/g;
type Abfrage = { modell: string; zeile: number; where: string; sichtbar: boolean };
function abfragen(quelle: string): Abfrage[] {
  const text = ohneKommentare(quelle);
  return [...text.matchAll(ABFRAGE)].map((m) => {
    const auf = m.index! + m[0].length - 1;
    const b = bedingung(text, text.slice(auf, bisZu(text, auf)));
    return { modell: m[1], zeile: text.slice(0, m.index).split("\n").length, where: b.text, sichtbar: b.sichtbar };
  });
}
/** Teile der Bedingung, die über eine Beziehung Personen filtern (`patient: { … }`), ohne select/include. */
function ueberBeziehung(where: string): string {
  let t = where;
  for (let m; (m = /\b(select|include)\s*:\s*\{/.exec(t)); ) t = t.slice(0, m.index) + t.slice(bisZu(t, m.index + m[0].length - 1));
  return [...t.matchAll(new RegExp(`\\b(${BEZIEHUNGEN.join("|")})\\s*:\\s*\\{`, "g"))].map((m) => t.slice(m.index! + m[0].length - 1, bisZu(t, m.index! + m[0].length - 1))).join(" ");
}
/**
 * "fund": sucht Personen über Name, Geburtsdatum, Kontakt oder Versichertennummer, ohne auf eine Praxis oder einen Link
 * begrenzt zu sein (im eigenen Modell oder über eine Beziehung). "unklar": Die Bedingung ist nicht ganz lesbar, nicht
 * begrenzt und das Modell erreicht Personen. Beides muss behoben oder unten als Ausnahme begründet werden.
 */
function beurteilen(a: Abfrage): "fund" | "unklar" | "ok" {
  if (MANDANT.test(a.where)) return "ok";
  if (NAMENSFELDER[a.modell]?.test(a.where) || KENNZEICHEN.test(ueberBeziehung(a.where))) return "fund";
  return !a.sichtbar && ERREICHT_PERSONEN.has(a.modell) ? "unklar" : "ok";
}

// Begründete Ausnahmen: Datei und ein Stück der Bedingung (keine Zeilennummer), mit Grund. Derzeit keine: Die früher
// unklaren Bedingungen sind jetzt lesbar (portalProposalWhere aus lib/portalAuth.ts begrenzt auf den Patienten des Links,
// offen() in lib/portalPruefungServer.ts auf den Hash des Links).
const AUSNAHMEN: { datei: string; enthaelt: string; grund: string }[] = [];

describe("Patienten werden nie über Praxen hinweg gesucht", () => {
  const urteile = (code: string) => abfragen(code).map(beurteilen);

  it("der Prüfer erkennt eine Suche ohne Praxis, auch über eine Beziehung, und lässt eine begrenzte durch", () => {
    expect(
      urteile(`const a = await prisma.patient.findMany({ where: { email: e } });
      const b = await tx.patient.findFirst({ where: { firstName: v, lastName: n, birthDate: g }, select: { id: true } });
      const w = { OR: [{ phone: t }] }; const c = await prisma.patient.count({ where: w });
      const d = await prisma.invoice.findMany({ where: { patient: { lastName: n } } });
      const e2 = await prisma.practice.findMany({ where: { patients: { some: { email: m } } } });
      const f = await prisma.terminanfrage.findFirst({ where: { phone: t } });
      const g2 = await prisma.invoice.findFirst({ where: { sepaName: n } });
      const h = await prisma.treatmentProposal.findMany({ where: { agreedName: { contains: n } } });`),
    ).toEqual(["fund", "fund", "fund", "fund", "fund", "fund", "fund", "fund"]);
    expect(
      urteile(`const a = await prisma.patient.findMany({ where: { practiceId, email: e } });
      const where = { practiceId: s.user.practiceId, AND: [{ lastName: q }] }; const b = await prisma.patient.findMany({ where, orderBy: { lastName: "asc" } });
      const c = await prisma.patient.findUnique({ where: { portalTokenHash: h }, select: { firstName: true, birthDate: true } });
      const meine = meinePatientenWhere(practiceId, u); const d = await prisma.patient.findMany({ where: { AND: [meine, { firstName: q }] } });
      const e2 = await prisma.invoice.findMany({ where: { practiceId, patient: { lastName: n } } });
      const vorschlag = await prisma.treatmentProposal.findUnique({ where: { shareTokenHash: h }, include: { patient: { select: { firstName: true } } } });
      const f = await prisma.zweitmeinung.findFirst({ where: { proposalId: vorschlag.id } });
      const g2 = await prisma.lead.findMany({ where: filter });`),
    ).toEqual(["ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"]);
  });

  it("der Prüfer meldet Bedingungen, die er nicht lesen kann, statt sie durchzulassen", () => {
    expect(
      urteile(`export async function suche(args, filter, extra) {
        const a = await prisma.patient.findMany(args);
        const b = await prisma.patient.findFirst({ where: filter });
        const c = await prisma.terminanfrage.count({ where: { ...extra } });
        const d = await prisma.appointment.findMany({ where: filter });
      }`),
    ).toEqual(["unklar", "unklar", "unklar", "unklar"]);
    // Lesbar über eine Hilfsfunktion in derselben Datei oder aus lib/ (hier lib/portalAuth.ts):
    expect(
      urteile(`import { portalProposalWhere } from "@/lib/portalAuth";
      const offen = (h: string) => ({ linkHash: h, gesperrtBis: null });
      const a = await prisma.portalPruefung.findFirst({ where: offen(x) });
      const b = await prisma.treatmentProposal.findFirst({ where: { id, ...portalProposalWhere(patient.id) } });`),
    ).toEqual(["ok", "ok"]);
  });

  it("kennt die Personen im Schema und die Wege dorthin", () => {
    expect(BEZIEHUNGEN).toEqual(expect.arrayContaining(["patient", "patients", "terminanfragen"]));
    for (const m of ["patient", "terminanfrage", "invoice", "treatmentProposal", "practice", "appointment", "portalPruefung"]) expect(ERREICHT_PERSONEN.has(m), m).toBe(true);
  });

  it("keine Abfrage in app, lib und components sucht Personen ohne Praxis, und jede Bedingung, die Personen erreicht, ist lesbar", () => {
    let gezaehlt = 0;
    const funde: string[] = [];
    const genutzt = new Set<number>();
    for (const datei of QUELLEN) {
      for (const a of abfragen(lies(datei))) {
        gezaehlt++;
        const urteil = beurteilen(a);
        if (urteil === "ok") continue;
        const ausnahme = AUSNAHMEN.findIndex((x) => x.datei === datei && a.where.includes(x.enthaelt));
        if (ausnahme >= 0) genutzt.add(ausnahme);
        else funde.push(`${urteil} ${datei}:${a.zeile} ${a.modell} ${a.where.replace(/\s+/g, " ").slice(0, 140)}`);
      }
    }
    expect(gezaehlt, "der Prüfer findet die Abfragen").toBeGreaterThan(400);
    expect(funde).toEqual([]);
    expect(AUSNAHMEN.filter((_, i) => !genutzt.has(i)), "jede Ausnahme wird noch gebraucht").toEqual([]);
  });

  it("Seiten und Routen unter app/portal laden Patienten nur über den Link", () => {
    const funde: string[] = [];
    for (const datei of lauf("app/portal")) {
      const quelle = lies(datei);
      for (const a of abfragen(quelle).filter((x) => x.modell === "patient")) {
        const ueberLink = /\bportalTokenHash\b/.test(a.where) || (/portalPatient\(/.test(quelle) && /\bid\s*:\s*patient\.id\b/.test(a.where));
        if (!ueberLink) funde.push(`${datei}:${a.zeile}`);
      }
    }
    expect(funde).toEqual([]);
  });
});

describe("Kein Aufruf nimmt mehrere Patienten-Tokens an", () => {
  const routen = lauf("app", /^route\.ts$/);
  it("jede Route hat höchstens ein Token im Pfad", () => {
    expect(routen.length).toBeGreaterThan(100);
    for (const r of routen) expect((r.match(/\[(token|kennung)\]/g) ?? []).length, r).toBeLessThanOrEqual(1);
  });
  it("keine Route liest eine Liste von Tokens aus Anfrage oder Adresse", () => {
    const funde: string[] = [];
    for (const r of routen) {
      const q = ohneKommentare(lies(r)).replace(/^\s*import\b.*$/gm, "");
      if (/\btokens\b/i.test(q)) funde.push(`${r}: „tokens“`);
      if (/getAll\(\s*["'`]\w*token/i.test(q)) funde.push(`${r}: getAll(token)`);
      if (/z\.array\([^;]{0,160}?(TOKEN_FORM|\{20,128\}|token)/i.test(q)) funde.push(`${r}: Liste von Tokens im Schema`);
      if (/\bsplit\([^)]*\)[^;]{0,80}hashToken/.test(q)) funde.push(`${r}: mehrere Tokens aus einem Wert`);
    }
    expect(funde).toEqual([]);
  });
  it("keine Abfrage sucht mehrere Link-Hashes auf einmal", () => {
    const funde = QUELLEN.filter((d) => /[Tt]okenHash\s*:\s*\{\s*in\s*:|\.map\(\s*(\(?\w+\)?\s*=>\s*)?hashToken\b/.test(ohneKommentare(lies(d))));
    expect(funde).toEqual([]);
  });
});

describe("Cookies eines Patienten-Links gehen nur an diesen Link", () => {
  const token = "a".repeat(20) + "0123456789abcdef0123456789abcdef0123456789ab";
  const cookie = { name: "sorrida_pp_0123456789abcdef", wert: "1700000000.sig_-1", maxAge: 1800 };

  it("die Bestätigung des Geburtsdatums gilt nur unter /portal/<token> und /api/portal/<token>", () => {
    expect(pruefCookiePfade(token)).toEqual([`/portal/${token}`, `/api/portal/${token}`]);
    const zeilen = pruefCookieZeilen(token, cookie, true);
    expect(zeilen).toEqual([
      `sorrida_pp_0123456789abcdef=1700000000.sig_-1; Path=/portal/${token}; Max-Age=1800; HttpOnly; SameSite=Lax; Secure`,
      `sorrida_pp_0123456789abcdef=1700000000.sig_-1; Path=/api/portal/${token}; Max-Age=1800; HttpOnly; SameSite=Lax; Secure`,
      // räumt ein früher unter "/" gesetztes Cookie desselben Links ab
      "sorrida_pp_0123456789abcdef=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
    ]);
    for (const z of zeilen.filter((x) => /Path=\/;/.test(x))) expect(z).toMatch(/^sorrida_pp_[0-9a-f]{16}=; Path=\/; Max-Age=0;/);
    expect(pruefCookieZeilen(token, cookie, false)[0]).not.toMatch(/Secure/);
    // echter Name und Wert, wie lib/portalPruefungServer.ts sie bildet
    const linkHash = hashToken(token);
    const echt = { name: pruefCookieName(linkHash), wert: pruefToken({ linkHash, patientId: "p1", geburtstag: "1990-01-01" }, 1_700_000_000_000, "geheim"), maxAge: 1800 };
    expect(pruefCookieZeilen(token, echt, true)).toHaveLength(3);
  });
  it("lehnt einen fremden Link oder Wert ab, statt eine Zeile zu bauen", () => {
    for (const falsch of ["kurz", "../../api", `${token}/x`, `${token}; Path=/`, ""]) expect(() => pruefCookiePfade(falsch), falsch).toThrow();
    expect(() => pruefCookieZeilen(token, { ...cookie, wert: "x; Path=/" }, true)).toThrow();
    expect(() => pruefCookieZeilen(token, { ...cookie, name: "sitzung" }, true)).toThrow();
  });
  it("Seiten und Schnittstellen für Patienten setzen kein Cookie unter \"/\"", () => {
    // Cookies mit Pfad "/" setzen nur Praxis-Gerät (Empfangsmodus, Übergabe), Praxis-Sitzung, Bereich und Vorschau-Zugang.
    const ordner = ["app/portal", "app/api/portal", "app/a", "app/api/a", "app/t", "app/api/t", "app/p", "app/meine-praxen"];
    const dateien = ordner.flatMap((o) => (existsSync(join(WURZEL, o)) ? lauf(o) : []));
    expect(dateien.length).toBeGreaterThan(20);
    for (const d of dateien) {
      const q = ohneKommentare(lies(d));
      expect(q, d).not.toMatch(/path:\s*["'`]\/["'`]|Path=\/[;"'`]/);
      expect(q, d).not.toMatch(/cookies(\(\))?\.set\(/);
    }
    const route = ohneKommentare(lies("app/api/portal/[token]/pruefung/route.ts"));
    expect(route).toMatch(/for \(const zeile of pruefCookieZeilen\(params\.token, erg\.cookie, sicher\)\) res\.headers\.append\("Set-Cookie", zeile\)/);
  });
});

describe("/meine-praxen: nur auf dem Gerät", () => {
  // Alle Dateien, die die Seite einbindet (über "@/…"), damit auch ein späterer Umweg über einen Baustein auffällt.
  function einbindungen(start: string[]): Set<string> {
    const gesehen = new Set<string>();
    const offen = [...start];
    while (offen.length) {
      const datei = offen.pop()!;
      if (gesehen.has(datei)) continue;
      gesehen.add(datei);
      for (const m of lies(datei).matchAll(/from\s+["']@\/([^"']+)["']/g)) {
        const basis = m[1];
        const ziel = [`${basis}.ts`, `${basis}.tsx`, `${basis}/index.ts`].find((p) => existsSync(join(WURZEL, p)));
        if (ziel && !/^(prisma|node_modules)/.test(ziel)) offen.push(ziel);
        else if (!ziel) gesehen.add(`@/${basis}`);
      }
    }
    return gesehen;
  }
  const seite = lauf("app/meine-praxen");
  const alle = einbindungen(seite);

  it("weder die Seite noch ein eingebundener Baustein lädt die Datenbank", () => {
    expect(seite.length).toBeGreaterThanOrEqual(2);
    expect([...alle].filter((d) => /lib\/prisma|@prisma\/client|portalAuth|portalKopf/.test(d))).toEqual([]);
  });
  it("beim Öffnen geht kein Aufruf an den Server: kein fetch, keine Schnittstelle", () => {
    for (const d of [...alle].filter((x) => existsSync(join(WURZEL, x)))) {
      const q = ohneKommentare(lies(d));
      expect(q, d).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket/);
      expect(q, d).not.toMatch(/["'`]\/api\//);
    }
  });
  it("öffnet je Karte genau ein Portal", () => {
    const liste = lies("components/MeinePraxen.tsx");
    expect(liste).toMatch(/href=\{pfad\}/);
    expect(liste).toMatch(/const pfad = portalPfad\(p\.token\)/);
  });
  it("lädt kein Portal vorab: gewöhnliche Links statt next/link, kein prefetch, kein Router", () => {
    // next/link lädt sichtbare Ziele im Hintergrund vor. Auf /meine-praxen ginge damit beim Öffnen der Liste jedes
    // gemerkte Portal an den Server, alle in einem Moment. Das prüft auch e2e/meine-praxen.js im Browser.
    for (const d of ["app/meine-praxen/page.tsx", "components/MeinePraxen.tsx", "components/MeineAngaben.tsx", "components/PraxisMerken.tsx"]) {
      const q = ohneKommentare(lies(d));
      expect(q, d).not.toMatch(/next\/link|next\/navigation|\bprefetch\b|prerender|speculationrules|useRouter|\brouter\./i);
    }
  });
  it("ist auf der Vorschau-Domain frei, für Suchmaschinen gesperrt und ohne Referrer", async () => {
    expect(freiOhneZugang("/meine-praxen")).toBe(true);
    expect(freiOhneZugang("/meine-praxen/manifest.webmanifest")).toBe(true);
    expect(freiOhneZugang("/meine-praxen/etwas-anderes")).toBe(false);
    const regeln: { source: string; headers: { key: string; value: string }[] }[] = await createRequire(import.meta.url)(join(WURZEL, "next.config.js")).headers();
    const regel = regeln.find((r) => r.source.includes("meine-praxen"));
    expect(regel?.headers).toEqual(expect.arrayContaining([{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }]));
    expect(lies("app/robots.ts")).toMatch(/"\/meine-praxen"/);
    const manifest = lies("app/meine-praxen/manifest.webmanifest/route.ts");
    expect(manifest).toMatch(/scope: "\/meine-praxen"/);
    // Aus der Adresse kommt nur die Sprache (searchParams.get("lang")), nie ein Token oder eine Praxis.
    expect(ohneKommentare(manifest)).not.toMatch(/token|prisma|cookies|headers\(|\bparams\b/i);
    expect(ohneKommentare(manifest).match(/searchParams\.get\(["'](\w+)["']\)/g)).toEqual(['searchParams.get("lang")']);
  });
  it("öffnet vom Home-Bildschirm im Browser, nicht als eigene Web-App mit eigenem Speicher (iPhone)", () => {
    expect(ohneKommentare(lies("app/meine-praxen/manifest.webmanifest/route.ts"))).toMatch(/display: "browser"/);
    const seite = ohneKommentare(lies("app/meine-praxen/page.tsx"));
    expect(seite).toMatch(/appleWebApp: \{ capable: false/);
    expect(seite).toMatch(/data-testid="meine-praxen-nur-browser">\{t\.nurBrowser\}/);
  });
});

describe("Speicher auf dem Gerät: nur an den vorgesehenen Stellen", () => {
  it("jeder Schlüssel steht nur in seiner Datei", () => {
    expect(QUELLEN.filter((d) => lies(d).includes("sorrida:meine-praxen"))).toEqual(["lib/meinePraxen.ts"]);
    expect(QUELLEN.filter((d) => lies(d).includes("sorrida:meine-angaben"))).toEqual(["lib/meineAngaben.ts"]);
  });
  it("lib/geraeteSpeicher.ts binden nur die Bausteine für Patienten ein, nie die Praxis-App oder der Empfangsmodus", () => {
    const nutzer = QUELLEN.filter((d) => /from\s+["']@\/lib\/geraeteSpeicher["']/.test(lies(d)));
    expect(nutzer.sort()).toEqual(["components/AnamneseGeraet.tsx", "components/MeineAngaben.tsx", "components/MeinePraxen.tsx", "components/PraxisMerken.tsx"]);
    const merkenNutzer = QUELLEN.filter((d) => /from\s+["']@\/components\/(PraxisMerken|MeinePraxen)["']/.test(lies(d)));
    expect(merkenNutzer.sort()).toEqual(["app/meine-praxen/page.tsx", "app/portal/[token]/page.tsx", "components/PortalUngueltig.tsx"]);
    // Kopien eigener Angaben: nur im Bogen auf dem Gerät des Patienten (/a, Portal) und auf /meine-praxen.
    const bogenNutzer = QUELLEN.filter((d) => /from\s+["']@\/components\/AnamneseGeraet["']/.test(lies(d)));
    expect(bogenNutzer.sort()).toEqual(["app/a/[token]/page.tsx", "app/portal/[token]/anamnese/[id]/page.tsx"]);
    expect(QUELLEN.filter((d) => /from\s+["']@\/components\/MeineAngaben["']/.test(lies(d)))).toEqual(["app/meine-praxen/page.tsx"]);
    // Den Speicher liest der Bogen selbst nie; am Empfang (app/uebergabe) gibt es nur den Bogen ohne Gerät.
    for (const d of ["components/AnamnesisForm.tsx", ...lauf("app/uebergabe"), ...lauf("app/(app)")]) {
      expect(lies(d), d).not.toMatch(/from\s+["']@\/(lib\/geraeteSpeicher|lib\/meineAngaben\w*|components\/AnamneseGeraet|components\/MeineAngaben)["']/);
    }
  });
  it("die Übernahme erscheint nur, wenn der Server es erlaubt (eigenes Gerät, keine Praxis-Sitzung, kein Empfangsmodus)", () => {
    for (const d of ["app/a/[token]/page.tsx", "app/portal/[token]/anamnese/[id]/page.tsx"]) {
      const q = ohneKommentare(lies(d));
      expect(q, d).toMatch(/const eigenesGeraet = darfAufGeraetMerken\(\(await cookies\(\)\)\.getAll\(\)\.map\(\(c\) => c\.name\)\)/);
      expect(q, d).toMatch(/\{eigenesGeraet \? \(\s*<AnamneseGeraet/);
      expect(q.match(/<AnamneseGeraet\b/g), d).toHaveLength(1);
    }
  });
  it("der Knopf erscheint nur, wenn der Server es erlaubt (keine Praxis-Sitzung, kein Empfangsmodus)", () => {
    const portal = lies("app/portal/[token]/page.tsx");
    expect(portal).toMatch(/const merkenErlaubt = darfAufGeraetMerken\(\(await cookies\(\)\)\.getAll\(\)\.map\(\(c\) => c\.name\)\)/);
    expect(portal).toMatch(/\{merkenErlaubt && \(\s*<PraxisMerken/);
    // Beim Laden des Portals wird der Speicher nicht gelesen: erst der Klick.
    const knopf = ohneKommentare(lies("components/PraxisMerken.tsx"));
    expect(knopf).not.toMatch(/useEffect/);
    expect(knopf).toMatch(/function klick\((wahl\?: MerkWahl)?\) \{\s*const lese = gemerktePraxenLesen\(\)/);
    expect(knopf.match(/function klick\(/g)).toHaveLength(2);
    expect(knopf.match(/const lese = gemerktePraxenLesen\(\)/g)).toHaveLength(2);
  });
  it("die Seite „Link nicht mehr gültig“ bietet das Entfernen nur unter derselben Regel an", () => {
    const seite = ohneKommentare(lies("components/PortalUngueltig.tsx"));
    expect(seite).toMatch(/darfAufGeraetMerken\(\(await cookies\(\)\)\.getAll\(\)\.map\(\(c\) => c\.name\)\)/);
    expect(seite).toMatch(/\{aufGeraet && \(\s*<>[\s\S]*<GemerktEntfernen token=\{token\}/);
    const portal = ohneKommentare(lies("app/portal/[token]/page.tsx"));
    expect(portal.match(/<PortalUngueltig token=\{params\.token\} lang=\{searchParams\.lang\} \/>/g)).toHaveLength(2);
    // Alle Unterseiten zeigen dieselbe Seite.
    for (const d of ["fragen", "modell", "termin"]) expect(ohneKommentare(lies(`app/portal/[token]/${d}/page.tsx`)), d).toMatch(/<PortalUngueltig token=\{params\.token\}/);
  });
});

describe("Texte für „Meine Praxen auf diesem Gerät“", () => {
  it("gibt es in jeder Portalsprache, vollständig und übersetzt", () => {
    const de = GERAET_UI.de as Record<string, string>;
    for (const l of PORTAL_LANGS) {
      const t = GERAET_UI[l] as Record<string, string>;
      expect(Object.keys(t).sort(), l).toEqual(Object.keys(de).sort());
      for (const [k, v] of Object.entries(t)) {
        expect(v.trim(), `${l}.${k}`).not.toBe("");
        if (l !== "de") expect(v, `${l}.${k}`).not.toBe(de[k]);
        for (const platz of de[k].match(/\{(name|datum)\}/g) ?? []) expect(v, `${l}.${k}`).toContain(platz);
      }
      expect(t.einleitung, l).toMatch(/Sorrida/);
    }
  });
  it("sagt auf Deutsch, was die Liste ist, in kurzen Sätzen ohne Gedankenstriche", () => {
    expect(GERAET_UI.de.einleitung).toBe("Diese Liste liegt nur auf diesem Gerät. Die Praxen sehen sie nicht und erfahren nichts voneinander. Sorrida verbindet Ihre Daten nicht.");
    expect(GERAET_UI.de.merken).toBe("Diese Praxis auf diesem Gerät merken");
    for (const [k, v] of Object.entries(GERAET_UI.de)) {
      expect(v, k).not.toMatch(/ [–—-] /);
      for (const satz of v.split(/(?<=[.!?])\s+/)) expect(satz.split(/\s+/).length, `${k}: ${satz}`).toBeLessThanOrEqual(16);
    }
  });
  it("schreibt Arabisch in arabischer Schrift (nur Sorrida bleibt)", () => {
    for (const [k, v] of Object.entries(GERAET_UI.ar)) {
      expect(v, k).toMatch(/[؀-ۿ]/);
      for (const w of v.replace(/\{(name|datum)\}/g, "").match(/[A-Za-zÄÖÜäöüß]{2,}/g) ?? []) expect(w, `ar.${k}`).toBe("Sorrida");
    }
  });
});

describe("Rechtstexte nennen die Brücke", () => {
  it("die Datenschutzerklärung beschreibt den Speicher auf dem Gerät mit allen Feldern", () => {
    const seite = lies("app/datenschutz/page.tsx").replace(/\s+/g, " ");
    expect(seite).toMatch(/id="meine-praxen"/);
    for (const wort of ["nur", "Link zum Portal", "Vorname der Person, für die der Link gilt", "Name, Fach und Ort der Praxis", "Art der Praxis", "nur in diesem Browser", "Gastzugang", "nach unserer Einschätzung", "bis wann der Link gilt", "wann Sie ihn gemerkt haben", "eigener Name", "weder an unseren Server noch an eine Praxis", "löschen"]) expect(seite).toContain(wort);
  });
  it("die Datenschutzerklärung beschreibt die Kopie eigener Angaben mit allen Feldern", () => {
    const seite = lies("app/datenschutz/page.tsx").replace(/\s+/g, " ");
    expect(seite).toMatch(/id="meine-angaben"/);
    for (const wort of [
      "Erst wenn Sie auf „Kopie meiner Angaben auf diesem Gerät behalten“ tippen",
      "Ohne diesen Klick wird nichts gespeichert.",
      "PBKDF2 (SHA-256, 600.000 Durchläufe, zufälliger Salt)",
      "AES-GCM (256 Bit, zufälliger Startwert)",
      "Der Code verlässt Ihr Gerät nicht, und wir speichern ihn nirgends.",
      "so gekennzeichnet, dass Browser und Passwort-Manager den Code nicht speichern sollen",
      "Die Kopie ist nur so sicher wie Ihr Code",
      "zur Verhütung oder zu verschriebenen Salben, kommen nicht in die Kopie",
      "Die Seite sagt Ihnen dann, wie viele Kopien gelöscht wurden.",
      "Einträge im Protokoll löscht Ihr Browser ebenso 12 Monate nach ihrem Tag.",
      "einen Anamnesebogen, bei einer anderen oder derselben Praxis",
      "zeigt die Seite nur auf Ihren Klick auf „Herkunft der Kopie anzeigen“",
      "Ein Tablet der Praxis, auf dem gerade niemand angemeldet ist, erkennt die Seite aber nicht sicher.",
      "Nicht gespeichert werden Ihr Name, Ihr Geburtsdatum, Ihre Wünsche, Ihre Hinweise und der Link.",
      "Es gibt höchstens 5 Kopien.",
      "Ab 12 Monaten nach ihrem Stand",
      "Woher die Angaben stammen, erfährt sie nicht.",
      "Die Praxis, aus deren Bogen die Kopie stammt, erfährt von der Übernahme nichts.",
      "Unser Server erhält weder die Kopie noch den Code",
      "Protokoll, höchstens 20 Einträge",
      "Gastzugang",
    ]) expect(seite).toContain(wort);
  });
  it("die Zahlen in der Datenschutzerklärung stimmen mit dem Code überein", async () => {
    const m = await import("@/lib/meineAngaben");
    const seite = lies("app/datenschutz/page.tsx").replace(/\s+/g, " ");
    expect(seite).toContain(`${m.PBKDF2_DURCHLAEUFE.toLocaleString("de-DE")} Durchläufe`);
    expect(seite).toContain(`mindestens ${m.MIN_CODE} Zeichen, darunter Buchstaben`);
    // Die Beispiele für sehr einfache Codes lehnt der Code wirklich ab.
    for (const beispiel of ["abcdefgh", "Passwort1"]) {
      expect(seite).toContain(`„${beispiel}“`);
      expect(m.codeMangel(beispiel), beispiel).toBe("einfach");
    }
    expect(seite).toContain(`„${ANGABEN_UI.de.herkunft}“`);
    expect(seite).toContain(`höchstens ${m.MAX_KOPIEN} Kopien`);
    expect(seite).toContain(`Ab ${m.GUELTIG_MONATE} Monaten`);
    expect(seite).toContain(`höchstens ${m.MAX_PROTOKOLL} Einträge`);
  });
  it("das AVV-Muster sagt zu, dass Sorrida keine Mandanten verknüpft und nicht abgleicht", () => {
    const avv = lies("app/avv/page.tsx").replace(/\s+/g, " ");
    expect(avv).toContain("Sorrida verknüpft die Daten der Praxis nicht mit Daten anderer Praxen.");
    expect(avv).toMatch(/nicht über Praxen hinweg ab, weder über Name, Geburtsdatum, Kontaktdaten oder Versichertennummer noch als Hashwert/);
    expect(avv).toMatch(/keine Schnittstelle nimmt Links mehrerer Praxen in einem Aufruf an/);
  });
  it("das AVV-Muster beschreibt die Kopie eigener Angaben: nur auf Klick, verschlüsselt, ohne Herkunft", () => {
    const avv = lies("app/avv/page.tsx").replace(/\s+/g, " ");
    expect(avv).toMatch(/data-testid="avv-meine-angaben"/);
    for (const wort of [
      "Das geschieht nur auf ihren Klick und nur in ihrem Browser.",
      "Sorrida erhält weder die Kopie noch den Code.",
      "Die Praxis, aus deren Bogen die Kopie stammt, erfährt nichts von einer Übernahme.",
      "Sie erfährt nicht, aus welcher Praxis oder welchem Fach die Angaben stammen.",
    ]) expect(avv).toContain(wort);
    const trennung = /<li><b>Trennung:<\/b>(.*?)<\/li>/.exec(avv)![1];
    for (const wort of ["nur auf seinen Klick", "verschlüsselt mit seinem Code nur in seinem Browser", "Sorrida erhält weder Kopie noch Code", "erfährt die erste Praxis nichts", "mit dem Stand, ohne Herkunft"]) expect(trennung).toContain(wort);
  });
});

describe("Eigene Angaben mitnehmen: keine Verbindung auf dem Server", () => {
  const routen = lauf("app", /^route\.ts$/);
  const ANAMNESE_ROUTEN = ["app/api/a/[token]/route.ts", "app/api/portal/[token]/anamnese/[id]/route.ts"];

  it("keine neue Schnittstelle: Kopien, Code und Protokoll gehen an keine Route", () => {
    for (const r of routen) {
      expect(r, r).not.toMatch(/angaben|kopie|bruecke|vorbefuell/i);
      const q = ohneKommentare(lies(r));
      expect(q, r).not.toMatch(/geraeteSpeicher|meineAngaben|meine-angaben|meineAngabenUebernahme/);
    }
    // Den Stand der übernommenen Angaben nehmen nur die beiden Bögen auf dem Gerät des Patienten an.
    expect(routen.filter((r) => /vorbefuellt/.test(ohneKommentare(lies(r)))).sort()).toEqual(ANAMNESE_ROUTEN);
    for (const r of ANAMNESE_ROUTEN) {
      const q = ohneKommentare(lies(r));
      expect(q, r).toMatch(/anamnesePruefen\(await req\.json\(\)\.catch\(\(\) => null\), profil, \{ altbestand: !form\.fach, vorbefuelltErlaubt: true \}\)/);
      expect(q, r).toMatch(/vorbefuelltStand: geprueft\.vorbefuelltStand \}/);
    }
    // Am Empfang (Gerät der Praxis) gibt es keine Übernahme: Der Server lehnt „vorbefuellt“ dort ab.
    expect(ohneKommentare(lies("app/api/empfang/patient/anamnese/[id]/route.ts"))).not.toMatch(/vorbefuellt/);
  });

  it("der Bogen schickt nur den Stand und die Bestätigung, keine Herkunft", () => {
    const bogen = ohneKommentare(lies("components/AnamnesisForm.tsx"));
    expect(bogen.match(/\bvorbefuellt\s*:/g)).toHaveLength(1);
    expect(bogen).toContain("vorbefuellt: vorbef ? { stand: vorbef.stand, geprueft: true } : undefined");
    expect(bogen).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    // Lesen, Entschlüsseln und Speichern geschehen ohne Aufruf an den Server.
    for (const d of ["components/AnamneseGeraet.tsx", "components/MeineAngaben.tsx", "lib/meineAngaben.ts", "lib/meineAngabenUebernahme.ts", "lib/geraeteSpeicher.ts"]) {
      const q = ohneKommentare(lies(d));
      expect(q, d).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket|["'`]\/api\//);
      expect(q, d).not.toMatch(/next\/link|\bprefetch\b|useRouter/);
    }
  });

  it("der Server kennt nur den Stand: keine Spalte für Herkunft, Praxis, Fach oder Kopie", () => {
    const modell = /^model AnamnesisForm \{([\s\S]*?)^\}/m.exec(lies("prisma/schema.prisma"))![1];
    expect(modell).toMatch(/^\s+vorbefuelltStand\s+DateTime\?$/m);
    expect(modell).not.toMatch(/^\s+\w*(herkunft|quelle|kopie|vorbefuellt(?!Stand))\w*\s/im);
    const migration = lies("prisma/migrations/20261118500000_anamnese_vorbefuellt/migration.sql");
    expect(ohneKommentare(migration).replace(/^--.*$/gm, "").trim()).toBe('ALTER TABLE "AnamnesisForm" ADD COLUMN "vorbefuelltStand" TIMESTAMP(3);');
    // Auf dem Server nutzt nur lib/anamnesis.ts etwas aus lib/meineAngaben.ts, und nur die Frist. Die übrigen Nutzer
    // laufen nur im Browser (lib/geraeteSpeicher.ts, lib/meineAngabenUebernahme.ts, eingebunden nur von Bausteinen).
    const nutzer = QUELLEN.filter((d) => !/^components\//.test(d) && /from\s+["']@\/lib\/(meineAngaben|meineAngabenUebernahme)["']/.test(lies(d)));
    expect(nutzer.sort()).toEqual(["lib/anamnesis.ts", "lib/geraeteSpeicher.ts", "lib/meineAngabenUebernahme.ts"]);
    expect(QUELLEN.filter((d) => /from\s+["']@\/lib\/meineAngabenUebernahme["']/.test(lies(d)))).toEqual(["components/AnamneseGeraet.tsx"]);
    expect(lies("lib/anamnesis.ts")).toMatch(/import \{ GUELTIG_MONATE \} from "@\/lib\/meineAngaben";/);
  });

  it("Akte und Eingang zeigen nur den Hinweis mit dem Stand, nichts über eine andere Praxis", () => {
    const sicht = ohneKommentare(lies("lib/anamnesisView.ts"));
    expect(sicht.match(/vorbefuellt\w*/g)?.sort()).toEqual(["vorbefuelltStand", "vorbefuelltStand", "vorbefuelltStand", "vorbefuelltStand"]);
    expect(sicht).toMatch(/vorbefuelltStand: done\?\.vorbefuelltStand \? done\.vorbefuelltStand\.toISOString\(\)\.slice\(0, 10\) : null/);
    // Der Hinweis steht bei den Hinweisen aus der Anamnese: in der Akte, beim Abschluss und in der Einbettung.
    const hinweis = ohneKommentare(lies("components/AnamnesisFlags.tsx")).replace(/\s+/g, " ");
    expect(hinweis).toContain("Teilweise mit gespeicherten Angaben des Patienten vorausgefüllt (Stand ");
    expect(hinweis).toContain("), vom Patienten geprüft.");
    expect(hinweis.replace('data-testid="anamnese-vorbefuellt"', "").match(/vorbefuellt\w*/g)?.every((w) => w === "vorbefuelltStand")).toBe(true);
    expect(ohneKommentare(lies("components/AnamnesisPanel.tsx"))).toContain("vorbefuelltStand={summary.vorbefuelltStand}");
    expect(ohneKommentare(lies("components/TreatmentWrapUp.tsx"))).toContain("vorbefuelltStand={anamnesis.vorbefuelltStand}");
    for (const seite of ["app/(app)/abschluss/new/page.tsx", "app/embed/patient/[id]/page.tsx"]) expect(lies(seite), seite).toMatch(/loadAnamnesis\(/);
    // Eingang, Praxis-App und Empfang wissen nichts von Kopien auf Geräten.
    const praxis = [...lauf("app/(app)"), ...lauf("app/uebergabe"), "lib/eingang.ts", ...QUELLEN.filter((d) => /^components\/(Eingang|Inbox)/.test(d))];
    for (const d of praxis) expect(ohneKommentare(lies(d)), d).not.toMatch(/vorbefuellt|meineAngaben|Meine Angaben auf diesem Gerät/);
    const ANZEIGE = ["components/AnamnesisPanel.tsx", "components/AnamnesisFlags.tsx", "components/TreatmentWrapUp.tsx", "lib/anamnesisView.ts", "lib/anamnesis.ts"];
    for (const d of QUELLEN.filter((x) => !ANZEIGE.includes(x) && /vorbefuelltStand/.test(lies(x)))) {
      expect(["app/api/a/[token]/route.ts", "app/api/portal/[token]/anamnese/[id]/route.ts"], d).toContain(d);
    }
  });
});

describe("Texte für „Meine Angaben auf diesem Gerät“", () => {
  const PLATZ = /\{(name|datum|anzahl|gesamt|praxis|fach)\}/g;
  it("gibt es in jeder Portalsprache, vollständig, übersetzt und mit denselben Platzhaltern", () => {
    const de = ANGABEN_UI.de as Record<string, string>;
    for (const l of PORTAL_LANGS) {
      const t = ANGABEN_UI[l] as Record<string, string>;
      expect(Object.keys(t).sort(), l).toEqual(Object.keys(de).sort());
      for (const [k, v] of Object.entries(t)) {
        expect(v.trim(), `${l}.${k}`).not.toBe("");
        if (l !== "de") expect(v, `${l}.${k}`).not.toBe(de[k]);
        expect((v.match(PLATZ) ?? []).sort(), `${l}.${k}`).toEqual((de[k].match(PLATZ) ?? []).sort());
      }
    }
  });
  it("nennt die Knöpfe wie vereinbart und schreibt Deutsch in kurzen Sätzen ohne Gedankenstriche", () => {
    expect(ANGABEN_UI.de.behalten).toBe("Kopie meiner Angaben auf diesem Gerät behalten");
    expect(ANGABEN_UI.de.uebernehmen).toBe("Angaben von diesem Gerät übernehmen");
    expect(ANGABEN_UI.de.geprueft).toBe("Ich habe alle übernommenen Angaben geprüft. Sie sind aktuell.");
    expect(ANGABEN_UI.de.abschnitt).toBe("Meine Angaben auf diesem Gerät");
    expect(ANGABEN_UI.de.standardName).toBe("Meine Angaben");
    expect(ANGABEN_UI.de.codeVergessen).toMatch(/löschen Sie die Kopie/);
    for (const [k, v] of Object.entries(ANGABEN_UI.de)) {
      expect(v, k).not.toMatch(/ [–—-] /);
      for (const satz of v.split(/(?<=[.!?])\s+/)) expect(satz.split(/\s+/).length, `${k}: ${satz}`).toBeLessThanOrEqual(16);
    }
  });
  it("schreibt Arabisch in arabischer Schrift (nur Sorrida bleibt)", () => {
    for (const [k, v] of Object.entries(ANGABEN_UI.ar)) {
      expect(v, k).toMatch(/[؀-ۿ]/);
      for (const w of v.replace(PLATZ, "").match(/[A-Za-zÄÖÜäöüß]{2,}/g) ?? []) expect(w, `ar.${k}`).toBe("Sorrida");
    }
  });
  it("verspricht nichts, was der Code nicht hält: 5 Kopien, 12 Monate, 8 Zeichen", async () => {
    const m = await import("@/lib/meineAngaben");
    expect(ANGABEN_UI.de.voll).toContain(`${m.MAX_KOPIEN} Kopien`);
    expect(ANGABEN_UI.de.verfallen).toContain(`${m.GUELTIG_MONATE} Monate`);
    expect(ANGABEN_UI.de.codeNeu).toContain(`${m.MIN_CODE} Zeichen`);
    expect(ANGABEN_UI.de.codeZuKurz).toContain(`${m.MIN_CODE} Zeichen`);
  });
});

describe("Bogen mit Kopie: Code, Herkunft, Sprache, Hinweise (Prüfung vom 17.11.2026)", () => {
  const geraet = ohneKommentare(lies("components/AnamneseGeraet.tsx"));
  it("kein Feld für den Code lädt Browser oder Passwort-Manager zum Speichern ein", () => {
    expect(geraet).not.toMatch(/new-password|current-password/);
    const merken = /const NICHT_MERKEN = \{([^}]*)\}/.exec(geraet)![1];
    for (const teil of ['autoComplete: "off"', '"data-1p-ignore": "true"', '"data-lpignore": "true"', '"data-bwignore": "true"']) expect(merken).toContain(teil);
    const felder = [...geraet.matchAll(/<input[^>]*type="password"[^>]*>/g)].map((m) => m[0]);
    expect(felder).toHaveLength(3);
    for (const f of felder) expect(f).toContain("{...NICHT_MERKEN}");
    expect(ANGABEN_UI.de.codeHinweis).toContain("lehnen Sie bitte ab");
  });
  it("prüft den Code mit codeMangel und nennt jeden Grund", () => {
    expect(geraet).toMatch(/const mangel = codeMangel\(code1\)/);
    for (const k of ["codeZuKurz", "codeOhneBuchstaben", "codeEinfach"]) expect(geraet).toContain(`t.${k}`);
    expect(ANGABEN_UI.de.behaltenSicher).toContain("wer den Code kennt oder errät");
    expect(ANGABEN_UI.de.behaltenSicher).not.toMatch(/kann sie lesen/);
  });
  it("zeigt den Namen der ersten Praxis nur auf Klick, den Hinweis „erfährt nichts“ immer", () => {
    expect(geraet.match(/t\.quelle\b/g)).toHaveLength(1);
    expect(geraet).toMatch(/<details[^>]*data-testid="angaben-herkunft">\s*<summary[^>]*>\{t\.herkunft\}<\/summary>\s*<p[^>]*>\{fuellen\(t\.quelle, \{ praxis: herkunft \}\)\}<\/p>/);
    expect(geraet).toContain("t.quelleNichts");
    expect(ANGABEN_UI.de.quelle).toBe("Aus dem Bogen von {praxis}.");
  });
  it("sagt, was lesbar bleibt, und warnt vor geteilten Geräten", () => {
    expect(ANGABEN_UI.de.behaltenWas).toContain("der Name dieser Praxis");
    expect(ANGABEN_UI.de.behaltenWas).toContain("Nicht verschlüsselt sind nur der Name der Kopie, der Tag und die Art der Praxis.");
    expect(ANGABEN_UI.de.bezeichnungHinweis).toContain("nicht verschlüsselt");
    expect(ANGABEN_UI.de.geteilt).toContain("Tablet der Praxis");
    expect(geraet).toMatch(/border-amber-200 bg-amber-50[^"]*" data-testid="angaben-geteilt">\{t\.geteilt\}/);
  });
  it("meldet abgelaufene Kopien im Bogen und unterscheidet falschen Code, kaputte Kopie und Browser", () => {
    expect(geraet).toMatch(/stand\.abgelaufen > 0 \? fuellen\(t\.abgelaufenGeloescht/);
    expect(geraet).toContain("err instanceof FalscherCode ? t.falscherCode : err instanceof KopieKaputt ? t.kopieKaputt : t.oeffnenNichtMoeglich");
  });
  it("Texte in der Portalsprache stehen auch im deutschen Bogen mit lang und dir", () => {
    const bogen = ohneKommentare(lies("components/AnamnesisForm.tsx"));
    expect(bogen.match(/lang=\{geraet\.lang\} dir=\{geraet\.dir\}/g)).toHaveLength(3);
    expect(bogen).toMatch(/lang=\{geraet && error === geraet\.gepruefFehlt \? geraet\.lang : undefined\}/);
    expect(geraet).toMatch(/gepruefFehlt: t\.gepruefFehlt,\s*lang,\s*dir,/);
  });
  it("sagt dem Patienten, was die Praxis dieses Bogens sieht: Hinweis mit Stand, keine Herkunft", () => {
    // Was die Praxis sieht, steht in components/AnamnesisFlags.tsx: „… vorausgefüllt (Stand …), vom Patienten geprüft.“
    expect(ANGABEN_UI.de.praxisSieht).toBe(
      "Diese Praxis sieht am Bogen, dass Sie Angaben vom Gerät übernommen und geprüft haben. Sie sieht auch den Stand der Kopie: {datum}. Woher die Angaben stammen, sieht sie nicht.",
    );
    // Nach der Übernahme, neben dem Satz zur Praxis der Kopie …
    expect(geraet).toContain("fuellen(t.praxisSieht, { datum: datum(kopie.stand) }), t.quelleNichts]");
    expect(geraet).toContain("praxisSieht: (stand) => fuellen(t.praxisSieht, { datum: datum(stand) }),");
    // … und am Haken „geprüft“ vor dem Senden, mit dem Haken verbunden.
    const bogen = ohneKommentare(lies("components/AnamnesisForm.tsx"));
    expect(bogen).toContain("{geraet.praxisSieht(vorbef.stand)}");
    expect(bogen).toContain('aria-describedby={error === geraet.gepruefFehlt ? "anamnese-fehler vorbefuellt-praxis-sieht" : "vorbefuellt-praxis-sieht"}');
    expect(bogen).toMatch(/<p id="vorbefuellt-praxis-sieht" lang=\{geraet\.lang\} dir=\{geraet\.dir\}/);
  });
});
