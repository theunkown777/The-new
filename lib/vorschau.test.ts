import { describe, expect, it } from "vitest";
import { freiOhneZugang, istVorschauHost, vorschauCookie, vorschauCookieGueltig, vorschauPass, vorschauPassGueltig, zugangPasst } from "./vorschau";

const env = { VORSCHAU_HOSTS: "sorrida.de, www.sorrida.de", VORSCHAU_BENUTZER: "partner", VORSCHAU_PASSWORT: "geheim-123", NEXTAUTH_SECRET: "s" };

describe("Vorschau-Schloss für die eigene Domain", () => {
  it("greift nur auf den eingetragenen Hosts", () => {
    expect(istVorschauHost("sorrida.de", env)).toBe(true);
    expect(istVorschauHost("WWW.Sorrida.de:443", env)).toBe(true);
    expect(istVorschauHost("zahnarzt-berichte.vercel.app", env)).toBe(true);
    expect(istVorschauHost("sorrida-gmufub2sm-777-08e6.vercel.app", env)).toBe(true);
    expect(istVorschauHost("andere-seite.de", env)).toBe(false);
    expect(istVorschauHost("localhost:3000", env)).toBe(false);
    expect(istVorschauHost("sorrida.de", {})).toBe(false);
    // Vorschau-Modus aus (VORSCHAU_HOSTS leer): auch die Vercel-Adressen sind offen
    expect(istVorschauHost("zahnarzt-berichte.vercel.app", {})).toBe(false);
  });
  it("Zugangsdaten müssen genau stimmen", async () => {
    expect(await zugangPasst("partner", "geheim-123", env)).toBe(true);
    expect(await zugangPasst("partner", "geheim-12", env)).toBe(false);
    expect(await zugangPasst("Partner", "geheim-123", env)).toBe(false);
    expect(await zugangPasst("partner", "geheim-123", { ...env, VORSCHAU_PASSWORT: "" })).toBe(false);
  });
  it("Cookie ist signiert, läuft ab und wird mit neuem Passwort ungültig", async () => {
    const jetzt = 1_800_000_000_000;
    const c = await vorschauCookie(jetzt, env);
    expect(await vorschauCookieGueltig(c, jetzt + 1000, env)).toBe(true);
    expect(await vorschauCookieGueltig(c, jetzt + 31 * 86_400_000, env)).toBe(false);
    expect(await vorschauCookieGueltig(c.replace(/.$/, (x) => (x === "A" ? "B" : "A")), jetzt, env)).toBe(false);
    expect(await vorschauCookieGueltig(c, jetzt, { ...env, VORSCHAU_PASSWORT: "neu" })).toBe(false);
  });
  it("Demnächst-Seite und ihre Bausteine bleiben erreichbar", () => {
    expect(freiOhneZugang("/demnaechst")).toBe(true);
    expect(freiOhneZugang("/brand/sorrida-mark-hell.svg")).toBe(true);
    expect(freiOhneZugang("/login")).toBe(false);
    expect(freiOhneZugang("/api/auth/session")).toBe(false);
  });
  it("Impressum, Datenschutz und Lizenzen sind ohne Zugang erreichbar, der Rest der Website nicht", () => {
    for (const p of ["/impressum", "/datenschutz", "/lizenzen"]) expect(freiOhneZugang(p), p).toBe(true);
    for (const p of ["/", "/avv", "/hilfe", "/register", "/demo", "/impressum/anderes", "/datenschutzerklaerung"]) expect(freiOhneZugang(p), p).toBe(false);
  });
  it("Connector aus der Praxissoftware kommt auch im Vorschau-Modus durch", () => {
    expect(freiOhneZugang("/api/connector/launch")).toBe(true);
    expect(freiOhneZugang("/api/connector/ergebnisse")).toBe(true);
    expect(freiOhneZugang("/embed/launch")).toBe(false);
    expect(freiOhneZugang("/api/patients")).toBe(false);
  });
  it("Zugänge mit eigener Absicherung bleiben erreichbar, die Website nicht", () => {
    const token = "a".repeat(43);
    for (const p of ["/api/cron/aufraeumen", "/api/stripe/webhook", "/api/v1/catalog", `/p/${token}`, `/portal/${token}`, `/a/${token}`, `/api/portal/${token}/rechnung/x/online`, `/api/p/${token}`])
      expect(freiOhneZugang(p), p).toBe(true);
    for (const p of ["/", "/p", "/portal", "/a/kurz", "/fachgebiete/hausarzt", "/demo", "/api/stripe/verbinden", "/api/status", "/api/leads", "/api/demo"])
      expect(freiOhneZugang(p), p).toBe(false);
  });
  it("Passierschein für das Connector-Fenster: signiert, kurzlebig, nicht mit dem Cookie austauschbar", async () => {
    const jetzt = 1_800_000_000_000;
    const p = await vorschauPass(jetzt, env);
    expect(await vorschauPassGueltig(p, jetzt + 60_000, env)).toBe(true);
    expect(await vorschauPassGueltig(p, jetzt + 11 * 60_000, env)).toBe(false);
    expect(await vorschauPassGueltig(p, jetzt, { ...env, VORSCHAU_PASSWORT: "neu" })).toBe(false);
    expect(await vorschauPassGueltig("9999999999999.abc", jetzt, env)).toBe(false);
    const c = await vorschauCookie(jetzt, env);
    expect(await vorschauPassGueltig(c, jetzt, env)).toBe(false);
    expect(await vorschauCookieGueltig(p, jetzt, env)).toBe(false);
  });
});

