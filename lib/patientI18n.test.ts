import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildProposal, DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, LOWER_TEETH, typeLabelOf, UPPER_TEETH, type FindingCode, type ProposalInput } from "@/lib/proposals";
import { ALLE_SPECIALTIES } from "@/lib/specialties";
import { PATTERNS, PATTERN_IDS, type PatternId } from "@/lib/i18n/patterns";
import { CONTENT_EN, LOCALES, PATIENT_LANGS, UI, datum, euro, hasTranslation, langDir, langName, pickLang, tr, uebersetzung, uiFuer, type PatientLang } from "@/lib/patientI18n";

const FREMD = PATIENT_LANGS.filter((l) => l !== "de");

/** Fester Zufallsgenerator (mulberry32), damit die Zufallsbefunde bei jedem Lauf dieselben sind. */
function zufall(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Alle Texte, die das zahnärztliche Regelwerk für die Patientenansicht erzeugen kann:
// Einzelbefunde mit Nachbarn, Lücken jeder Länge und Lage (Brücke, Teil- und Totalprothese),
// zwei Lücken mit gemeinsamem Pfeiler und zufällig gemischte Gebisse.
/** Hinweise nur für die Praxis (Art „warn“), gesammelt beim Erzeugen der Regeltexte. */
const WARNTEXTE = new Set<string>();

function patientTexts(): Set<string> {
  const out = new Set<string>();
  const teeth = [...UPPER_TEETH, ...LOWER_TEETH];
  const findings = Object.keys(FINDINGS) as FindingCode[];
  const alleGlobals = { raucher: true, bruxismus: true, psi: true, bleaching: true, zahnstein: true };

  const sammle = (t: Record<string, string>, globals: Record<string, boolean>, insurance: "GKV" | "PKV", age: number) => {
    const input = { teeth: t, globals, patient: { age, insurance, bonusYears: 10, haertefall: false, erstattungProzent: 0 } } as unknown as ProposalInput;
    for (const it of buildProposal(input, DEFAULT_PRICES)) {
      out.add(it.title);
      out.add(it.where);
      for (const o of it.options) {
        out.add(o.name);
        o.benefits.forEach((b) => out.add(b));
        out.add(typeLabelOf(o, insurance));
        if (o.hinweis) out.add(o.hinweis);
        if (o.nutzen) out.add(o.nutzen);
      }
      // Hinweise der Art „warn“ sieht nur die Praxis (auf Deutsch). Sie werden nicht übersetzt, siehe WARNTEXTE unten.
      it.notes.forEach((x) => (x.kind === "info" ? out : WARNTEXTE).add(x.text));
    }
  };

  for (const insurance of ["GKV", "PKV"] as const) {
    // 1. Ein Zahn mit jedem Befund, Nachbarn mit jedem Befund.
    for (const age of [10, 16, 40, 75])
      for (const n of teeth)
        for (const f of findings)
          for (const nb of [undefined, ...findings]) {
            const t: Record<string, string> = { [String(n)]: f };
            if (nb) {
              t[String(n + 1)] = nb;
              t[String(n - 1)] = nb;
            }
            for (const globals of [{}, alleGlobals]) sammle(t, globals, insurance, age);
          }

    // 2. Lücken: jede zusammenhängende Lücke je Kiefer, mit gesunden und behandlungsbedürftigen Nachbarn.
    for (const arch of [UPPER_TEETH, LOWER_TEETH])
      for (let i = 0; i < arch.length; i++)
        for (let j = i; j < arch.length; j++)
          for (const nb of [undefined, "zerstoert", "stift", "fissur"] as const) {
            const t: Record<string, string> = {};
            for (let k = i; k <= j; k++) t[String(arch[k])] = "fehlt";
            if (nb) for (const k of [i - 1, j + 1]) if (arch[k] !== undefined) t[String(arch[k])] = nb;
            for (const globals of [{}, alleGlobals]) sammle(t, globals, insurance, 50);
          }

    // 3. Zwei Lücken mit einem gemeinsamen Pfeiler (eine Brücke über mehrere Lücken).
    for (const arch of [UPPER_TEETH, LOWER_TEETH])
      for (let i = 1; i < arch.length - 3; i++)
        for (const len of [1, 2]) {
          const t: Record<string, string> = { [String(arch[i])]: "fehlt" };
          for (let k = 0; k < len; k++) if (arch[i + 2 + k] !== undefined) t[String(arch[i + 2 + k])] = "fehlt";
          for (const mitte of [undefined, "zerstoert"] as const) {
            const tt = { ...t };
            if (mitte) tt[String(arch[i + 1])] = mitte;
            sammle(tt, {}, insurance, 50);
          }
        }
  }

  // 4. Zufällig gemischte Gebisse.
  const r = zufall(20261113);
  for (let lauf = 0; lauf < 1500; lauf++) {
    const t: Record<string, string> = {};
    const dichte = 0.05 + r() * 0.5;
    for (const n of teeth) if (r() < dichte) t[String(n)] = r() < 0.45 ? "fehlt" : findings[Math.floor(r() * findings.length)];
    const globals = Object.fromEntries(Object.keys(GLOBAL_FINDINGS).map((g) => [g, r() < 0.4]));
    sammle(t, globals, r() < 0.5 ? "GKV" : "PKV", [8, 17, 30, 70][Math.floor(r() * 4)]);
  }

  for (const g of Object.values(GLOBAL_FINDINGS)) out.add(g);
  return out;
}

const REGELTEXTE = [...patientTexts()];

// Alle Texte, die die Angebote der übrigen Fächer erzeugen können (lib/specialties.ts, lib/fachangebote.ts).
function fachTexte() {
  const leistungsarten = new Set<string>();
  const altersHinweise = new Set<string>();
  const katalog = new Set<string>();
  for (const s of ALLE_SPECIALTIES)
    for (const insurance of ["GKV", "PKV"] as const)
      for (const age of [10, 30, 60, null]) {
        const input = {
          teeth: {},
          globals: {},
          fach: s.id,
          anlaesse: [...s.anlaesse.map((a) => a.id), "eigen_x"],
          med: { custom: [{ id: "x", anlass: "Eigener Anlass", name: "Eigene Leistung", price: 30 }] },
          patient: { age, insurance, bonusYears: 0, haertefall: false, erstattungProzent: 0 },
        } as unknown as ProposalInput;
        for (const it of buildProposal(input, DEFAULT_PRICES)) {
          if (it.key.startsWith("e_")) leistungsarten.add(it.where);
          else [it.title, it.where, ...it.notes.map((n) => n.text)].forEach((x) => katalog.add(x));
          for (const o of it.options) {
            leistungsarten.add(typeLabelOf(o, insurance));
            if (it.key.startsWith("e_")) continue;
            [o.name, ...o.benefits, ...(o.nutzen ? [o.nutzen] : [])].forEach((x) => katalog.add(x));
            if (o.hinweis) (/^Kassenleistung (erst )?ab \d+ Jahren\./.test(o.hinweis) ? altersHinweise : katalog).add(o.hinweis);
          }
        }
      }
  return { leistungsarten: [...leistungsarten], altersHinweise: [...altersHinweise], katalog: [...katalog] };
}

// Deutsche Eigennamen ohne echte Entsprechung dürfen in Klammern stehen bleiben.
const DEUTSCH_IN_KLAMMERN = [
  "Heil- und Kostenplan",
  "Gebührenordnung für Ärzte, GOÄ",
  "Regelversorgung",
  "Festzuschuss",
  "Mehrkostenvereinbarung",
  "IGeL",
  "gleichartig",
  "andersartig",
  "§ 2 Abs. 3 GOZ",
  "UPT",
];
const ohneEigennamen = (s: string) => DEUTSCH_IN_KLAMMERN.reduce((x, e) => x.split(`(${e})`).join("").split(`(‎${e})`).join(""), s);
// Deutsche Wörter, die in einer Übersetzung nichts verloren haben.
const DEUTSCHER_REST =
  /(?<!\p{L})(Kasse\p{L}*|Krankenkasse\p{L}*|Zahn\p{L}*|Zähne\p{L}*|Krone\p{L}*|Brücke\p{L}*|Füllung\p{L}*|Eigenanteil\p{L}*|Zuzahlung\p{L}*|Leistung\p{L}*|Versicherung\p{L}*|Behandlung\p{L}*|Praxis|Zahnarzt\p{L}*|Ihre[rnms]?|Sie|und|oder|nicht|für|wird|sind|bitte)(?!\p{L})/iu;
const LATEIN = /[A-Za-zÄÖÜäöüß]{2,}/g;
/** Lateinische Wörter, die in kyrillischer oder arabischer Schrift stehen bleiben dürfen. */
const LATEIN_ERLAUBT = new Set(["PSI", "PDF"]);
const zahlen = (s: string) => s.match(/\d+/g) ?? [];

// Beispielwerte für die Funktionen der Oberfläche; was hier steht, muss im Satz wieder vorkommen.
const UI_ARGS: Record<string, unknown[][]> = {
  hello: [["Zofia"]],
  intro: [[undefined], ["Ihrer Hautärztin oder Ihrem Hautarzt"]],
  fineMed: [["24.11.2026"]],
  deadline: [[48], [5], [22]],
  optionsFor: [["Qwertz"]],
  open: [[1], [3], [12]],
  missing: [["Qwertz, Asdf"]],
  fineTherapie: [["24.11.2026"]],
  fine: [[true, "24.11.2026"], [false, "24.11.2026"]],
  installmentsFine: [["Medipay"], [undefined]],
  rate: [[12, "57 €"]],
  shareFrom: [["24.11.2026"]],
  remindSet: [["24.11.2026"]],
  stepItems: [[1], [3], [12]],
};
const BEISPIELE = new Set(["Zofia", "Qwertz", "Asdf", "Medipay"]);

/** Jeder Text der Oberfläche einer Sprache, Funktionen mit den Beispielwerten aufgerufen. */
function uiTexte(lang: PatientLang): { key: string; args: unknown[]; text: string }[] {
  const out: { key: string; args: unknown[]; text: string }[] = [];
  for (const [key, v] of Object.entries(UI[lang])) {
    if (typeof v === "string") out.push({ key, args: [], text: v });
    else for (const args of UI_ARGS[key] ?? []) out.push({ key, args, text: (v as (...a: unknown[]) => string)(...args) });
  }
  return out;
}

// Ein deutscher Beispieltext je Muster.
const MUSTER_BEISPIELE: Record<PatternId, string[]> = {
  tooth: ["Zahn 36"],
  teeth: ["Zähne 35, 36", "Zähne 12, 11, 21, 22"],
  nMissing: ["2 Zähne fehlen", "5 Zähne fehlen", "12 Zähne fehlen"],
  bridgeUnitsStandard: ["Brücke (4 Glieder), Regelversorgung", "Brücke (5 Glieder), Regelversorgung"],
  bridgeUnitsCeramic: ["Vollkeramik-Brücke (4 Glieder)", "Vollkeramik-Brücke (6 Glieder)"],
  bridgeUnitsPrivate: ["Brücke (4 Glieder), Standardausführung"],
  nImplants: ["2 Implantate mit Kronen", "3 Implantate mit Kronen", "5 Implantate mit Kronen"],
  notNeededWithBridge: ["Entfällt bei einer Brücke (Zahn 36)", "Entfällt bei einer Brücke (Zähne 35, 36)"],
  abutmentNote: ["Wird dieser Zahn Pfeiler einer Brücke (Zahn 36), ist seine Krone dort enthalten. Eine eigene Krone kommt nur dazu, wenn die Lücke anders versorgt wird."],
  neighboursHealthy: ["Die Nachbarzähne 35 und 37 haben keinen Befund. Für eine Brücke werden sie beschliffen, für ein Implantat nicht."],
  coveredOnlyFromAge: ["Kassenleistung erst ab 35 Jahren.", "Kassenleistung erst ab 21 Jahren. Bei Beschwerden Kassenleistung."],
  coveredFromAge: ["Kassenleistung ab 35 Jahren.", "Kassenleistung ab 50 Jahren. Bei Beschwerden Kassenleistung."],
};

describe("Patientenansicht: Aufbau der Sprachen", () => {
  it("kennt Deutsch und sechs Fremdsprachen, jede in eigener Schreibweise", () => {
    expect([...PATIENT_LANGS]).toEqual(["de", "en", "tr", "uk", "ru", "pl", "ar"]);
    expect(PATIENT_LANGS.map(langName)).toEqual(["Deutsch", "English", "Türkçe", "Українська", "Русский", "Polski", "العربية"]);
    for (const l of PATIENT_LANGS) expect(LOCALES[l].code).toBe(l);
  });

  it("schreibt nur Arabisch von rechts nach links", () => {
    expect(langDir("ar")).toBe("rtl");
    for (const l of PATIENT_LANGS.filter((x) => x !== "ar")) expect(langDir(l)).toBe("ltr");
  });

  it("lässt Deutsch unverändert", () => {
    for (const t of REGELTEXTE) expect(tr(t, "de")).toBe(t);
    expect(tr("Zahn 36", "de")).toBe("Zahn 36");
    expect(UI.de.langNote).toBe("");
    expect(UI.de.contentNote).toBe("");
    expect(UI.de.germanOnlyNote).toBe("");
  });

  it("hat zu jedem Muster ein deutsches Beispiel, das passt", () => {
    for (const id of PATTERN_IDS) {
      expect(MUSTER_BEISPIELE[id].length).toBeGreaterThan(0);
      for (const b of MUSTER_BEISPIELE[id]) expect(b).toMatch(PATTERNS[id]);
    }
  });

  it("erzeugt aus dem Regelwerk alle Arten von Texten (Lücken, Brücken, Prothesen)", () => {
    const alle = new Set(REGELTEXTE);
    for (const t of ["Zähne 35, 36", "Oberkiefer", "Unterkiefer", "Zahnloser Kiefer", "Totalprothese", "Teilprothese (Modellguss)", "In der Brücke enthalten", "Krone mit Stiftaufbau, Regelversorgung", "Keramik-Teilkrone"])
      expect(alle.has(t), t).toBe(true);
    for (const id of ["nMissing", "bridgeUnitsStandard", "bridgeUnitsCeramic", "bridgeUnitsPrivate", "nImplants", "notNeededWithBridge", "abutmentNote", "neighboursHealthy"] as const)
      expect(REGELTEXTE.some((t) => PATTERNS[id].test(t)), id).toBe(true);
    // „Die Nachbarzähne 33, 35 und 37 …“: drei Pfeiler bei zwei Lücken. Der Satz geht nur an die Praxis.
    expect([...WARNTEXTE].some((t) => /^Die Nachbarzähne \d\d, \d\d und \d\d /.test(t))).toBe(true);
  });

  // Hinweise der Art „warn“ sind Arbeitshinweise an die Praxis („Zusätzlich eine Aufbissschiene einplanen“).
  // Übersetzt lägen sie als Aussage an Patienten bereit. Deshalb gibt es sie in keiner Fremdsprache.
  it("übersetzt keinen Hinweis, der nur an die Praxis geht", () => {
    expect(WARNTEXTE.size).toBeGreaterThan(8);
    for (const t of WARNTEXTE) {
      expect(REGELTEXTE.includes(t), `„${t}“ ist zugleich ein Hinweis für Patienten`).toBe(false);
      for (const lang of FREMD) expect(hasTranslation(t, lang), `${lang}: ${t}`).toBe(false);
    }
  });

  // Die Software empfiehlt nichts und sagt nichts zu Erfolg oder Haltbarkeit, in keiner Sprache.
  it("hat in keinem Wörterbuch eine Empfehlung oder eine Aussage zu Erfolg und Haltbarkeit", () => {
    const WERTUNG =
      /recommend|advis|durab|\blasts\b|long-lasting|long-term|tolerated|just as well|equivalent|önerilir|öneril|tavsiye|dayanıklı|uzun ömür|zalec|polec|trwał|równoważn|рекоменд|совету|долговеч|равноцен|рекоменду|радимо|довговіч|рівноцін|توصي|يُنصح|ننصح|يدوم|متانة/i;
    for (const lang of FREMD)
      for (const [de, uebersetzt] of Object.entries(LOCALES[lang].content)) expect(uebersetzt, `${lang}: ${de}`).not.toMatch(WERTUNG);
    for (const de of Object.keys(CONTENT_EN)) expect(de).not.toMatch(/empfohlen|Empfehlung|sinnvoll|haltbar|Haltbarkeit|gleichwertig|verträglich|bewährt|stoppt|reicht .* aus|nicht nötig/i);
  });
});

describe.each(FREMD)("Patientenansicht %s", (lang) => {
  const L = LOCALES[lang];
  const nichtLateinisch = lang === "uk" || lang === "ru" || lang === "ar";

  it("hat jeden Schlüssel der Oberfläche, mit derselben Art von Wert", () => {
    expect(Object.keys(L.ui).sort()).toEqual(Object.keys(UI.de).sort());
    for (const [key, v] of Object.entries(UI.de)) {
      const w = (L.ui as Record<string, unknown>)[key];
      expect(typeof w, key).toBe(typeof v);
      if (typeof w === "string") expect(w.trim(), key).not.toBe("");
      else expect(UI_ARGS[key], `Beispielwerte für ${key}`).toBeDefined();
    }
  });

  it("übersetzt die Oberfläche: nichts Deutsches, Zahlen und Platzhalter bleiben", () => {
    const deutsch = uiTexte("de");
    const fremd = uiTexte(lang);
    expect(fremd.length).toBe(deutsch.length);
    fremd.forEach((f, i) => {
      const d = deutsch[i];
      const wo = `${lang}.${f.key}(${f.args.join(", ")})`;
      expect(f.text.trim(), wo).not.toBe("");
      expect(f.text, wo).not.toContain("undefined");
      if (d.text) expect(f.text, wo).not.toBe(d.text);
      expect(ohneEigennamen(f.text), wo).not.toMatch(DEUTSCHER_REST);
      // Jede Zahl der deutschen Fassung (Jahr, Datum, Tage, Anzahl) steht auch in der Übersetzung.
      for (const z of zahlen(d.text)) expect(zahlen(f.text), `${wo}: Zahl ${z}`).toContain(z);
      // Übergebene Namen, Daten und Beträge stehen im Satz; der deutsche Dativ der Fachrichtung nicht.
      for (const a of f.args) if (typeof a === "string" && f.key !== "intro") expect(f.text, wo).toContain(a);
      if (nichtLateinisch)
        for (const w of ohneEigennamen(f.text).match(LATEIN) ?? []) expect(BEISPIELE.has(w) || LATEIN_ERLAUBT.has(w), `${wo}: „${w}“`).toBe(true);
    });
    expect(L.ui.intro(undefined)).not.toBe(L.ui.intro("Ihrer Hautärztin oder Ihrem Hautarzt"));
    expect(L.ui.fine(true, "x").length).toBeGreaterThan(L.ui.fine(false, "x").length);
    expect(L.ui.installmentsFine("Medipay").length).toBeGreaterThan(L.ui.installmentsFine().length);
  });

  it("weist auf die maßgebliche deutsche Fassung hin", () => {
    expect(L.ui.langNote.length).toBeGreaterThan(40);
    expect(L.ui.langNote.length).toBeLessThan(160);
    expect(L.ui.contentNote.length).toBeGreaterThan(40);
    expect(L.ui.germanOnlyNote.length).toBeGreaterThan(20);
  });

  it("hat dasselbe Wörterbuch wie Englisch, ohne Lücken", () => {
    expect(Object.keys(L.content).sort()).toEqual(Object.keys(CONTENT_EN).sort());
    for (const [de, uebersetzt] of Object.entries(L.content)) {
      expect(uebersetzt.trim(), de).not.toBe("");
      expect(uebersetzt, de).not.toBe(de);
      if (lang !== "en") expect(uebersetzt, de).not.toBe(CONTENT_EN[de]);
    }
  });

  it("übersetzt jeden Text, den das Regelwerk erzeugen kann", () => {
    expect(REGELTEXTE.length).toBeGreaterThan(150);
    const missing = REGELTEXTE.filter((t) => !hasTranslation(t, lang));
    expect(missing).toEqual([]);
  });

  it("lässt in den Regeltexten nichts Deutsches stehen und erhält die Zahlen", () => {
    const paare = [...Object.keys(L.content), ...REGELTEXTE, ...Object.values(MUSTER_BEISPIELE).flat()].map((de) => [de, tr(de, lang)] as const);
    for (const [de, uebersetzt] of paare) {
      expect(uebersetzt, de).not.toBe(de);
      expect(ohneEigennamen(uebersetzt), `${de} → ${uebersetzt}`).not.toMatch(DEUTSCHER_REST);
      for (const z of zahlen(de)) expect(zahlen(uebersetzt), `${de} → ${uebersetzt}: Zahl ${z}`).toContain(z);
      if (nichtLateinisch)
        for (const w of ohneEigennamen(uebersetzt).match(LATEIN) ?? []) expect(LATEIN_ERLAUBT.has(w), `${de} → ${uebersetzt}: „${w}“`).toBe(true);
    }
  });

  it("hat jedes Muster und übersetzt eingebettete Texte mit", () => {
    expect(Object.keys(L.patterns).sort()).toEqual([...PATTERN_IDS].sort());
    for (const id of PATTERN_IDS)
      for (const b of MUSTER_BEISPIELE[id]) expect(uebersetzung(b, lang).stand, b).toBe("ganz");
    expect(tr("Entfällt bei einer Brücke (Zahn 36)", lang)).toContain(tr("Zahn 36", lang));
    // Ein Hinweis des Angebots, den es nur auf Deutsch gibt, bleibt hinter dem übersetzten Satz deutsch stehen.
    const teils = uebersetzung("Kassenleistung erst ab 35 Jahren. Nur dieser Satz ist deutsch.", lang);
    expect(teils.stand).toBe("teilweise");
    expect(teils.text).toContain("Nur dieser Satz ist deutsch.");
    expect(teils.text).toContain("35");
    expect(uebersetzung("Diesen Text kennt keine Sprache.", lang)).toEqual({ text: "Diesen Text kennt keine Sprache.", stand: "deutsch" });
  });

  it("schreibt Beträge mit lateinischen Ziffern und Eurozeichen", () => {
    for (const n of [0, 57, 2088, 12345.4]) {
      const s = euro(n, lang);
      expect(s).toContain("€");
      expect(s.replace(/\D/g, "")).toBe(String(Math.round(n)));
    }
    expect(datum("2026-11-24T10:00:00Z", lang)).toMatch(/24.*11.*2026|11.*24.*2026/);
    expect(datum("2026-11-24T10:00:00Z", lang)).not.toMatch(/[٠-٩۰-۹]/);
  });
});

describe("Patientenansicht: einzelne Sprachen", () => {
  it("übersetzt Zahlen und Muster", () => {
    expect(tr("Zahn 36", "en")).toBe("Tooth 36");
    expect(tr("Die Nachbarzähne 35 und 37 haben keinen Befund. Für eine Brücke werden sie beschliffen, für ein Implantat nicht.", "en")).toContain("35 and 37");
    expect(tr("Zahn 36", "tr")).toBe("36 numaralı diş");
    expect(tr("Zahn 36", "pl")).toBe("Ząb 36");
    expect(tr("Brücke (4 Glieder), Regelversorgung", "pl")).toBe("Most 4-punktowy, leczenie standardowe");
    expect(hasTranslation("Zahn 36")).toBe(true);
    expect(hasTranslation("Gesundheits-Check-up")).toBe(false);
  });

  it("beugt Zahlwörter in den slawischen Sprachen", () => {
    expect(tr("2 Zähne fehlen", "ru")).toBe("Отсутствует 2 зуба");
    expect(tr("5 Zähne fehlen", "ru")).toBe("Отсутствует 5 зубов");
    expect(tr("2 Implantate mit Kronen", "uk")).toBe("2 імплантати із коронками");
    expect(tr("5 Implantate mit Kronen", "pl")).toBe("5 implantów z koronami");
    expect(tr("Kassenleistung ab 21 Jahren.", "ru")).toContain("с 21 года");
    expect(tr("Kassenleistung ab 35 Jahren.", "ru")).toContain("с 35 лет");
    expect(UI.ru.deadline(1)).toContain("через 1 день");
    expect(UI.ru.deadline(3)).toContain("через 3 дня");
    expect(UI.ru.deadline(48)).toContain("через 48 дней");
    expect(UI.uk.deadline(22)).toContain("через 22 дні");
    expect(UI.pl.deadline(1)).toContain("za 1 dzień");
    expect(UI.pl.deadline(48)).toContain("za 48 dni");
  });

  it("schreibt Beträge in der Schreibweise der Sprache", () => {
    expect(euro(2088, "de")).toBe("2.088 €");
    expect(euro(2088, "en")).toBe("€2,088");
    expect(euro(2088, "tr")).toBe("2.088 €");
    expect(euro(2088, "ru")).toBe("2 088 €");
    expect(euro(2088, "uk")).toBe("2 088 €");
    expect(euro(2088, "pl")).toBe("2 088 €");
  });

  it("hält Beträge und lateinische Einschübe im Arabischen in Leserichtung", () => {
    // Betrag als links-nach-rechts-Insel (LRI … PDI), damit „2,088 €“ in jedem Satz gleich aussieht.
    expect(euro(2088, "ar")).toBe("⁦2,088 €⁩");
    expect(UI.ar.rate(12, euro(57, "ar"))).toContain("12 × ⁦57 €⁩");
    expect(datum("2026-11-24T10:00:00Z", "ar")).toBe("24/11/2026");
    // Lateinischer Einschub in Klammern beginnt mit einem Buchstaben oder einer LRM, sonst verrutscht „§ 2“.
    const alle = [...Object.values(LOCALES.ar.content), ...uiTexte("ar").map((x) => x.text)];
    for (const s of alle) expect(s, s).not.toMatch(/\([§\d][^)]*[A-Za-z]/);
    expect(tr("auf ausdrücklichen Wunsch (§ 2 Abs. 3 GOZ)", "ar")).toContain("(‎§ 2 Abs. 3 GOZ)");
    // Deutscher Rest hinter einem arabischen Satz steht als eigene Insel.
    expect(tr("Kassenleistung erst ab 35 Jahren. Nur dieser Satz ist deutsch.", "ar")).toContain("⁦Nur dieser Satz ist deutsch.⁩");
    expect(tr("Zähne 35, 36", "ar")).toBe("الأسنان 35، 36");
    // Tage: Einzahl und Zweizahl stehen als Wort, ab drei mit Ziffer.
    expect(UI.ar.deadline(1)).toContain("بعد يوم واحد");
    expect(UI.ar.deadline(2)).toContain("بعد يومين");
    expect(UI.ar.deadline(5)).toContain("بعد 5 أيام");
    expect(UI.ar.deadline(48)).toContain("بعد 48 يومًا");
  });

  it("wählt die Sprache aus Parameter oder Browser", () => {
    for (const l of PATIENT_LANGS) expect(pickLang(l, null)).toBe(l);
    expect(pickLang("AR", "de-DE")).toBe("ar");
    expect(pickLang("xx", "pl-PL,pl;q=0.9")).toBe("pl");
    expect(pickLang("constructor", null)).toBe("de");
    expect(pickLang(undefined, "de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(pickLang(undefined, "en-GB,en;q=0.9")).toBe("en");
    expect(pickLang(undefined, "tr-TR,tr;q=0.9,en;q=0.5")).toBe("tr");
    expect(pickLang(undefined, "tr-TR")).toBe("tr");
    expect(pickLang(undefined, "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7")).toBe("uk");
    expect(pickLang(undefined, "ru")).toBe("ru");
    expect(pickLang(undefined, "ar-SY,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(pickLang(undefined, "pl;q=0.7, en;q=0.9")).toBe("en");
    // Nicht unterstützte Sprache: die nächste unterstützte aus der Liste, sonst Deutsch.
    expect(pickLang(undefined, "fr-FR,fr;q=0.9,en;q=0.8")).toBe("en");
    expect(pickLang(undefined, "fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7")).toBe("de");
    expect(pickLang(undefined, "fr-FR")).toBe("de");
    expect(pickLang(undefined, "en;q=0, pl;q=0.2")).toBe("pl");
    expect(pickLang(undefined, "*")).toBe("de");
    expect(pickLang(undefined, "")).toBe("de");
    expect(pickLang(undefined, null)).toBe("de");
    // Doppelter Parameter (?lang=a&lang=b) kommt als Liste an: kein Absturz, Browser-Sprache gilt
    expect(pickLang(["a", "b"], "en-GB")).toBe("en");
    expect(pickLang(["en", "de"], null)).toBe("de");
    expect(pickLang(42, null)).toBe("de");
  });
});

describe("Patientenansicht: übrige Fächer (Arztpraxen, Therapie, Versorgung)", () => {
  const fach = fachTexte();

  it("übersetzt in jeder Sprache die Leistungsarten und fachübergreifenden Hinweise", () => {
    expect(fach.leistungsarten).toEqual(expect.arrayContaining(["Kassenleistung", "Selbstzahlerleistung (IGeL)", "Selbstzahlerleistung", "Kassenleistung mit Zuzahlung", "Kassenanteil + Aufzahlung", "Leistung der Praxis", "Privatleistung", "Basisleistung"]));
    for (const lang of FREMD) {
      expect(fach.leistungsarten.filter((t) => !hasTranslation(t, lang)), lang).toEqual([]);
      for (const t of ["Kassenleistung bei Beschwerden", "Bei Beschwerden Kassenleistung.", "Manche privaten Zusatzversicherungen übernehmen das. Bitte vorher dort fragen.", "Ersetzt keine ärztliche Untersuchung.", "Fragen Sie in der Praxis, was diese Leistung in Ihrer Situation leisten kann."])
        expect(hasTranslation(t, lang), `${lang}: ${t}`).toBe(true);
    }
  });

  it("übersetzt die Altersgrenze der Kassenleistung, auch wenn der Hinweis des Angebots deutsch bleibt", () => {
    expect(fach.altersHinweise.length).toBeGreaterThan(0);
    for (const lang of FREMD)
      for (const t of fach.altersHinweise) {
        const u = uebersetzung(t, lang);
        expect(u.stand, `${lang}: ${t}`).not.toBe("deutsch");
        expect(u.text).not.toMatch(/^Kassenleistung/);
      }
  });

  // Stand, nicht Ziel: Die Angebote selbst (Namen, Vorteile, Nutzen, Hinweise) gibt es nur auf Deutsch.
  // Die Ansicht zeigt sie deutsch und sagt das dazu (ui.contentNote). Wer den Katalog übersetzt, hebt diese Schwelle an.
  it("lässt die Namen und Erläuterungen der Angebote deutsch stehen (Stand)", () => {
    expect(fach.katalog.length).toBeGreaterThan(500);
    for (const lang of FREMD) {
      const deutsch = fach.katalog.filter((t) => uebersetzung(t, lang).stand === "deutsch");
      expect(deutsch.length / fach.katalog.length, lang).toBeGreaterThan(0.9);
      for (const t of deutsch) expect(tr(t, lang)).toBe(t);
    }
  });
});

// Eigene Leistungen der Praxis: geprüfte Übersetzungen kommen als zweites Wörterbuch dazu (lib/eigeneLeistung.ts).
describe("Zusatz-Wörterbuch für eigene Leistungen", () => {
  const zusatz = { "Stoßwellentherapie Ferse": "Shockwave therapy heel", "Leerer Eintrag": "  " };

  it("übersetzt einen eigenen Text nur über das Zusatz-Wörterbuch", () => {
    expect(uebersetzung("Stoßwellentherapie Ferse", "en")).toEqual({ text: "Stoßwellentherapie Ferse", stand: "deutsch" });
    expect(uebersetzung("Stoßwellentherapie Ferse", "en", zusatz)).toEqual({ text: "Shockwave therapy heel", stand: "ganz" });
    expect(tr("Stoßwellentherapie Ferse", "en", zusatz)).toBe("Shockwave therapy heel");
  });

  it("lässt Deutsch unverändert und nimmt keine leeren Einträge", () => {
    expect(uebersetzung("Stoßwellentherapie Ferse", "de", zusatz)).toEqual({ text: "Stoßwellentherapie Ferse", stand: "ganz" });
    expect(uebersetzung("Leerer Eintrag", "en", zusatz).stand).toBe("deutsch");
    expect(uebersetzung("toString", "en", zusatz).stand).toBe("deutsch");
  });

  it("hat Nachrang gegenüber dem Wörterbuch der Regeltexte", () => {
    const [regeltext, englisch] = Object.entries(CONTENT_EN)[0];
    expect(uebersetzung(regeltext, "en", { [regeltext]: "falsch" }).text).toBe(englisch);
  });
});

// Beträge für 2027: Solange die Tabelle 2027 nicht eingelesen ist (festzuschuss2027Amtlich() ist false), rechnet Sorrida
// mit den Beträgen von 2026 und den neuen Sätzen. Die Patientenansicht nennt diese Beträge dann in jeder Sprache „voraussichtlich“.
describe("Patientenansicht: Beträge 2027 heißen voraussichtlich, solange sie nicht amtlich sind", () => {
  it("jede Sprache hat die Fassung mit „voraussichtlich“ und den Satz „vorläufig“", () => {
    expect(UI.de.from2027Prelim).toBe("bei Bewilligung ab 2027 voraussichtlich:");
    expect(UI.de.bar2027Prelim).toBe("ab 2027 bewilligt, voraussichtlich:");
    expect(UI.de.prelim2027).toBe("Die Beträge für 2027 sind vorläufig.");
    for (const lang of PATIENT_LANGS) {
      const u = UI[lang];
      expect(u.from2027Prelim, lang).not.toBe(u.from2027);
      expect(u.bar2027Prelim, lang).not.toBe(u.bar2027);
      expect(u.from2027Prelim.length, lang).toBeGreaterThan(u.from2027.length);
      expect(u.bar2027Prelim.length, lang).toBeGreaterThan(u.bar2027.length);
      for (const t of [u.from2027Prelim, u.bar2027Prelim, u.prelim2027]) expect(t, lang).toContain("2027");
    }
    expect(uiFuer("de", true).prelim2027).toBe("Die Beträge für 2027 stehen noch nicht fest.");
  });

  it("die Ansicht wählt die Fassung nach festzuschuss2027Amtlich()", () => {
    const quelle = readFileSync(join(process.cwd(), "components/PatientProposalView.tsx"), "utf8");
    expect(quelle).toMatch(/const vorlaeufig2027 = !festzuschuss2027Amtlich\(\);/);
    expect(quelle).toMatch(/vorlaeufig2027 \? t\.from2027Prelim : t\.from2027/);
    expect(quelle).toMatch(/vorlaeufig2027 \? t\.bar2027Prelim : t\.bar2027/);
    expect(quelle).toMatch(/vorlaeufig2027 && <> <span data-testid="hinweis-2027-vorlaeufig">\{t\.prelim2027\}/);
    // Ohne die Wahl darf keiner der beiden Schlüssel mehr allein stehen.
    expect(quelle).not.toMatch(/\{t\.(from2027|bar2027)\}/);
  });
});

// „Erinnern Sie mich“: Gebaut ist ein Eintrag im Eingang der Praxis an dem gewählten Tag. Die Ansicht verspricht deshalb
// keine Meldung der Praxis, auch nicht nach dem Absenden der Auswahl.
describe("Patientenansicht: keine Zusage, dass die Praxis sich meldet", () => {
  const MELDET_SICH = /meldet sich|get in touch|contact you|iletişime geç|зв.яжеться|свяжется|skontaktuje|ستتواصل/i;
  it("Erinnerung und Dank in allen Sprachen und in Einfacher Sprache", () => {
    expect(UI.de.remindText).toBe("Wählen Sie, wann Sie erinnert werden möchten. Ihre Praxis sieht Ihren Wunsch an diesem Tag.");
    expect(UI.de.remindSet("24.11.2026")).toBe("Erinnerung gewünscht für den 24.11.2026. Ihre Praxis sieht den Wunsch an diesem Tag.");
    for (const u of [...PATIENT_LANGS.map((l) => UI[l]), uiFuer("de", true)]) {
      for (const t of [u.remindText, u.remindSet("24.11.2026"), u.thanks]) expect(t).not.toMatch(MELDET_SICH);
    }
  });
});
