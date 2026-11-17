import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { APP_BEREICHE, SEITEN_TITEL, ankerWaehlen, appChatErlaubt, seiteErlaubt, seitenMuster, seitenSchluessel, seitenTitel, websiteChatErlaubt, zeigZiel } from "@/lib/hilfeZeiger";
import { HILFE_WISSEN, WEBSITE_WISSEN } from "@/lib/hilfeWissen";
import { menueRechte } from "@/lib/rollen";

const eintrag = (id: string) => {
  const e = [...HILFE_WISSEN, ...WEBSITE_WISSEN].find((x) => x.id === id);
  if (!e) throw new Error(id);
  return e;
};
const admin = menueRechte("admin");
const behandler = menueRechte("behandler", false);

const lauf = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lauf(join(ordner, e.name)) : e.name === "page.tsx" ? [join(ordner, e.name)] : []));

describe("Seiten ohne Kennungen", () => {
  it("seitenMuster ersetzt Kennungen durch „…“", () => {
    expect(seitenMuster("/patients/clx9abc123")).toBe("/patients/…");
    expect(seitenMuster("/proposals/clx1?x=Müller#a")).toBe("/proposals/…");
    expect(seitenMuster("/settings/team")).toBe("/settings/team");
  });
  it("SEITEN_TITEL nennt jede Seite der App genau einmal", () => {
    const seiten = lauf(join("app", "(app)")).map((d) => `/${d.split(/[\\/]/).slice(2, -1).join("/")}`).sort();
    expect(Object.keys(SEITEN_TITEL).sort()).toEqual(seiten);
  });
  it("Titel nur aus der festen Liste: Kennungen werden nie zum Titel, unbekannte Seiten haben keinen", () => {
    expect(seitenTitel("/patients/clx9abc")).toBe("Akte");
    expect(seitenTitel(seitenMuster("/patients/clx9abc"))).toBe("Akte");
    expect(seitenTitel("/proposals/new")).toBe("Neuer Vorschlag");
    expect(seitenTitel("/proposals/clx1")).toBe("Vorschlag");
    expect(seitenTitel("/patients", { personPl: "Klienten" })).toBe("Klienten und Wege");
    expect(seitenTitel("/abschluss/new", { abschluss: "Sitzung" })).toBe("Sitzung abschließen");
    expect(seitenTitel("/irgendwas/Frau-Mueller")).toBeNull();
    expect(seitenTitel("/")).toBeNull();
    expect(seitenSchluessel("/settings/templates/abc")).toBe("/settings/templates/[id]");
  });
  it("seiteErlaubt beachtet Rechte und Fach", () => {
    expect(seiteErlaubt("/zahlungen", { rechte: behandler })).toBe(false);
    expect(seiteErlaubt("/zahlungen", { rechte: admin })).toBe(true);
    expect(seiteErlaubt("/settings/billing", { rechte: admin, fach: "andere" })).toBe(false);
    expect(seiteErlaubt("/settings/billing", { rechte: admin, fach: "zahn" })).toBe(true);
    expect(seiteErlaubt("/hilfe", { rechte: behandler })).toBe(true);
  });
});

