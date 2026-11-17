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
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { GERAET_UI, PORTAL_LANGS } from "@/lib/portalI18n";
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

/** Wert hinter `name:` bzw. `name =` (Objekt, Aufruf oder Name) im Text ab Stelle `ab`. */
function wertAb(text: string, ab: number): string {
  let i = ab;
  while (/\s/.test(text[i] ?? "")) i++;
  if ("{[(".includes(text[i])) return text.slice(i, bisZu(text, i));
  const name = /^[\w$.!]+/.exec(text.slice(i))?.[0] ?? "";
  const nach = i + name.length;
  return text[nach] === "(" ? text.slice(i, bisZu(text, nach)) : name;
}

/** Bedingung (where) eines Prisma-Aufrufs, samt der Konstanten aus derselben Datei, die darin vorkommen. */
function bedingung(datei: string, argument: string): string {
  const m = /\bwhere\b\s*(:|,|\})/.exec(argument);
  if (!m) return "";
  let text = m[1] === ":" ? wertAb(argument, m.index + m[0].length) : "where";
  for (let runde = 0; runde < 2; runde++) {
    for (const name of new Set(text.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])) {
      const d = new RegExp(`\\b(?:const|let)\\s+${name.replace(/\$/g, "\\$")}\\b[^=;]*=`).exec(datei);
      if (d) text += " " + wertAb(datei, d.index + d[0].length);
    }
  }
  return text;
}