import { darfInSuchmaschinen, istInfoSeite, oeffentlichFrei, oeffentlichStufe } from "@/lib/vorschau";

describe("Stufe „öffentlich, aber geschützt“", () => {
  const aus = {}, seiten = { VORSCHAU_OEFFENTLICH: "1" }, demo = { VORSCHAU_OEFFENTLICH: "demo" };
  it("liest die Stufe aus der Variable", () => {
    expect(oeffentlichStufe(aus, true)).toBe("aus");
    expect(oeffentlichStufe(seiten, true)).toBe("seiten");
    expect(oeffentlichStufe(demo, true)).toBe("demo");
    expect(oeffentlichStufe({ VORSCHAU_OEFFENTLICH: "nein" }, true)).toBe("aus");
  });
  it("wird ohne vollständiges Impressum nie öffentlich, auch wenn die Variable gesetzt ist", () => {
    expect(oeffentlichStufe(seiten, false)).toBe("aus");
    expect(oeffentlichStufe(demo, false)).toBe("aus");
    expect(oeffentlichFrei("/", seiten, false)).toBe(false);
    expect(darfInSuchmaschinen("/", demo, false)).toBe(false);
  });
  it("ohne die Variable bleibt alles verschlossen", () => {
    for (const p of ["/", "/ratgeber", "/rechner/zuzahlung-2027", "/demo", "/api/leads"]) expect(oeffentlichFrei(p, aus, true)).toBe(false);
  });
  it("öffnet nur Informationsseiten und ihre Formulare", () => {
    for (const p of ["/", "/fachgebiete/hausarzt", "/ratgeber/igel-vereinbarung", "/rechner", "/rechner/goae-rechnung", "/leistungen/abc", "/hilfe", "/avv", "/neu", "/sitemap.xml", "/api/leads", "/api/support", "/t/abcdefgh1234", "/api/t/abcdefgh1234"])
      expect(oeffentlichFrei(p, seiten, true), p).toBe(true);
  });
  it("hält App, Anmeldung, Registrierung, Gastzugang, Modelle und Schnittstellen verschlossen", () => {
    for (const p of ["/dashboard", "/patients/abc", "/login", "/register", "/api/register", "/demo", "/api/demo", "/api/patients", "/api/proposals", "/settings", "/anatomie", "/anatomie/gebiss", "/empfang", "/uebergabe", "/api/suche", "/ratgeberx", "/t/kurz"])
      expect(oeffentlichFrei(p, seiten, true), p).toBe(false);
  });
  it("öffnet den Gastzugang nur in der Stufe „demo“", () => {
    expect(oeffentlichFrei("/demo", demo, true)).toBe(true);
    expect(oeffentlichFrei("/api/demo", demo, true)).toBe(true);
    expect(oeffentlichFrei("/dashboard", demo, true)).toBe(false);
    expect(oeffentlichFrei("/login", demo, true)).toBe(false);
  });
  it("lässt nur Informationsseiten in Suchmaschinen, nie Gastzugang, Terminseiten oder Formular-Schnittstellen", () => {
    expect(darfInSuchmaschinen("/", seiten, true)).toBe(true);
    expect(darfInSuchmaschinen("/ratgeber/zuzahlungen-2027", demo, true)).toBe(true);
    for (const p of ["/demo", "/t/abcdefgh1234", "/api/leads", "/login", "/dashboard", "/anatomie"]) expect(darfInSuchmaschinen(p, demo, true), p).toBe(false);
    expect(darfInSuchmaschinen("/", aus, true)).toBe(false);
    expect(istInfoSeite("/impressum")).toBe(true);
  });
});

describe("Seiten /vertrauen und /status", () => {
  const aus = {}, seiten = { VORSCHAU_OEFFENTLICH: "1" };
  it("sind Informationsseiten: in der öffentlichen Stufe frei und in Suchmaschinen erlaubt", () => {
    for (const p of ["/vertrauen", "/status"]) {
      expect(istInfoSeite(p), p).toBe(true);
      expect(oeffentlichFrei(p, seiten, true), p).toBe(true);
      expect(darfInSuchmaschinen(p, seiten, true), p).toBe(true);
    }
  });
  it("bleiben ohne öffentliche Stufe hinter dem Zugang, und Unterpfade sind nicht frei", () => {
    for (const p of ["/vertrauen", "/status"]) expect(oeffentlichFrei(p, aus, true), p).toBe(false);
    for (const p of ["/vertrauen/x", "/status/x", "/statusx", "/betrieb", "/api/fehler"]) {
      expect(istInfoSeite(p), p).toBe(false);
      expect(oeffentlichFrei(p, seiten, true), p).toBe(false);
    }
  });
  it("die Selbsttest-Schnittstelle /api/status wird dadurch nicht zur Informationsseite", () => {
    expect(istInfoSeite("/api/status")).toBe(false);
  });
});
