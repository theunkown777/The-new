import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { LAECHELN_HINWEIS, LAECHELN_SEITEN, LAECHELN_STAENDE, LAECHELN_STATUS, laechelnStand } from "@/lib/laecheln";

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

const alleTexte = [
  ...Object.values(LAECHELN_SEITEN).flatMap((s) => [s.name, s.text]),
  ...Object.values(LAECHELN_STATUS).flatMap((s) => [s.titel, s.text, s.link?.text ?? ""]),
  LAECHELN_HINWEIS,
];

describe("Lächeln-Zitat: Stand aus den zwei Schaltern", () => {
  it("bildet jede Kombination auf genau einen Stand ab", () => {
    expect(laechelnStand(true, true)).toBe("beide");
    expect(laechelnStand(true, false)).toBe("praxis");
    expect(laechelnStand(false, true)).toBe("patient");
    expect(laechelnStand(false, false)).toBe("keine");
    expect(new Set(LAECHELN_STAENDE)).toEqual(new Set(["beide", "praxis", "patient", "keine"]));
  });
});

describe("Lächeln-Zitat: Texte", () => {
  it("jeder Stand hat Titel und Text, jeder Satz endet mit einem Punkt", () => {
    for (const k of LAECHELN_STAENDE) {
      const v = LAECHELN_STATUS[k];
      expect(v.titel.length).toBeGreaterThan(0);
      expect(v.text.length).toBeGreaterThan(0);
      expect(v.titel.endsWith(".")).toBe(true);
      expect(v.text.endsWith(".")).toBe(true);
    }
    for (const s of Object.values(LAECHELN_SEITEN)) expect(s.text.endsWith(".")).toBe(true);
    expect(LAECHELN_HINWEIS.endsWith(".")).toBe(true);
  });

  it("nur „keine“ hat keinen Link", () => {
    for (const k of LAECHELN_STAENDE) expect(Boolean(LAECHELN_STATUS[k].link)).toBe(k !== "keine");
  });

  it("enthält keine Ziffern, also keine erfundenen Zahlen", () => {
    for (const t of alleTexte) expect(t, t).not.toMatch(/\d/);
  });

  it("die Titel nennen die richtige Seite", () => {
    expect(LAECHELN_STATUS.praxis.titel).toContain(LAECHELN_SEITEN.praxis.name);
    expect(LAECHELN_STATUS.patient.titel).toContain(LAECHELN_SEITEN.patient.name);
  });
});

describe("Lächeln-Zitat: Anker und ids", () => {
  const seite = lies("app/page.tsx") + lies("components/ZeitRechner.tsx");

  it("jeder Link-Anker existiert genau einmal als id auf der Startseite", () => {
    for (const k of LAECHELN_STAENDE) {
      const href = LAECHELN_STATUS[k].link?.href;
      if (!href) continue;
      expect(href.startsWith("#")).toBe(true);
      const id = href.slice(1);
      // nur echte ids zählen, nicht data-testid="…"
      expect(seite.match(new RegExp(`(?<![\\w-])id="${id}"`, "g"))?.length ?? 0, id).toBe(1);
    }
  });

  it("die ids der Komponente kommen sonst nirgends in app/ oder components/ vor", () => {
    const quellen = [...dateien("app"), ...dateien("components")].filter((d) => !d.endsWith("LaechelnZitat.tsx"));
    for (const id of ["laecheln-titel", "laecheln-frage", "laecheln-praxis-text", "laecheln-patient-text"]) {
      for (const d of quellen) expect(lies(d).includes(id), `${id} in ${d}`).toBe(false);
    }
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

  it("Schalter melden ihren Zustand über aria-pressed und beschreiben ihre Seite", () => {
    expect(quelle).toContain('type="button"');
    expect(quelle).toContain("aria-pressed={an[s]}");
    expect(quelle).toContain("aria-describedby={`laecheln-${s}-text`}");
    expect(quelle).toContain('id={`laecheln-${s}-text`}');
  });

  it("die Ansage ist höflich, vollständig und nur nach eigenem Klick gefüllt", () => {
    expect(quelle).toMatch(/aria-live="polite"[^>]*aria-atomic="true"/);
    expect(quelle).toContain('benutzt ? `${LAECHELN_STATUS[stand].titel} ${LAECHELN_STATUS[stand].text}` : ""');
  });

  it("versteckte Statusfassungen sind weder vorlesbar noch per Tab erreichbar", () => {
    expect(quelle).toContain("aria-hidden={!ist} inert={!ist}");
  });

  it("Bogen und Wort-Bogen sind Dekoration", () => {
    expect(quelle.match(/<svg[\s\S]*?>/g)?.every((t) => t.includes('aria-hidden="true"') && t.includes('focusable="false"'))).toBe(true);
  });

  it("der Server rendert den vollständigen Endzustand: beide Seiten an", () => {
    expect(quelle).toContain("useState({ praxis: true, patient: true })");
  });
});

describe("Lächeln-Zitat: CSS", () => {
  const css = lies("app/globals.css");
  const block = css.slice(css.indexOf("/* Lächeln-Zitat der Startseite"), css.indexOf("/* ---- Bewegung im Journal"));

  it("die Ausgangslage des Einstiegs greift nur mit JS und erlaubter Bewegung", () => {
    const frei = block.slice(block.indexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(block).toContain("@media (prefers-reduced-motion: no-preference)");
    for (const zeile of block.split("\n").filter((z) => z.includes('[data-intro="wartet"]'))) {
      expect(zeile.trimStart().startsWith(".js-ein ")).toBe(true);
      expect(frei).toContain(zeile);
    }
  });

  it("bei reduzierter Bewegung gibt es keine Übergänge und der Treffpunkt ist sichtbar", () => {
    const reduziert = block.slice(block.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduziert).toContain("transition: none !important; animation: none !important;");
    expect(reduziert).toContain(".laecheln[data-voll] .laecheln-mitte { opacity: 1;");
  });

  it("Tippflächen sind mindestens 44 px hoch und der Fokus ist papierweiß", () => {
    expect(Number(block.match(/\.laecheln-knopf \{[^}]*min-height: (\d+)px/)?.[1])).toBeGreaterThanOrEqual(44);
    expect(Number(block.match(/\.laecheln-link \{[^}]*min-height: (\d+)px/)?.[1])).toBeGreaterThanOrEqual(44);
    expect(block).toContain(".laecheln-knopf:focus-visible, .laecheln-link:focus-visible { outline: 2px solid #F5F2EE;");
  });

  it("nur Sorrida-Farben (Bordeaux, Rosé, Papier)", () => {
    const farben = new Set((block.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((f) => f.toUpperCase()));
    for (const f of farben) expect(["#5A1D1D", "#431515", "#DFC2BC", "#F5F2EE"], f).toContain(f);
    for (const f of quelleFarben()) expect(["#5A1D1D", "#431515", "#DFC2BC", "#F5F2EE"], f).toContain(f);
  });
});

function quelleFarben() {
  return new Set((lies("components/start/LaechelnZitat.tsx").match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((f) => f.toUpperCase()));
}
