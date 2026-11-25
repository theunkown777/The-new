import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { LAECHELN_ABLAUF, LAECHELN_DAUER_MS, LAECHELN_SCHLUSS, LAECHELN_SCHLUSS_MS, LAECHELN_SEITEN, laechelnPhase } from "@/lib/laecheln";

const WURZEL = path.join(__dirname, "..");
const lies = (datei: string) => readFileSync(path.join(WURZEL, datei), "utf8");

/** Alle .ts/.tsx-Dateien unter einem Ordner (ohne Tests). */
function dateien(ordner: string): string[] {
  const voll = path.join(WURZEL, ordner);
  return readdirSync(voll).flatMap((n) => {
    const p = path.join(voll, n);
    if (statSync(p).isDirectory()) return dateien(path.join(ordner, n));
    return /\.tsx?$/.test(n) && !n.includes(".test.") ? [path.join(ordner, n)] : [];
  });
}

const css = lies("app/globals.css");
const block = css.slice(css.indexOf("/* Lächeln-Zitat der Startseite"), css.indexOf("/* ---- Bewegung im Journal"));
/** Dauer aus dem CSS-Block in Millisekunden, z. B. --l-zeichnen: .85s → 850 */
const dauer = (name: string) => Math.round(Number(block.match(new RegExp(`--l-${name}: ([\\d.]+)s`))?.[1]) * 1000);

const alleTexte = [...Object.values(LAECHELN_SEITEN).flatMap((s) => [s.name, s.text, s.status]), LAECHELN_SCHLUSS.titel, LAECHELN_SCHLUSS.text, LAECHELN_SCHLUSS.link.text];

describe("Lächeln-Zitat: Ablauf", () => {
  it("läuft in der festen Folge Praxis, Patient, beide", () => {
    expect(LAECHELN_ABLAUF.map((s) => s.phase)).toEqual(["praxis", "patient", "beide"]);
    const zeiten = LAECHELN_ABLAUF.map((s) => s.abMs);
    expect([...zeiten].sort((a, b) => a - b)).toEqual(zeiten);
    expect(new Set(zeiten).size).toBe(zeiten.length);
  });

  it("jeder Zeitpunkt hat genau eine Station: vorher wartet der Bogen, am Ende bleibt er ganz", () => {
    expect(laechelnPhase(0)).toBe("wartet");
    for (const s of LAECHELN_ABLAUF) {
      expect(laechelnPhase(s.abMs)).toBe(s.phase);
      expect(laechelnPhase(s.abMs + 1)).toBe(s.phase);
    }
    expect(laechelnPhase(LAECHELN_ABLAUF[0].abMs - 1)).toBe("wartet");
    expect(laechelnPhase(LAECHELN_DAUER_MS)).toBe("beide");
    expect(laechelnPhase(60_000)).toBe("beide");
  });

  it("dauert insgesamt etwa 3 bis 3,5 Sekunden", () => {
    expect(LAECHELN_DAUER_MS).toBeGreaterThanOrEqual(3000);
    expect(LAECHELN_DAUER_MS).toBeLessThanOrEqual(3500);
  });

  it("die Dauern im CSS passen zum Zeitplan: Jede Hälfte ist gezeichnet, bevor die nächste Station beginnt", () => {
    const [praxis, patient, beide] = LAECHELN_ABLAUF.map((s) => s.abMs);
    expect(dauer("zeichnen")).toBeGreaterThan(0);
    expect(dauer("zeichnen")).toBeLessThanOrEqual(patient - praxis);
    expect(dauer("zeichnen")).toBeLessThanOrEqual(beide - patient);
    // letzte Station: erst treffen sich die Hälften, dann folgt der Schluss
    expect(dauer("treffen") + dauer("schluss")).toBe(LAECHELN_SCHLUSS_MS);
  });
});

