import { afterAll, describe, expect, it, vi } from "vitest";

// Kein Mailversand im Test: Der Schlüssel wird beim Laden von lib/email.ts gelesen.
vi.hoisted(() => {
  process.env.RESEND_API_KEY = "";
  process.env.NEXTAUTH_SECRET ||= "nur-fuer-den-test";
});

import { prisma } from "@/lib/prisma";
import { fehlerAnzahl, fehlerMailSenden, fehlerSchreiben, neueFehlerOrte, praxisIdAusCookie, serverFehlerMelden } from "@/lib/fehlerSpeicher";
import { stichtag } from "@/lib/loeschfristen";

// Eigener Ort je Lauf, damit parallele Läufe und alte Reste sich nicht stören. Kurz und nur aus Buchstaben:
// Pfadteile ab 16 Zeichen oder mit langen Ziffernfolgen ersetzt die Bereinigung durch „…“.
const ORT = `/tf${Array.from({ length: 9 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("")}`;
const meine = () => prisma.fehlerEintrag.findMany({ where: { ort: { startsWith: ORT } }, orderBy: { createdAt: "asc" } });

describe.skipIf(!process.env.DATABASE_URL)("Fehlerlog in der Datenbank", () => {
  afterAll(async () => {
    await prisma.fehlerEintrag.deleteMany({ where: { ort: { startsWith: ORT } } });
  });

  it("gleicher Fehler mit anderen Daten: eine Zeile, der Zähler steigt; gespeichert wird nur Bereinigtes", async () => {
    const t1 = new Date("2026-11-10T08:00:00Z"), t2 = new Date("2026-11-10T09:00:00Z");
    expect(await fehlerSchreiben({ quelle: "server", ort: `${ORT}/a/cmhz1k2j30000abcd1234efgh?name=Meier`, meldung: 'Patient "Anna Meier" (anna@example.org) nicht gefunden' }, "cmhz1k2j30000praxis0001abcd", t1)).toBe(true);
    expect(await fehlerSchreiben({ quelle: "server", ort: `${ORT}/a/cmhz9zzzz0000zzzz9999zzzz`, meldung: 'Patient "Hans Beispiel" (hans@example.org) nicht gefunden' }, null, t2)).toBe(true);
    const rows = await meine();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quelle: "server", ort: `${ORT}/a/…`, zaehler: 2, practiceId: "cmhz1k2j30000praxis0001abcd", erledigtAt: null });
    expect(rows[0].createdAt).toEqual(t1);
    expect(rows[0].zuletztAt).toEqual(t2);
    const alles = JSON.stringify(rows);
    for (const wort of ["Anna", "Meier", "Hans", "example.org", "cmhz9zzzz"]) expect(alles).not.toContain(wort);
  });

  it("ein erledigter Fehler ist wieder offen, wenn er erneut auftritt", async () => {
    const [zeile] = await meine();
    await prisma.fehlerEintrag.update({ where: { id: zeile.id }, data: { erledigtAt: new Date() } });
    await fehlerSchreiben({ quelle: "server", ort: `${ORT}/a/cmhz1k2j30000abcd1234efgh`, meldung: 'Patient "X Y" (x@example.org) nicht gefunden' });
    const nach = await prisma.fehlerEintrag.findUniqueOrThrow({ where: { id: zeile.id } });
    expect(nach.erledigtAt).toBeNull();
    expect(nach.zaehler).toBe(3);
  });

  it("nimmt keine Praxis-ID an, die keine ist", async () => {
    // Fester Zeitpunkt in der Vergangenheit: Die Tagesgrenze neuer Browser-Einträge soll diesen Test nicht berühren.
    await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/b`, meldung: "Browserfehler" }, "Anna Meier <anna@example.org>", new Date("2026-11-09T12:00:00Z"));
    const zeile = (await meine()).find((r) => r.ort === `${ORT}/b`)!;
    expect(zeile.quelle).toBe("browser");
    expect(zeile.practiceId).toBeNull();
  });

  it("Server: die Route ist der Ort; Weiterleitungen und „nicht gefunden“ sind keine Fehler", async () => {
    expect(await serverFehlerMelden(Object.assign(new Error("weiter"), { digest: "NEXT_REDIRECT;replace;/login;307;" }), { path: `${ORT}/c`, headers: {} }, { routePath: `${ORT}/c` })).toBe(false);
    expect(await serverFehlerMelden(Object.assign(new Error("fehlt"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }), { path: `${ORT}/c`, headers: {} }, { routePath: `${ORT}/c` })).toBe(false);
    expect(await serverFehlerMelden(new Error("Unique constraint failed on the fields: (`email`)"), { path: `${ORT}/c/cmhz1k2j30000abcd1234efgh?x=1`, headers: { cookie: "a=b" } }, { routePath: `${ORT}/c/[id]` })).toBe(true);
    const zeile = (await meine()).find((r) => r.ort === `${ORT}/c/[id]`)!;
    expect(zeile.meldung).toBe("Unique constraint failed on …");
    expect(zeile.practiceId).toBeNull();
    // ohne Route: der bereinigte Pfad
    expect(await serverFehlerMelden("nur ein Text", { path: `${ORT}/d/cmhz1k2j30000abcd1234efgh?x=1`, headers: {} }, {})).toBe(true);
    expect((await meine()).some((r) => r.ort === `${ORT}/d/…`)).toBe(true);
  });

  it("zählt verschiedene Fehler der letzten 24 Stunden und nennt die Orte der neuen", async () => {
    const jetzt = new Date();
    await fehlerSchreiben({ quelle: "server", ort: `${ORT}/neu`, meldung: "gerade eben" }, null, jetzt);
    expect(await fehlerAnzahl(24, jetzt)).toBeGreaterThanOrEqual(1);
    const orte = await neueFehlerOrte(jetzt);
    expect(orte).toContain(`${ORT}/neu`);
    // Der Fehler vom 10.11. ist an diesem Tag nicht „neu seit gestern“
    expect(await neueFehlerOrte(new Date("2026-11-13T00:00:00Z"))).not.toContain(`${ORT}/a/…`);
  });

  it("Statusbericht: Meldungen aus dem Browser zählen nicht mit", async () => {
    const jetzt = new Date("2025-03-03T12:00:00Z");
    const vorher = await fehlerAnzahl(24, jetzt);
    for (let i = 0; i < 3; i++) expect(await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/status/${"abc"[i]}`, meldung: "Failed to fetch" }, null, jetzt)).toBe(true);
    expect(await fehlerAnzahl(24, jetzt)).toBe(vorher);
    await fehlerSchreiben({ quelle: "server", ort: `${ORT}/status/s`, meldung: "Serverfehler" }, null, jetzt);
    expect(await fehlerAnzahl(24, jetzt)).toBe(vorher + 1);
  });

  it("Browser: Ein Name ohne Anführungszeichen wird nicht gespeichert; nach der Tagesgrenze entstehen keine neuen Einträge", async () => {
    const jetzt = new Date("2025-01-05T12:00:00Z");
    const fenster = { quelle: "browser", createdAt: { gte: new Date(jetzt.getTime() - 24 * 3_600_000) } };
    await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/name`, meldung: "Sicherheitspruefung Test zwei: Patientin Erika Mustermann, geb. 03.05.1980, Tel. 0171 2345678, erika@example.org nicht gefunden" }, null, jetzt);
    const zeile = (await meine()).find((r) => r.ort === `${ORT}/name`)!;
    for (const wort of ["Erika", "Mustermann", "Patientin", "1980", "2345678", "example.org"]) expect(zeile.meldung).not.toContain(wort);
    // Bis zur Grenze auffüllen, dann kommt nichts Neues mehr dazu.
    const { BROWSER_NEU_GRENZE_24H } = await import("@/lib/fehlerlog");
    const schon = await prisma.fehlerEintrag.count({ where: fenster });
    const buchstaben = "abcdefghijklmnopqrstuvwxyz";
    for (let i = schon; i < BROWSER_NEU_GRENZE_24H; i++) await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/voll/${buchstaben[i % 26]}${buchstaben[Math.floor(i / 26)]}`, meldung: "Failed to fetch" }, null, jetzt);
    expect(await prisma.fehlerEintrag.count({ where: fenster })).toBe(BROWSER_NEU_GRENZE_24H);
    expect(await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/zuviel`, meldung: "Failed to fetch" }, null, jetzt)).toBe(false);
    expect(await prisma.fehlerEintrag.count({ where: fenster })).toBe(BROWSER_NEU_GRENZE_24H);
    // Ein schon bekannter Fehler wird weiter gezählt.
    expect(await fehlerSchreiben({ quelle: "browser", ort: `${ORT}/name`, meldung: "Andere Person Max Beispiel nicht gefunden" }, null, jetzt)).toBe(true);
    expect((await meine()).find((r) => r.ort === `${ORT}/name`)!.zaehler).toBe(2);
    // Fehler des Servers sind von der Grenze nicht betroffen.
    expect(await fehlerSchreiben({ quelle: "server", ort: `${ORT}/server-trotzdem`, meldung: "Serverfehler" }, null, jetzt)).toBe(true);
  });

  it("die tägliche Mail geht nur mit Empfänger und aktivem Versand raus", async () => {
    const jetzt = new Date();
    const ohneEmpfaenger = await fehlerMailSenden(jetzt, {});
    expect(ohneEmpfaenger.versendet).toBe(false);
    expect(ohneEmpfaenger.neu).toBeGreaterThanOrEqual(1);
    // Empfänger gesetzt, aber kein Versand eingerichtet (RESEND_API_KEY leer): nichts geht raus
    expect((await fehlerMailSenden(jetzt, { LEAD_NOTIFY_EMAIL: "team@example.org" })).versendet).toBe(false);
  });

  it("liest die Praxis-ID nur aus einem gültigen Anmelde-Cookie", async () => {
    expect(await praxisIdAusCookie(null)).toBeNull();
    expect(await praxisIdAusCookie("irgendwas=1; next-auth.session-token=kaputt")).toBeNull();
  });

  it("Löschfrist: 30 Tage nach dem letzten Auftreten (Bedingung des nächtlichen Laufs)", async () => {
    const alt = new Date("2026-01-05T00:00:00Z");
    await fehlerSchreiben({ quelle: "server", ort: `${ORT}/alt`, meldung: "lange her" }, null, alt);
    const faellig = (now: Date) => prisma.fehlerEintrag.count({ where: { ort: `${ORT}/alt`, zuletztAt: { lt: stichtag("fehlerlog", now) } } });
    // 29 Tage später noch nicht fällig, 31 Tage später fällig
    expect(await faellig(new Date("2026-02-03T00:00:00Z"))).toBe(0);
    expect(await faellig(new Date("2026-02-05T00:00:00Z"))).toBe(1);
  });
});
