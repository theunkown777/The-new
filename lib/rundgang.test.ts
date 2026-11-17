import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APP_RUNDGANG_START, RUNDGANG_APP, RUNDGANG_HREF, RUNDGANG_SCHLUESSEL, RUNDGANG_WEBSITE, RUNDGANG_ZU,
  appStationHref, appStationen, rundgangHinweisZeigen, rundgangNummer, rundgangWebsite, type AppKontext,
} from "./rundgang";
import { gastzugangOffen, istInfoSeite } from "./vorschau";
import { PILOT_ZIEL } from "./pricing";

const lesen = (datei: string) => readFileSync(datei, "utf8");

// Alles, was auf der Startseite gerendert wird und eine id tragen kann.
const STARTSEITE = [
  "app/page.tsx",
  "components/ZweiAnsichten.tsx",
  "components/Grundsaetze.tsx",
  "components/Entlastung.tsx",
  "components/ZeitRechner.tsx",
  "components/PricingPlans.tsx",
  "components/PraxisFaq.tsx",
];

const ALLE_RECHTE: AppKontext = { rechte: { zahlungen: true, analyse: true, einstellungen: true }, personPl: "Patienten", abschluss: "Behandlung" };
const KEINE_RECHTE: AppKontext = { rechte: { zahlungen: false, analyse: false, einstellungen: false }, personPl: "Klienten", abschluss: "Versorgung" };

/** Alle Texte beider Rundgänge, auch die Fassung ohne Einstellungen. */
function alleTexte(): string[] {
  const web = RUNDGANG_WEBSITE.flatMap((s) => [s.titel, ...s.text, ...(s.punkte ?? []), ...(s.links ?? []).map((l) => l.name)]);
  const app = RUNDGANG_APP.flatMap((s) => [s.titel, ...s.text, ...(s.ohneEinstellungen ? [s.ohneEinstellungen.titel, ...s.ohneEinstellungen.text] : [])]);
  return [...web, ...app];
}

describe("Rundgang auf der Website", () => {
  it("hat 8 Stationen mit eindeutigen Namen", () => {
    expect(RUNDGANG_WEBSITE).toHaveLength(8);
    expect(new Set(RUNDGANG_WEBSITE.map((s) => s.id)).size).toBe(8);
    for (const s of RUNDGANG_WEBSITE) {
      expect(s.titel.length, s.id).toBeGreaterThan(3);
      expect(s.text.length, s.id).toBeGreaterThan(0);
      expect(s.anker.length, s.id).toBeGreaterThan(0);
    }
  });

  it("jeder Anker steht als id auf der Startseite", () => {
    const quelltext = STARTSEITE.map(lesen).join("\n");
    for (const anker of RUNDGANG_WEBSITE.flatMap((s) => s.anker)) {
      // Leerzeichen davor: data-testid="…" zählt nicht.
      expect(quelltext, anker).toMatch(new RegExp(`\\sid="${anker}"`));
    }
  });

  it("jeder Anker kommt in app/page.tsx nur einmal vor (keine doppelten ids)", () => {
    const seite = lesen("app/page.tsx");
    for (const anker of RUNDGANG_WEBSITE.flatMap((s) => s.anker)) {
      expect(seite.match(new RegExp(`\\sid="${anker}"`, "g"))?.length ?? 0, anker).toBeLessThanOrEqual(1);
    }
  });

  it("die Startseite bindet den Rundgang ein und verlinkt ihn neben „Ihr Fach wählen“", () => {
    const seite = lesen("app/page.tsx");
    expect(seite).toMatch(/<Rundgang gastzugang=\{gastzugangOffen\(\)\} \/>/);
    expect(seite).toMatch(/href=\{RUNDGANG_HREF\}[^>]*data-rundgang-ausloeser/);
    expect(RUNDGANG_HREF).toBe("/#rundgang");
  });

  it("Kopf, Handy-Menü und Fuß verlinken den Rundgang als einfachen Link", () => {
    const kopf = lesen("components/start/JournalKopf.tsx");
    for (const id of ["rundgang-link-kopf", "rundgang-link-menue", "rundgang-link-fuss"]) expect(kopf).toMatch(new RegExp(`<a href=\\{(RUNDGANG_HREF|href)\\}[^>]*data-testid="${id}"`));
  });

  it("Links führen nur auf Informationsseiten oder zur Pilot-Anfrage", () => {
    for (const l of RUNDGANG_WEBSITE.flatMap((s) => s.links ?? [])) {
      if (l.nurMitGastzugang) {
        expect(l.href).toBe("/demo");
        continue;
      }
      const pfad = l.href.split("#")[0];
      expect(istInfoSeite(pfad) || l.href === PILOT_ZIEL, l.href).toBe(true);
    }
  });

  it("der Gastzugang erscheint nur, wenn er offen ist", () => {
    const links = (offen: boolean) => rundgangWebsite(offen).flatMap((s) => (s.links ?? []).map((l) => l.href));
    expect(links(true)).toContain("/demo");
    expect(links(false)).not.toContain("/demo");
    expect(links(false)).toContain("/vorschau");
    expect(links(false)).toContain(PILOT_ZIEL);
  });

  it("die Texte beschreiben das Beispiel auf dem Handybild so, wie es dort steht", () => {
    const karte = lesen("components/start/PatientenKarte.tsx");
    for (const wort of ["Hautarztpraxis", "Hautkrebs-Screening", "Auflichtmikroskopie", "35 €", "Kassenleistung", "Selbstzahlerleistung"]) expect(karte).toContain(wort);
    expect(RUNDGANG_WEBSITE[0].text.join(" ")).toContain("Hautkrebs-Screening als Kassenleistung für 0 €");
  });
});