describe("Lächeln-Zitat: Texte", () => {
  it("jede Seite hat Etikett, Satz und Statuszeile; jeder Satz endet mit einem Punkt", () => {
    for (const s of Object.values(LAECHELN_SEITEN)) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.text.endsWith(".")).toBe(true);
      expect(s.status.endsWith(".")).toBe(true);
      expect(s.status).toContain(s.name);
    }
    expect(LAECHELN_SCHLUSS.titel).toBe("Jetzt lächeln beide.");
    expect(LAECHELN_SEITEN.praxis.status).toBe("Die Praxis lächelt.");
    expect(LAECHELN_SCHLUSS.text.endsWith(".")).toBe(true);
    // ein Satz, keine zweite Zeile mit Erklärung
    expect(LAECHELN_SCHLUSS.text.split(/[.!?]\s/).length).toBe(1);
  });

  it("enthält keine Ziffern, also keine erfundenen Zahlen", () => {
    for (const t of alleTexte) expect(t, t).not.toMatch(/\d/);
  });

  it("die Seitentexte wiederholen nicht den Wortlaut der Entlastung-Karten", () => {
    const entlastung = lies("components/Entlastung.tsx");
    for (const s of Object.values(LAECHELN_SEITEN)) {
      expect(entlastung.includes(s.text), s.text).toBe(false);
      expect(s.text.split(/[.!?]\s/).length, s.text).toBe(1);
    }
  });
});

describe("Lächeln-Zitat: Anker und ids", () => {
  const seite = lies("app/page.tsx");
  const zusammen = seite + lies("components/ZeitRechner.tsx");

  it("der Link führt zum Zeitrechner; die id gibt es genau einmal", () => {
    expect(LAECHELN_SCHLUSS.link.href).toBe("#zeitrechner");
    // nur echte ids zählen, nicht data-testid="…"
    expect(zusammen.match(/(?<![\w-])id="zeitrechner"/g)?.length ?? 0).toBe(1);
  });

  it("der Link zeigt nach vorn: Der Zeitrechner steht auf der Startseite hinter dem Lächeln-Zitat", () => {
    const zitat = seite.indexOf("<LaechelnZitat");
    const rechner = seite.indexOf("<ZeitRechner");
    expect(zitat).toBeGreaterThan(0);
    expect(rechner).toBeGreaterThan(zitat);
  });

  it("die id der Überschrift kommt sonst nirgends in app/ oder components/ vor", () => {
    const quellen = [...dateien("app"), ...dateien("components")].filter((d) => !d.endsWith("LaechelnZitat.tsx"));
    for (const d of quellen) expect(lies(d).includes("laecheln-titel"), d).toBe(false);
  });
});