const PATIENT_AUFRUF = /\.patient\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|groupBy|aggregate|updateMany|deleteMany)\s*\(/g;
const KENNZEICHEN = /\b(firstName|lastName|birthDate|email|phone|insuranceNumber|patientNummer)\b/;
const MANDANT = /\b(practiceId|portalTokenHash)\b/;

function patientenAbfragen(quelle: string) {
  const text = ohneKommentare(quelle);
  const aus: { zeile: number; where: string; argument: string }[] = [];
  for (const m of text.matchAll(PATIENT_AUFRUF)) {
    const auf = m.index! + m[0].length - 1;
    const argument = text.slice(auf, bisZu(text, auf));
    aus.push({ zeile: text.slice(0, m.index).split("\n").length, where: bedingung(text, argument), argument });
  }
  return aus;
}
/** Sucht die Abfrage Patienten über persönliche Kennzeichen, ohne auf eine Praxis oder einen Link begrenzt zu sein? */
const sucheOhnePraxis = (where: string) => KENNZEICHEN.test(where) && !MANDANT.test(where);

// Begründete Ausnahmen (Datei:Zeile → Grund). Derzeit keine.
const AUSNAHMEN: Record<string, string> = {};

describe("Patienten werden nie über Praxen hinweg gesucht", () => {
  it("der Prüfer erkennt eine Suche ohne Praxis und lässt eine begrenzte durch", () => {
    const schlecht = patientenAbfragen(`const a = await prisma.patient.findMany({ where: { email: e } });
      const b = await tx.patient.findFirst({ where: { firstName: v, lastName: n, birthDate: g }, select: { id: true } });
      const w = { OR: [{ phone: t }] }; const c = await prisma.patient.count({ where: w });`);
    expect(schlecht.map((a) => sucheOhnePraxis(a.where))).toEqual([true, true, true]);
    const gut = patientenAbfragen(`const a = await prisma.patient.findMany({ where: { practiceId, email: e } });
      const where = { practiceId: s.user.practiceId, AND: [{ lastName: q }] }; const b = await prisma.patient.findMany({ where, orderBy: { lastName: "asc" } });
      const c = await prisma.patient.findUnique({ where: { portalTokenHash: h }, select: { firstName: true, birthDate: true } });
      const meine = meinePatientenWhere(practiceId, u); const d = await prisma.patient.findMany({ where: { AND: [meine, { firstName: q }] } });`);
    expect(gut.map((a) => sucheOhnePraxis(a.where))).toEqual([false, false, false, false]);
  });

  it("keine Abfrage in app, lib und components sucht Patienten über Name, Geburtsdatum, E-Mail, Telefon oder Versichertennummer ohne practiceId", () => {
    let gezaehlt = 0;
    const funde: string[] = [];
    for (const datei of QUELLEN) {
      for (const a of patientenAbfragen(lies(datei))) {
        gezaehlt++;
        if (sucheOhnePraxis(a.where) && !AUSNAHMEN[`${datei}:${a.zeile}`]) funde.push(`${datei}:${a.zeile} ${a.where.replace(/\s+/g, " ").slice(0, 140)}`);
      }
    }
    expect(gezaehlt, "der Prüfer findet die Abfragen").toBeGreaterThan(40);
    expect(funde).toEqual([]);
  });

  it("Seiten und Routen unter app/portal laden Patienten nur über den Link", () => {
    const funde: string[] = [];
    for (const datei of lauf("app/portal")) {
      const quelle = lies(datei);
      for (const a of patientenAbfragen(quelle)) {
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
    expect(ohneKommentare(manifest)).not.toMatch(/token|prisma|params|cookies|headers\(/i);
  });
});

describe("Speicher auf dem Gerät: nur an den vorgesehenen Stellen", () => {
  it("der Schlüssel steht nur in lib/meinePraxen.ts", () => {
    expect(QUELLEN.filter((d) => lies(d).includes("sorrida:meine-praxen"))).toEqual(["lib/meinePraxen.ts"]);
  });
  it("lib/geraeteSpeicher.ts binden nur die beiden Bausteine für Patienten ein, nie die Praxis-App oder der Empfangsmodus", () => {
    const nutzer = QUELLEN.filter((d) => /from\s+["']@\/lib\/geraeteSpeicher["']/.test(lies(d)));
    expect(nutzer.sort()).toEqual(["components/MeinePraxen.tsx", "components/PraxisMerken.tsx"]);
    const merkenNutzer = QUELLEN.filter((d) => /from\s+["']@\/components\/(PraxisMerken|MeinePraxen)["']/.test(lies(d)));
    expect(merkenNutzer.sort()).toEqual(["app/meine-praxen/page.tsx", "app/portal/[token]/page.tsx"]);
  });
  it("der Knopf erscheint nur, wenn der Server es erlaubt (keine Praxis-Sitzung, kein Empfangsmodus)", () => {
    const portal = lies("app/portal/[token]/page.tsx");
    expect(portal).toMatch(/const merkenErlaubt = darfAufGeraetMerken\(\(await cookies\(\)\)\.getAll\(\)\.map\(\(c\) => c\.name\)\)/);
    expect(portal).toMatch(/\{merkenErlaubt && \(\s*<PraxisMerken/);
    // Beim Laden des Portals wird der Speicher nicht gelesen: erst der Klick.
    const knopf = lies("components/PraxisMerken.tsx");
    expect(knopf).not.toMatch(/useEffect/);
    expect(knopf).toMatch(/function klick\(\) \{\s*const lese = gemerktePraxenLesen\(\)/);
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
    for (const wort of ["nur", "Link zum Portal", "Vorname", "Name, Fach und Ort der Praxis", "bis wann der Link gilt", "wann Sie ihn gemerkt haben", "eigener Name", "weder an unseren Server noch an eine Praxis", "löschen"]) expect(seite).toContain(wort);
  });
  it("das AVV-Muster sagt zu, dass Sorrida keine Mandanten verknüpft und nicht abgleicht", () => {
    const avv = lies("app/avv/page.tsx").replace(/\s+/g, " ");
    expect(avv).toContain("Sorrida verknüpft die Daten der Praxis nicht mit Daten anderer Praxen.");
    expect(avv).toMatch(/nicht über Praxen hinweg ab, weder über Name, Geburtsdatum, Kontaktdaten oder Versichertennummer noch als Hashwert/);
    expect(avv).toMatch(/keine Schnittstelle nimmt Links mehrerer Praxen in einem Aufruf an/);
  });
});