describe("zeigZiel", () => {
  it("eigener Anker auf einer anderen Seite: dorthin, mit Selektor und Name", () => {
    const z = zeigZiel(eintrag("vorschlag-neu"), { pfad: "/dashboard", rechte: admin });
    expect(z).toMatchObject({ href: "/proposals", anker: "vorschlag-neu", selektor: '[data-hilfe="vorschlag-neu"]', gleicheSeite: false, menue: false });
    expect(z?.name).toContain("Neuer Vorschlag");
  });
  it("gleiche Seite: nichts öffnen, nur suchen", () => {
    expect(zeigZiel(eintrag("vorschlag-neu"), { pfad: "/proposals" })?.gleicheSeite).toBe(true);
    expect(zeigZiel(eintrag("bankverbindung"), { pfad: "/zahlungen?f=offen", rechte: admin })).toMatchObject({ gleicheSeite: true, href: "/zahlungen?f=offen" });
  });
  it("Anker auf einer Seite mit Kennung: nur dort; sonst der Menüpunkt der Seite des Eintrags", () => {
    expect(zeigZiel(eintrag("patient-einwilligung"), { pfad: "/patients/clx9" })).toMatchObject({ anker: "patient-einwilligung", gleicheSeite: true, href: "/patients/clx9" });
    expect(zeigZiel(eintrag("patient-einwilligung"), { pfad: "/dashboard" })).toMatchObject({ anker: "menue:/patients", menue: true, href: "/patients", gleicheSeite: false });
  });
  it("ohne eigenen Anker: Menüpunkt; ohne Menüpunkt: nichts zu zeigen", () => {
    expect(zeigZiel(eintrag("rechnung-stornieren"), { pfad: "/dashboard", rechte: admin })).toMatchObject({ anker: "menue:/zahlungen", href: "/zahlungen" });
    expect(zeigZiel(eintrag("hilfe"), { pfad: "/dashboard" })).toBeNull();
  });
  it("Rechte: Seiten ohne Recht werden nicht gezeigt", () => {
    expect(zeigZiel(eintrag("datev"), { pfad: "/dashboard", rechte: behandler })).toBeNull();
    expect(zeigZiel(eintrag("team-einladen"), { pfad: "/dashboard", rechte: behandler })).toBeNull();
    expect(zeigZiel(eintrag("datev"), { pfad: "/dashboard", rechte: admin })?.href).toBe("/zahlungen");
  });
  it("Fach: Seiten nur für Zahnarztpraxen nicht für andere Fächer", () => {
    expect(zeigZiel(eintrag("punktwerte"), { pfad: "/dashboard", rechte: admin, fach: "andere" })).toBeNull();
    expect(zeigZiel(eintrag("punktwerte"), { pfad: "/dashboard", rechte: admin, fach: "zahn" })?.href).toBe("/settings/billing");
  });
  it("Praxismanager: das Thema kommt in die Adresse", () => {
    expect(zeigZiel(eintrag("pm-rechnungen"), { pfad: "/dashboard" })).toMatchObject({ href: "/praxismanager?thema=rechnungen", anker: "praxismanager:rechnungen", gleicheSeite: false });
    expect(zeigZiel(eintrag("pm-rechnungen"), { pfad: "/praxismanager?thema=rechnungen" })?.gleicheSeite).toBe(true);
    expect(zeigZiel(eintrag("pm-unbestaetigt"), { pfad: "/praxismanager" })).toMatchObject({ href: "/praxismanager?thema=termine", gleicheSeite: false });
  });
  it("Suche (überall): auf der aktuellen Seite", () => {
    expect(zeigZiel(eintrag("suche"), { pfad: "/termine" })).toMatchObject({ href: "/termine", gleicheSeite: true, anker: "suche-oeffnen" });
  });
  it("Website: Abschnitte der Startseite per id", () => {
    expect(zeigZiel(eintrag("web-kosten"), { pfad: "/fachgebiete/haut" })).toMatchObject({ href: "/", selektor: "#preise", gleicheSeite: false });
    expect(zeigZiel(eintrag("web-kosten"), { pfad: "/" })?.gleicheSeite).toBe(true);
    expect(zeigZiel(eintrag("web-pilot"), { pfad: "/" })).toMatchObject({ href: "/hilfe", selektor: "#pilot" });
    expect(zeigZiel(eintrag("web-kontakt"), { pfad: "/" })).toBeNull();
  });
  it("das Ziel kommt aus dem Eintrag, nicht aus freiem Text", () => {
    for (const e of HILFE_WISSEN) {
      const z = zeigZiel(e, { pfad: "/dashboard", rechte: admin, fach: e.nur ?? "andere" });
      if (z) expect(z.selektor, e.id).toMatch(/^\[data-hilfe="[a-z0-9:/-]+"\]$|^#[a-z-]+$/);
    }
  });
});

describe("Wo Frag Sorrida erscheint", () => {
  it("Website: Startseite und Unterseiten, nicht App, Patientenseiten, Demnächst, eingebettet", () => {
    for (const p of ["/", "/fachgebiete/haut", "/hilfe", "/vertrauen", "/ratgeber/zuzahlung-2027", "/datenschutz", "/login", "/demo"]) expect(websiteChatErlaubt(p), p).toBe(true);
    for (const p of ["/p/abc", "/portal/xyz", "/a/tok", "/t/tok", "/demnaechst", "/embed", "/uebergabe", "/dashboard", "/hilfe-praxis", "/settings/team", "/empfang"]) expect(websiteChatErlaubt(p), p).toBe(false);
  });
  it("App: überall außer am Tablet im Wartezimmer", () => {
    expect(appChatErlaubt("/dashboard")).toBe(true);
    expect(appChatErlaubt("/zahlungen?f=offen")).toBe(true);
    expect(appChatErlaubt("/empfang")).toBe(false);
  });
  it("APP_BEREICHE stimmt mit den Ordnern unter app/(app) überein", () => {
    const ordner = readdirSync(join("app", "(app)"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect([...APP_BEREICHE].sort()).toEqual(ordner);
  });
  it("ankerWaehlen nimmt das sichtbare Element", () => {
    expect(ankerWaehlen([{ sichtbar: false, n: 1 }, { sichtbar: true, n: 2 }])?.n).toBe(2);
    expect(ankerWaehlen([{ sichtbar: false }])).toBeNull();
    expect(ankerWaehlen([])).toBeNull();
  });
});