describe("Lächeln-Zitat: Komponente", () => {
  const quelle = lies("components/start/LaechelnZitat.tsx");
  const seite = lies("app/page.tsx");

  it("ist eine Client-Komponente, die Startseite bleibt Server-Komponente", () => {
    expect(quelle.startsWith('"use client"')).toBe(true);
    expect(seite).not.toMatch(/^\s*["']use client["']/);
    expect(seite).toContain("<LaechelnZitat rahmen={rahmen} />");
  });

  it("es gibt nichts zu klicken: keine Schalter, keine Knöpfe, kein Klick-Handler", () => {
    expect(quelle).not.toContain("<button");
    expect(quelle).not.toContain("aria-pressed");
    expect(quelle).not.toContain("onClick");
    expect(quelle).not.toMatch(/role="(switch|button|group)"/);
  });

  it("der Server rendert den Endzustand: ohne data-phase, mit Titel, Text und Link", () => {
    expect(quelle).toContain("useState<LaechelnPhase | null>(null)");
    expect(quelle).toContain("data-phase={phase ?? undefined}");
    expect(quelle).toContain("{LAECHELN_SCHLUSS.titel}");
    expect(quelle).toContain("href={LAECHELN_SCHLUSS.link.href}");
  });

  it("Vorleseprogramme bekommen ruhigen Text: keine Ansage, Zwischenzeilen sind versteckt", () => {
    expect(quelle).not.toContain("aria-live");
    expect(quelle).not.toContain('role="status"');
    // die Zeilen „Die Praxis lächelt.“ und „Der Patient lächelt.“ stehen nur in aria-hidden-Elementen
    const zwischen = quelle.match(/<p[^>]*>\s*\{LAECHELN_SEITEN\[s\]\.status\}/g) ?? [];
    expect(zwischen.length).toBe(1);
    expect(zwischen[0]).toContain('aria-hidden="true"');
  });

  it("bei „Bewegung reduzieren“ startet kein Ablauf", () => {
    expect(quelle).toContain('matchMedia("(prefers-reduced-motion: reduce)").matches');
  });

  it("Bogen und Wort-Bogen sind Dekoration", () => {
    const svgs = quelle.match(/<svg[\s\S]*?>/g) ?? [];
    expect(svgs.length).toBe(2);
    expect(svgs.every((t) => t.includes('aria-hidden="true"') && t.includes('focusable="false"'))).toBe(true);
  });
});

describe("Lächeln-Zitat: CSS", () => {
  const frei = block.slice(block.indexOf("@media (prefers-reduced-motion: no-preference)"));
  const davor = block.slice(0, block.indexOf("@media (prefers-reduced-motion: no-preference)"));

  it("alles, was vom Ablauf abhängt, steht nur unter „Bewegung erlaubt“", () => {
    expect(block).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(davor).not.toContain("[data-phase");
    expect(frei.split("\n").filter((z) => z.includes("[data-phase")).length).toBeGreaterThan(10);
  });

  it("ohne data-phase steht der Endzustand: Bogen gezeichnet, nichts ausgeblendet außer den Zwischenzeilen", () => {
    expect(davor).toContain(".laecheln-haelfte, .laecheln-wort { stroke-dasharray: 1 1.1; stroke-dashoffset: 0; }");
    expect(davor).toContain('.laecheln-status[aria-hidden="true"] { visibility: hidden; opacity: 0; }');
    const versteckt = davor.split("\n").filter((z) => /opacity: 0|visibility: hidden/.test(z) && !z.includes("@keyframes"));
    for (const z of versteckt) expect(z, z).toMatch(/laecheln-status\[aria-hidden="true"\]|laecheln-ring/);
  });

  it("bewegt werden nur stroke-dashoffset, opacity und transform", () => {
    const uebergaenge = [...frei.matchAll(/transition: ([^;]+);/g)].map((m) => m[1]);
    expect(uebergaenge.length).toBeGreaterThan(5);
    for (const u of uebergaenge) {
      for (const teil of u.split(",")) expect(teil.trim().split(" ")[0], u).toMatch(/^(stroke-dashoffset|opacity|transform|visibility)$/);
    }
    // visibility schaltet nur nach dem Ausblenden um, ohne eigene Dauer
    expect(frei.match(/visibility [^,;]+/g)?.every((v) => v.startsWith("visibility 0s"))).toBe(true);
  });

  it("nimmt die gemeinsamen Kurven und skaliert nie von null", () => {
    for (const z of frei.split("\n").filter((x) => x.includes("transition:") || x.includes("animation:"))) {
      expect(z, z).toMatch(/var\(--ease-(out|in-out)\)/);
    }
    expect(block).not.toMatch(/scale\(0\)/);
  });

  it("der Status hält seine Höhe frei: alle Fassungen liegen in derselben Zelle", () => {
    expect(block).toContain(".laecheln-status-feld { grid-area: status; display: grid;");
    expect(block).toContain(".laecheln-status { grid-area: 1 / 1; }");
  });

  it("der Link ist mindestens 44 px hoch, der Fokus papierweiß, Hover nur mit echter Maus", () => {
    expect(Number(block.match(/\.laecheln-link \{[^}]*min-height: (\d+)px/)?.[1])).toBeGreaterThanOrEqual(44);
    expect(block).toContain(".laecheln-link:focus-visible { outline: 2px solid #F5F2EE;");
    expect(block).toContain("@media (hover: hover) and (pointer: fine) { .laecheln-link:hover");
    expect(block.match(/:hover/g)?.length).toBe(1);
  });

  it("nur Sorrida-Farben (Bordeaux, Rosé, Papier)", () => {
    const erlaubt = ["#5A1D1D", "#431515", "#DFC2BC", "#F5F2EE"];
    const farben = (text: string) => new Set((text.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((f) => f.toUpperCase()));
    for (const f of farben(block)) expect(erlaubt, f).toContain(f);
    for (const f of farben(lies("components/start/LaechelnZitat.tsx"))) expect(erlaubt, f).toContain(f);
  });
});