describe("gastzugangOffen", () => {
  const mit = (stufe: string | undefined, hosts = "sorrida.de") => ({ VORSCHAU_HOSTS: hosts, VORSCHAU_OEFFENTLICH: stufe });
  it("ohne Vorschau-Schloss: offen", () => expect(gastzugangOffen({}, true)).toBe(true));
  it("Stufe „demo“: offen", () => expect(gastzugangOffen(mit("demo"), true)).toBe(true));
  it("Stufe „seiten“: zu", () => expect(gastzugangOffen(mit("1"), true)).toBe(false));
  it("Stufe „aus“: nur Personen mit Zugang sehen die Website, für sie ist /demo offen", () => expect(gastzugangOffen(mit(undefined), true)).toBe(true));
  it("ohne vollständiges Impressum gilt die Stufe „aus“", () => expect(gastzugangOffen(mit("1"), false)).toBe(true));
});

describe("Rundgang in der App", () => {
  it("hat 10 Stationen für die Praxisleitung", () => {
    expect(RUNDGANG_APP).toHaveLength(10);
    expect(appStationen(ALLE_RECHTE)).toHaveLength(10);
  });

  it("jede Station hat eine Seite unter app/(app) und liegt im geschützten Bereich", () => {
    const geschuetzt = JSON.parse((lesen("proxy.ts").match(/const GESCHUETZT = (\[[^\]]*\]);/) ?? [])[1] ?? "[]") as string[];
    expect(geschuetzt.length).toBeGreaterThan(5);
    for (const s of RUNDGANG_APP) {
      expect(existsSync(join("app", "(app)", s.pfad, "page.tsx")), s.pfad).toBe(true);
      expect(geschuetzt.some((p) => s.pfad === p || s.pfad.startsWith(p + "/")), s.pfad).toBe(true);
    }
  });

  it("folgt den Rechten aus dem Menü", () => {
    const ohne = appStationen(KEINE_RECHTE);
    expect(ohne.map((s) => s.pfad)).not.toContain("/zahlungen");
    expect(ohne.map((s) => s.pfad)).not.toContain("/analyse");
    expect(ohne).toHaveLength(8);
    expect(ohne.find((s) => s.pfad === "/settings")?.titel).toBe("Mein Konto");
    expect(appStationen(ALLE_RECHTE).find((s) => s.pfad === "/settings")?.titel).toBe("Einstellungen");
    const nurZahlungen = appStationen({ ...KEINE_RECHTE, rechte: { zahlungen: true, analyse: false, einstellungen: false } });
    expect(nurZahlungen.map((s) => s.pfad)).toContain("/zahlungen");
    expect(nurZahlungen.map((s) => s.pfad)).not.toContain("/analyse");
  });

  it("die Rechte kommen aus menueRechte und dieselben Rechte steuern das Menü", () => {
    const rollen = lesen("lib/rollen.ts");
    for (const r of ["zahlungen", "analyse", "einstellungen"]) expect(rollen).toMatch(new RegExp(`${r}: darf\\(`));
    const layout = lesen("app/(app)/layout.tsx");
    expect(layout).toMatch(/appStationen\(\{ rechte: menue,/);
  });

  it("setzt die Wörter des Fachs ein", () => {
    const k = appStationen(KEINE_RECHTE);
    expect(k.find((s) => s.pfad === "/patients")?.titel).toBe("Klienten und Wege");
    expect(k.find((s) => s.pfad === "/abschluss/new")?.titel).toBe("Versorgung abschließen");
    for (const s of [...k, ...appStationen(ALLE_RECHTE)]) expect(`${s.titel} ${s.text.join(" ")}`).not.toMatch(/[{}]/);
  });

  it("Adressen und Nummern", () => {
    const st = appStationen(ALLE_RECHTE);
    expect(APP_RUNDGANG_START).toBe("/dashboard?rundgang=1");
    expect(appStationHref(st, 3)).toBe("/patients?rundgang=3");
    expect(appStationHref(st, 10)).toBe("/hilfe-praxis?rundgang=10");
    expect(rundgangNummer("1", 10)).toBe(1);
    expect(rundgangNummer("10", 10)).toBe(10);
    for (const falsch of [null, "", "0", "11", "-1", "1.5", "abc", "999", " 2"]) expect(rundgangNummer(falsch, 10), String(falsch)).toBeNull();
  });

  it("der Hinweis erscheint nur für neue Konten echter Praxen", () => {
    const jetzt = new Date("2026-11-17T10:00:00Z");
    const tage = (n: number) => new Date(jetzt.getTime() - n * 86_400_000);
    expect(rundgangHinweisZeigen(tage(1), false, jetzt)).toBe(true);
    expect(rundgangHinweisZeigen(tage(29), false, jetzt)).toBe(true);
    expect(rundgangHinweisZeigen(tage(30), false, jetzt)).toBe(false);
    expect(rundgangHinweisZeigen(tage(1), true, jetzt)).toBe(false);
    expect(rundgangHinweisZeigen(null, false, jetzt)).toBe(false);
  });

  it("die Station „Frag Sorrida“ ist die letzte und nennt den Chat-Knopf und die Kürzel", () => {
    const letzte = RUNDGANG_APP[RUNDGANG_APP.length - 1];
    expect(letzte.pfad).toBe("/hilfe-praxis");
    expect(letzte.text.join(" ")).toMatch(/Chat-Knopf unten rechts/);
    expect(letzte.text.join(" ")).toMatch(/Strg\+K/);
  });

  it("Wieder aufrufbar: Frag Sorrida, Kürzel-Dialog, Übersicht und Gastzugang", () => {
    expect(lesen("app/(app)/hilfe-praxis/page.tsx")).toContain("<RundgangStart ");
    expect(lesen("components/Suche.tsx")).toMatch(/router\.push\(APP_RUNDGANG_START\)/);
    expect(lesen("app/(app)/dashboard/page.tsx")).toContain("<RundgangHinweis ");
    expect(lesen("components/DemoFuehrung.tsx")).toContain("APP_RUNDGANG_START");
  });
});

describe("Texte beider Rundgänge", () => {
  it("ohne Werbe- und Wirkungswörter und ohne die räumlichen Modelle", () => {
    const verboten = /\b(beste[nrms]?|optimal\w*|Empfehl\w*|empfehl\w*|garantier\w*|perfekt\w*|revolution\w*|einzigartig\w*|spart?\b|3D|Modell\w*|Anatomie)\b/;
    for (const t of alleTexte()) expect(t).not.toMatch(verboten);
  });

  it("ohne Gedankenstriche als Satzzeichen", () => {
    for (const t of alleTexte()) expect(t).not.toMatch(/\s[–—-]\s/);
  });

  it("kein Link auf die Modelle", () => {
    for (const l of RUNDGANG_WEBSITE.flatMap((s) => s.links ?? [])) expect(l.href).not.toMatch(/anatomie|modelle/);
    for (const s of RUNDGANG_APP) expect(s.pfad).not.toMatch(/anatomie|modelle|empfang/);
  });

  it("kein Satz verspricht Nachrichten an Patienten ohne Zutun der Praxis", () => {
    const alles = alleTexte().join(" ");
    expect(alles).not.toMatch(/automatisch\w* (an|zum|zur) Patient/i);
    expect(alles).toMatch(/Von selbst verschickt Sorrida nichts an Patienten/);
  });
});

describe("Speicher", () => {
  it("der Schlüssel der Website ist erlaubt und in der Datenschutzerklärung genannt", () => {
    expect(RUNDGANG_SCHLUESSEL).toBe("sorrida-rundgang");
    expect(RUNDGANG_ZU).toBe("zu");
    expect(lesen("lib/browserSpeicher.test.ts")).toContain('"components/start/Rundgang.tsx":');
    expect(lesen("app/datenschutz/page.tsx")).toContain(`„${RUNDGANG_SCHLUESSEL}“`);
  });

  it("der Rundgang der App und die Knöpfe zum Wieder-Einblenden fassen den Speicher nicht an", () => {
    for (const datei of ["components/AppRundgang.tsx", "components/RundgangKarte.tsx", "components/FuehrungWiederKnopf.tsx", "components/RundgangStart.tsx", "components/RundgangHinweis.tsx", "components/DemoPatientButton.tsx", "lib/rundgang.ts"]) {
      expect(lesen(datei), datei).not.toMatch(/\b(localStorage|sessionStorage)\b/);
    }
  });
});
