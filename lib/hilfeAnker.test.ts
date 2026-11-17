// „Zeig mir wo“: Anker und Code laufen nicht auseinander. Der Test liest app/ und components/ von der Platte
// (wie lib/fehlerlog.test.ts) und prüft in beide Richtungen.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MENUE_ZIELE, PM_THEMEN, SEITEN_ANKER, WEBSITE_ANKER, ankerInfo, ankerSelektor, menueFuer } from "@/lib/hilfeAnker";
import { FRAGEN } from "@/lib/praxisManager";

const lauf = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lauf(join(ordner, e.name)) : /\.tsx$/.test(e.name) ? [join(ordner, e.name)] : []));
const DATEIEN = [...lauf("app"), ...lauf("components")];
const TEXT = new Map(DATEIEN.map((d) => [d, readFileSync(d, "utf8")]));
const ALLES = [...TEXT.values()].join("\n");

/** Feste Werte aus data-hilfe="…" */
const FEST = [...ALLES.matchAll(/data-hilfe="([^"]+)"/g)].map((m) => m[1]);
/** Werte mit Vorlage: data-hilfe={`praefix:${…}`} */
const VORLAGEN = [...ALLES.matchAll(/data-hilfe=\{`([a-z-]+:)\$\{/g)].map((m) => m[1]);

function seiteDa(seite: string): boolean {
  const p = seite.replace(/\/+$/, "");
  return p === "" ? existsSync("app/page.tsx") : existsSync(join("app", "(app)", p, "page.tsx")) || existsSync(join("app", p, "page.tsx"));
}

describe("Anker für „Zeig mir wo“", () => {
  it("jeder Anker steht als data-hilfe im Code", () => {
    const fehlt = Object.keys(SEITEN_ANKER).filter((k) => !FEST.includes(k));
    expect(fehlt, `ohne data-hilfe im Code: ${fehlt.join(", ")}`).toEqual([]);
  });
  it("jedes data-hilfe im Code ist eingetragen (Seitenanker oder Menüpunkt)", () => {
    const unbekannt = [...new Set(FEST)].filter((w) => !(w in SEITEN_ANKER) && !(w.startsWith("menue:") && w.slice(6) in MENUE_ZIELE));
    expect(unbekannt, `nicht in lib/hilfeAnker.ts: ${unbekannt.join(", ")}`).toEqual([]);
    expect([...new Set(VORLAGEN)].sort()).toEqual(["menue:", "praxismanager-knopf:", "praxismanager:"]);
  });
  it("die Menüpunkte tragen ihren Anker in Seitenleiste, Handy-Menü und unterer Leiste", () => {
    for (const d of ["components/SidebarNav.tsx", "components/MobileNav.tsx", "components/UntereLeiste.tsx"]) expect(TEXT.get(d), d).toMatch(/data-hilfe=\{`menue:\$\{/);
    const menue = `${TEXT.get("components/SidebarNav.tsx")}\n${TEXT.get("components/MobileNav.tsx")}`;
    for (const href of Object.keys(MENUE_ZIELE)) expect(menue.includes(`"${href}"`), href).toBe(true);
  });
  it("die Themen des Praxismanagers tragen Anker und stimmen mit lib/praxisManager.ts überein", () => {
    expect([...PM_THEMEN].sort()).toEqual(Object.keys(FRAGEN).sort());
    const pm = TEXT.get("components/PraxisManager.tsx") ?? "";
    expect(pm).toContain("data-hilfe={`praxismanager:${a.thema}`}");
    expect(pm).toContain("data-hilfe={`praxismanager-knopf:${a.thema}`}");
    for (const t of PM_THEMEN) expect(ankerInfo(`praxismanager:${t}`)?.name).toContain(FRAGEN[t]);
  });
  it("jede Seite eines Ankers existiert", () => {
    for (const [k, a] of Object.entries(SEITEN_ANKER)) expect(seiteDa(a.seite), `${k}: ${a.seite}`).toBe(true);
    for (const [k, a] of Object.entries(WEBSITE_ANKER)) expect(seiteDa(a.seite), `${k}: ${a.seite}`).toBe(true);
    for (const href of Object.keys(MENUE_ZIELE)) expect(seiteDa(href), href).toBe(true);
  });
  it("die Abschnitte der Website gibt es als id im Code", () => {
    for (const id of Object.keys(WEBSITE_ANKER)) expect(ALLES.includes(`id="${id}"`), `id="${id}" fehlt`).toBe(true);
  });
  it("nichts davon in Bereichen, die Frag Sorrida nicht anfasst (Anamnese, Kurzcheck, Modelle)", () => {
    for (const [d, t] of TEXT) if (/components[\\/](Anamnesis|kurzcheck|modelle)/.test(d)) expect(t, d).not.toContain("data-hilfe");
  });
});

describe("Hilfsfunktionen", () => {
  it("ankerInfo kennt Seiten-, Menü-, Praxismanager- und Website-Anker, sonst null", () => {
    expect(ankerInfo("vorschlag-neu")?.seite).toBe("/proposals");
    expect(ankerInfo("menue:/zahlungen")).toMatchObject({ seite: "/zahlungen", ueberall: true });
    expect(ankerInfo("praxismanager:rechnungen")?.seite).toBe("/praxismanager");
    expect(ankerInfo("praxismanager-knopf:termine")?.name).toContain("Knopf");
    expect(ankerInfo("website:preise")?.seite).toBe("/");
    expect(ankerInfo("gibt-es-nicht")).toBeNull();
    expect(ankerInfo("menue:/nirgends")).toBeNull();
    expect(ankerInfo("praxismanager:wetter")).toBeNull();
  });
  it("Selektor: data-hilfe in der App, id auf der Website, ohne Anführungszeichen von außen", () => {
    expect(ankerSelektor("vorschlag-neu")).toBe('[data-hilfe="vorschlag-neu"]');
    expect(ankerSelektor("menue:/zahlungen")).toBe('[data-hilfe="menue:/zahlungen"]');
    expect(ankerSelektor("website:preise")).toBe("#preise");
    expect(ankerSelektor('x"] body [y="')).not.toContain('"]  body');
  });
  it("menueFuer: längster passender Menüpunkt", () => {
    expect(menueFuer("/settings/team")).toBe("/settings");
    expect(menueFuer("/proposals/new")).toBe("/proposals");
    expect(menueFuer("/abschluss/new")).toBe("/abschluss/new");
    expect(menueFuer("/zahlungen#konto")).toBe("/zahlungen");
    expect(menueFuer("/hilfe-praxis")).toBe("/hilfe-praxis");
    expect(menueFuer("/hilfe")).toBeNull();
    expect(menueFuer("/")).toBeNull();
  });
});
