// Grundsatz 1, zweiter Teil: Sorrida sagt Patienten nichts zur Haltbarkeit oder zum Erfolg einer Behandlung
// („hält länger“, „begrenzt haltbar“, „bewährt und haltbar“, „Ergebnis hält 1–3 Jahre“, „höhere Erfolgsquote“,
// „stoppt Knochenabbau“, „sehr gut verträglich“) und nicht, was jemand braucht, was reicht oder was gleichwertig ist.
// Geprüft wird alles, was die Patientenansicht je Möglichkeit zeigt und vorliest: Name, Stichpunkte und
// die Hinweise der Art „info“. Hinweise der Art „warn“ sieht nur die Praxis im Editor.
// Dazu die Quellen selbst: die Angebote aller Fächer (lib/specialties.ts, lib/fachangebote.ts) und die
// Beispielkarte der Zahnmedizin auf der Website (lib/dentalShowcase.ts).
import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, buildLetter, buildProposal, type FindingCode, type GlobalCode, type PatientFactors, type ProposalInput } from "./proposals";
import { ALLE_SPECIALTIES, DENTAL_ID, type Specialty } from "./specialties";
import { DENTAL_SHOWCASE } from "./dentalShowcase";
import { IGEL_MONITOR, NUTZEN_FRAGEN, NUTZEN_OHNE_QUELLE, quellenListe, quellenText, schreibenMitNutzenOhneQuelle } from "./nutzenQuelle";
import { readFileSync } from "node:fs";

const HALTBARKEIT = /haltbar|langlebig|lebensdauer|hält\s+(\d|lange|länger|am längsten|ein leben)|jahre haltbar/i;
/** Aussagen zu Erfolg und Wirkung. „Nach erfolgloser Vorbehandlung“ ist eine Regel der Kasse und kein Treffer. */
const ERFOLG = /erfolgsquote|erfolgsaussicht|erfolgreich|\berfolg\b|wirksam|\bwirkung\b|stoppt|\bverträglich\b|bewährt|schmerzarm|schmerzfrei|lindert|lindern|\bheilt\b|substanzschonend|natürliche optik|\b(besser|bessere|besseres|höhere|glattere|gleichmäßigere)\b/i;
/** Wertungen und Zusagen im Namen der Praxis: „moderne Technik“, „ganzheitlich“, „schneller Termin“, „ohne Wartezeit“, „Kraft und Stabilität“. */
const WERTUNG = /\bmodern|ganzheitlich|schnelle[rnsm]? termin|ohne wartezeit|\bkraft\b|stabilität|schonend|\bsanft|hochwertig|präzise|zuverlässig|\b(genaue[rnsm]?|einfache[rnsm]?|geringe[rnsm]?)\b/i;
/** Aussagen dazu, was jemand braucht, was reicht oder was gleichwertig ist. */
const BEDARF = /\bbrauch(t|en|st)\b|\breicht\b[^.]*\baus\b|ausreichend|gleichwertig|vollwertig|nicht nötig|unnötig|\bnötig\b|ohnehin|aufwendiger|sinnvoll|empfehl|empfohlen|optimal|\bbeste[nrs]?\b/i;
const VERBOTEN = [HALTBARKEIT, ERFOLG, WERTUNG, BEDARF];
/**
 * Die Überschrift einer Position ist der Befund, den die Praxis angeklickt hat („Stark zerstört (Krone)“),
 * oder der gewählte Anlass. Das ist eine Angabe der Praxis; für sie gilt die Liste BEDARF nicht.
 */
const pruefe = (t: string, wo: string) => {
  const ueberschrift = t.startsWith(TITEL);
  // „STIKO-Empfehlung“ ist der Name einer amtlichen Empfehlung, keine Empfehlung der Software.
  const text = (ueberschrift ? t.slice(TITEL.length) : t).replace(/STIKO-Empfehlung/g, "");
  for (const muster of ueberschrift ? [HALTBARKEIT, ERFOLG, WERTUNG] : VERBOTEN) expect(text, wo).not.toMatch(muster);
};
const TITEL = "\u0000Titel:";
const BEFUNDE = Object.keys(FINDINGS) as FindingCode[];
const ALLGEMEIN = Object.keys(GLOBAL_FINDINGS) as GlobalCode[];
const ZAEHNE = [11, 13, 14, 25, 16, 36, 47, 18];
const basis: PatientFactors = { age: 45, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 };
const PATIENTEN: PatientFactors[] = [basis, { ...basis, age: 9 }, { ...basis, age: 16 }, { ...basis, insurance: "PKV", erstattungProzent: 80 }];

/** Alle Texte, die ein Patient zu den Möglichkeiten sieht. */
function patiententexte(input: ProposalInput): string[] {
  return buildProposal(input, DEFAULT_PRICES).flatMap((i) => [
    TITEL + i.title,
    ...i.options.flatMap((o) => [o.name, ...(o.benefits ?? [])]),
    ...i.notes.filter((n) => n.kind === "info").map((n) => n.text),
  ]);
}

describe("keine Aussage zur Haltbarkeit in den Texten für Patienten", () => {
  it("Zahnbefunde und allgemeine Befunde", () => {
    let texte = 0;
    for (const patient of PATIENTEN) {
      for (const befund of BEFUNDE) {
        for (const zahn of ZAEHNE) {
          for (const t of patiententexte({ teeth: { [String(zahn)]: befund }, globals: {}, patient })) {
            texte++;
            pruefe(t, `Zahn ${zahn} ${befund}`);
          }
        }
      }
      for (const g of ALLGEMEIN) {
        // mit und ohne Karies im Mund (das ändert z. B. die Hinweise beim Aufhellen)
        for (const teeth of [{}, { "16": "karies_klein" as FindingCode }]) {
          for (const t of patiententexte({ teeth, globals: { [g]: true }, patient })) {
            texte++;
            pruefe(t, `allgemein ${g}`);
          }
        }
      }
    }
    expect(texte).toBeGreaterThan(500);
  });

  it("alle anderen Fachrichtungen mit allen Anlässen", () => {
    let texte = 0;
    for (const s of ALLE_SPECIALTIES) {
      if (s.id === DENTAL_ID) continue;
      const anlaesse = (s.anlaesse ?? []).map((a) => a.id);
      for (const patient of PATIENTEN) {
        for (const t of patiententexte({ teeth: {}, globals: {}, patient, fach: s.id, anlaesse })) {
          texte++;
          pruefe(t, `${s.id}`);
        }
      }
    }
    expect(texte).toBeGreaterThan(100);
  });

  it("Zahnbefunde mit Lücken, Nachbarzähnen und allgemeinen Befunden zusammen", () => {
    let texte = 0;
    const gebisse: Record<string, FindingCode>[] = [
      { "36": "fehlt" },
      { "36": "fehlt", "35": "zerstoert", "37": "stift" },
      { "35": "fehlt", "36": "fehlt" },
      { "35": "fehlt", "36": "fehlt", "34": "zerstoert" },
      { "37": "fehlt" },
      { "47": "fehlt", "46": "fehlt", "45": "fehlt" },
      { "11": "fehlt", "12": "fehlt", "13": "fehlt", "21": "fehlt", "22": "fehlt" },
      { "16": "wurzel", "14": "wurzel", "11": "wurzel", "26": "teilkrone", "46": "karies_gross" },
    ];
    const alles = Object.fromEntries(ALLGEMEIN.map((g) => [g, true]));
    for (const patient of PATIENTEN) {
      for (const teeth of gebisse) {
        for (const globals of [{}, alles]) {
          for (const t of patiententexte({ teeth, globals, patient })) {
            texte++;
            pruefe(t, JSON.stringify(teeth));
          }
        }
      }
    }
    expect(texte).toBeGreaterThan(300);
  });
});

// Hinweise der Art „warn“ und die Gründe unter „Bewusst nicht vorgeschlagen“ sieht nur die Praxis im Editor.
// Auch dort gibt die Software keine Anweisung zur Behandlung (lib/zweckbestimmung.ts: „gibt keine
// Therapieempfehlungen“). Ein Hinweis ist ein Merkpunkt: „Knirschen angegeben: Die Praxis prüft Material und Schiene.“
describe("Hinweise nur für die Praxis sind Merkpunkte, keine Anweisungen", () => {
  const BEFEHL = /\b(einplanen|wählen|behandeln|ersetzen|versorgen|anbieten|besprechen|abstimmen|aufhellen|einsetzen|verwenden|nehmen|planen|machen|entfernen|ziehen)\s*[.!]?$/i;
  const WERTUNG_PRAXIS = /unnötig|nicht nötig|\bnötig\b|sinnvoll|empfehl|empfohlen|optimal|\bbeste[nrs]?\b|\bmuss\b|\bmüssen\b|\bsollte[n]?\b|erhöht (die|das) (bruchgefahr|risiko)/i;
  function praxistexte(input: ProposalInput): string[] {
    return buildProposal(input, DEFAULT_PRICES).flatMap((i) => [...i.notes.filter((n) => n.kind === "warn").map((n) => n.text), ...i.excluded]);
  }
  it("kein Hinweis endet auf einen Infinitiv als Befehl oder wertet", () => {
    const alle = new Set<string>();
    const alles = Object.fromEntries(ALLGEMEIN.map((g) => [g, true]));
    for (const patient of PATIENTEN) {
      for (const globals of [{}, alles]) {
        for (const befund of BEFUNDE) for (const zahn of ZAEHNE) for (const t of praxistexte({ teeth: { [String(zahn)]: befund }, globals, patient })) alle.add(t);
        for (const teeth of [{ "36": "fehlt" }, { "37": "fehlt" }, { "36": "fehlt", "35": "zerstoert", "37": "stift" }, { "47": "fehlt", "46": "fehlt", "45": "fehlt" }, { "11": "fehlt", "12": "fehlt", "13": "fehlt", "21": "fehlt", "22": "fehlt" }, { "16": "karies_klein" }] as Record<string, FindingCode>[]) {
          for (const t of praxistexte({ teeth, globals, patient })) alle.add(t);
        }
      }
    }
    expect(alle.size).toBeGreaterThan(12);
    for (const text of alle) {
      for (const satz of text.split(/(?<=[.!?])\s+/)) expect(satz, text).not.toMatch(BEFEHL);
      expect(text, text).not.toMatch(WERTUNG_PRAXIS);
    }
    // Die Merkpunkte zu den allgemeinen Angaben sind dabei.
    const ein = [...alle].join(" | ");
    expect(ein).toContain("Knirschen angegeben: Die Praxis prüft");
    expect(ein).toContain("Parodontitis angegeben: Die Praxis legt die Reihenfolge der Behandlung fest.");
  });
});

/** Was ein Angebot des Katalogs an Texten mitbringt. Der Kasten „Nutzen“ (Stand der Wissenschaft) steht für sich. */
function katalogtexte(s: Specialty): { wo: string; text: string }[] {
  return s.anlaesse.flatMap((a) => [
    { wo: `${s.id}/${a.id} Bezeichnung`, text: TITEL + a.label },
    ...(a.notes ?? []).map((text) => ({ wo: `${s.id}/${a.id} Hinweis`, text })),
    ...a.options.flatMap((o) => [
      { wo: `${s.id}/${o.id} Name`, text: o.name },
      ...o.benefits.map((text) => ({ wo: `${s.id}/${o.id} Stichpunkt`, text })),
    ]),
  ]);
}

describe("keine Aussage zu Haltbarkeit, Erfolg oder Bedarf in den Quellen der Angebote", () => {
  it("Angebote aller Fächer (lib/specialties.ts mit lib/fachangebote.ts)", () => {
    let texte = 0;
    for (const s of ALLE_SPECIALTIES) {
      for (const { wo, text } of katalogtexte(s)) {
        texte++;
        pruefe(text, wo);
      }
    }
    expect(texte).toBeGreaterThan(500);
  });

  it("Beispielkarte der Zahnmedizin auf der Website (lib/dentalShowcase.ts)", () => {
    const texte = katalogtexte(DENTAL_SHOWCASE);
    expect(texte.length).toBeGreaterThan(20);
    for (const { wo, text } of texte) pruefe(text, wo);
    for (const o of DENTAL_SHOWCASE.anlaesse.flatMap((a) => a.options)) if (o.kasseWenn) pruefe(o.kasseWenn, `zahn/${o.id} Kasse`);
    pruefe(DENTAL_SHOWCASE.marketing?.problem ?? "", "zahn Einleitung");
  });

  it("Einleitung der Fachseite aller Fächer: keine Wertung der Software über Leistungen („nicht sinnvoll“)", () => {
    let texte = 0;
    for (const s of ALLE_SPECIALTIES) {
      if (!s.marketing?.problem) continue;
      texte++;
      expect(s.marketing.problem, `${s.id} Einleitung`).not.toMatch(HALTBARKEIT);
      expect(s.marketing.problem, `${s.id} Einleitung`).not.toMatch(/sinnvoll|empfehl|empfohlen|optimal|gleichwertig|vollwertig|unnötig|\bbeste[nrs]?\b/i);
    }
    expect(texte).toBeGreaterThan(10);
  });

  // Der Kasten „Zum Nutzen“ gibt mit Quelle wieder, was die Quelle sagt (IGeL-Monitor, Gesetz), und ist ohne Quelle
  // neutral. Er sagt nicht, dass etwas wirkt oder hilft, und nicht, was stattdessen zu tun wäre („am meisten bringt
  // der Rauchstopp“, „Beckenbodentraining ist die Basis“, „Kann Todesfälle verhindern“, „Belegt vor allem bei …“).
  it("der Kasten „Nutzen“: keine Aussage zu Haltbarkeit, Erfolg, Wirkung oder Bedarf und keine Therapieaussage", () => {
    // Benannte Ausnahme nur für die Liste BEDARF: wörtliches Zitat aus § 2 Abs. 2 KHEntgG („zweckmäßige und
    // ausreichende Versorgung“), mit Quelle.
    const AUSNAHMEN = new Set<string>(["klinik/wahlarzt"]);
    const POSITIV = /verhinder|\bbringt\b|\bhilft\b|ist die basis|\bschützt\b|\bsenkt\b|vor allem bei/i;
    // Ohne hinterlegte Quelle auch keine Einordnung der Studienlage und kein Rat zum Vorgehen („gemeinsam abwägen“,
    // „Fachgesellschaften raten davon ab“, „Nutzen begrenzt“, „Ergebnisse uneinheitlich“).
    const OHNE_QUELLE = /abwägen|fachgesellschaft|\braten\b|begrenzt|uneinheitlich|umstritten|\bgering\b|zufallsbefund/i;
    let texte = 0;
    for (const s of [...ALLE_SPECIALTIES, DENTAL_SHOWCASE]) {
      for (const o of s.anlaesse.flatMap((a) => a.options)) {
        if (!o.nutzen) continue;
        texte++;
        const wo = `${s.id}/${o.id}`;
        for (const muster of [HALTBARKEIT, ERFOLG, BEDARF, POSITIV, OHNE_QUELLE]) {
          if (muster === BEDARF && AUSNAHMEN.has(wo)) continue;
          expect(o.nutzen, wo).not.toMatch(muster);
        }
        // „belegt“, „gezeigt“, „nachgewiesen“ nur verneint: „ist ein Nutzen nicht belegt“, „kein Nutzen belegt“.
        if (/belegt|gezeigt|nachgewiesen/i.test(o.nutzen)) expect(o.nutzen, wo).toMatch(/\b(nicht|kein|keine)\b/i);
      }
    }
    expect(texte).toBeGreaterThan(30);
  });
});

// Prüfbefund R5: Der Kasten „Zum Nutzen“ macht keine Aussage zu Nutzen oder Studienlage ohne Quelle. Steht dort ein
// Wort dieser Art, braucht das Angebot `nutzenQuelle` mit https-Adresse, und der Satz gibt wieder, was die Quelle sagt.
describe("der Kasten „Zum Nutzen“: Aussagen zu Nutzen und Studienlage nur mit Quelle", () => {
  /** Wörter, die eine Aussage zu Nutzen, Studienlage, Bewertung oder Recht anzeigen. */
  const BELEGWORT = /belegt|nachgewiesen|gezeigt|nutzen|überdiagnos|übertherapie|wirksam|wirkung|studie|evidenz|empfohlen|empfehl|leitlinie|bewerte|bewertung|igel-monitor|schaden|risiko|§/i;
  /** Die Bewertungsstufen des IGeL-Monitors, wie sie auf seinen Seiten stehen. */
  const STUFEN = ["positiv", "tendenziell positiv", "unklar", "tendenziell negativ", "negativ"];
  const alle = () =>
    [...ALLE_SPECIALTIES, DENTAL_SHOWCASE].flatMap((s) => s.anlaesse.flatMap((a) => a.options.map((o) => ({ wo: `${s.id}/${o.id}`, o }))));

  it("jeder Satz mit Belegwort hat eine Quelle mit https-Adresse und Stand", () => {
    let mitQuelle = 0;
    for (const { wo, o } of alle()) {
      if (!o.nutzen) {
        expect(o.nutzenQuelle, `${wo}: Quelle ohne Satz`).toBeUndefined();
        continue;
      }
      const quellen = quellenListe(o.nutzenQuelle);
      if (BELEGWORT.test(o.nutzen)) expect(quellen.length, `${wo}: „${o.nutzen}“ braucht nutzenQuelle`).toBeGreaterThan(0);
      for (const q of quellen) {
        mitQuelle++;
        expect(q.url, wo).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//);
        expect(q.name.trim().length, wo).toBeGreaterThan(3);
        expect(q.stand, wo).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      }
    }
    expect(mitQuelle).toBeGreaterThan(15);
  });

  it("IGeL-Monitor: Seite des Medizinischen Dienstes, Titel und Bewertungsstufe stehen wörtlich im Satz", () => {
    let n = 0;
    for (const { wo, o } of alle()) {
      const igel = quellenListe(o.nutzenQuelle).filter((q) => q.name === IGEL_MONITOR);
      if (!igel.length) {
        // Ohne Quelle des IGeL-Monitors nennt der Satz ihn auch nicht.
        if (o.nutzen) expect(o.nutzen, wo).not.toMatch(/IGeL-Monitor/);
        continue;
      }
      n++;
      expect(o.nutzen, wo).toMatch(/^Der IGeL-Monitor des Medizinischen Dienstes bewertet /);
      for (const q of igel) {
        expect(q.url, wo).toMatch(/^https:\/\/igel-monitor\.de\/igel-a-z\/igel\/show\/[a-z0-9-]+\.html$/);
        expect(o.nutzen, wo).toContain(`„${q.titel}“`);
        // Beschränkt die Seite die Bewertung auf eine Gruppe, steht diese Gruppe wörtlich im Satz.
        if (q.geltung) expect(o.nutzen, `${wo}: Geltungsbereich`).toContain(q.geltung);
      }
      // Jede genannte Stufe ist eine Stufe des IGeL-Monitors; je Quelle mindestens eine.
      const genannt = [...o.nutzen!.matchAll(/mit „([^“]+)“/g)].map((m) => m[1]);
      expect(genannt.length, wo).toBeGreaterThan(0);
      for (const stufe of genannt) expect(STUFEN, `${wo}: „${stufe}“`).toContain(stufe);
      if (!/jeweils/.test(o.nutzen!)) expect(genannt.length, wo).toBe(igel.length);
      // Die hinterlegte Stufe (für die Auswertung der Praxis, lib/analytics.ts) ist die, die im Satz steht, in derselben Reihenfolge.
      for (const q of igel) expect(STUFEN, `${wo}: Stufe hinterlegt`).toContain(q.bewertung);
      if (/jeweils/.test(o.nutzen!)) for (const q of igel) expect(q.bewertung, wo).toBe(genannt[0]);
      else expect(igel.map((q) => q.bewertung), wo).toEqual(genannt);
    }
    expect(n).toBeGreaterThan(10);
  });

  it("Rechtslage nur als wörtliches Zitat mit Norm und Adresse (Wahlarzt: § 2 Abs. 2 Satz 1 und § 17 Abs. 1 Satz 1 KHEntgG)", () => {
    const wahlarzt = alle().find((x) => x.wo === "klinik/wahlarzt")!.o;
    const quellen = quellenListe(wahlarzt.nutzenQuelle);
    expect(quellen.map((q) => [q.name, q.url])).toEqual([
      ["§ 2 Abs. 2 Satz 1 KHEntgG", "https://www.gesetze-im-internet.de/khentgg/__2.html"],
      ["§ 17 Abs. 1 Satz 1 KHEntgG", "https://www.gesetze-im-internet.de/khentgg/__17.html"],
    ]);
    // Jede Norm steht so im Satz, wie sie als Quelle genannt ist, und wird wörtlich zitiert.
    expect(wahlarzt.nutzen).toMatch(
      /^§ 2 Abs\. 2 Satz 1 KHEntgG: „Allgemeine Krankenhausleistungen sind die Krankenhausleistungen, die .+ notwendig sind\.“ § 17 Abs\. 1 Satz 1 KHEntgG: „Neben den Entgelten .+ als Wahlleistungen gesondert berechnet werden, wenn .+ vereinbart ist\.“$/,
    );
    // Ohne Quelle keine Norm im Kasten.
    for (const { wo, o } of alle()) if (o.nutzen && /§/.test(o.nutzen)) expect(quellenListe(o.nutzenQuelle).length, wo).toBeGreaterThan(0);
  });

  it("ohne Quelle nur der neutrale Satz oder eine reine Abrechnungstatsache", () => {
    expect(NUTZEN_OHNE_QUELLE.has(NUTZEN_FRAGEN)).toBe(true);
    for (const { wo, o } of alle()) {
      if (!o.nutzen || quellenListe(o.nutzenQuelle).length) continue;
      expect(NUTZEN_OHNE_QUELLE.has(o.nutzen), `${wo}: „${o.nutzen}“`).toBe(true);
    }
  });

  it("der neutrale Satz unterstellt keinen Nutzen („was diese Leistung leisten kann“)", () => {
    expect(NUTZEN_FRAGEN).not.toMatch(/leisten kann|bringt|hilft/i);
    expect(NUTZEN_FRAGEN).toMatch(/für .* gegen/);
  });

  it("ältere gespeicherte Schreiben mit Angaben zum Nutzen ohne Quelle werden erkannt (Abschlussseite bietet sie nicht zum Versand an)", () => {
    expect(schreibenMitNutzenOhneQuelle("1. Vorsorge\n      Zum Nutzen: Ohne Beschwerden ist kein Nutzen belegt.")).toBe(true);
    expect(schreibenMitNutzenOhneQuelle(`      Zum Nutzen: ${NUTZEN_FRAGEN}`)).toBe(false);
    expect(schreibenMitNutzenOhneQuelle("      Zum Nutzen: Der IGeL-Monitor … (Quelle: IGeL-Monitor (Medizinischer Dienst Bund), https://igel-monitor.de/…)")).toBe(false);
    expect(schreibenMitNutzenOhneQuelle("      Hinweis der Praxis zu Lidrandpflege: Text der Praxis")).toBe(false);
    // Jedes Schreiben, das heute entsteht, ist unauffällig.
    for (const fach of ALLE_SPECIALTIES.filter((s) => s.id !== DENTAL_ID)) {
      const items = buildProposal({ teeth: {}, globals: {}, patient: basis, fach: fach.id, anlaesse: fach.anlaesse.map((a) => a.id) }, DEFAULT_PRICES);
      const choices = Object.fromEntries(items.map((i) => [i.key, i.options[i.options.length - 1].id]));
      const brief = buildLetter({ items, choices, patient: basis, patientName: "Muster", practiceName: "Praxis", fach: fach.id, date: new Date("2026-11-17") });
      expect(schreibenMitNutzenOhneQuelle(brief), fach.id).toBe(false);
    }
    const datei = readFileSync("components/WrapUpSummary.tsx", "utf8");
    expect(datei).toContain("schreibenMitNutzenOhneQuelle(proposal.letterText)");
    expect(datei).toContain("{!schreibenAlt && <CopyTextButton");
  });

  it("jede Stelle, die den Kasten zeigt, zeigt auch die Quelle (als Link: neues Fenster, ohne Referrer; im Schreiben mit Adresse)", () => {
    const link = readFileSync("components/NutzenQuelleLink.tsx", "utf8");
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    // Website (Fachseiten) und Patientenansicht als Link; im Editor steht der Kasten in einem Knopf, dort als Text mit Tooltip.
    for (const datei of ["app/fachgebiete/[id]/page.tsx", "components/PatientProposalView.tsx", "components/ProposalEditor.tsx"]) {
      const text = readFileSync(datei, "utf8");
      expect(text, datei).toMatch(/\{o\.nutzen\}|text=\{o\.nutzen\}/);
      expect(text, datei).toMatch(/<NutzenQuelleLink quelle=\{o\.nutzenQuelle\}/);
    }
    // Schreiben an den Patienten: Quelle mit Adresse im Text
    const items = buildProposal({ teeth: {}, globals: {}, patient: basis, fach: "uro", anlaesse: ["prostata"] }, DEFAULT_PRICES);
    const psa = items.flatMap((i) => i.options).find((o) => o.id === "psa")!;
    expect(psa.nutzenQuelle).toBeDefined();
    // Das Beispiel auf der Startseite (Grundsätze) ist wörtlich der Satz aus dem Katalog, mit derselben Quelle.
    const grundsaetze = readFileSync("components/Grundsaetze.tsx", "utf8");
    expect(grundsaetze).toContain(psa.nutzen!);
    expect(grundsaetze).toContain("<NutzenQuelleLink quelle={BEISPIEL_NUTZEN.quelle} />");
    expect(quellenText(psa.nutzenQuelle)).toBe(
      "Quelle: IGeL-Monitor (Medizinischer Dienst Bund), https://igel-monitor.de/igel-a-z/igel/show/psa-test-zur-frueherkennung-von-prostatakrebs.html, abgerufen am 17.11.2026",
    );
    // Der Tag des Abrufs steht sichtbar neben dem Link, nicht nur im Tooltip; in der Patientenansicht in deren Sprache.
    expect(link).toMatch(/\(\$\{abgerufen\} \$\{liste\[0\]\.stand\}\)/);
    expect(readFileSync("components/PatientProposalView.tsx", "utf8")).toContain("abgerufen={t.abgerufen}");
  });
});

// Erstattung: Ohne hinterlegte Quelle keine Mengenangabe („viele Kassen“, „oft“), die eine Selbstzahlerleistung
// günstiger erscheinen lässt. Fachseiten: keine Rangangaben und kein Verkaufston gegenüber Praxen.
describe("keine unbelegten Mengenangaben zur Erstattung und kein Werbeton auf den Fachseiten", () => {
  const MENGE = /\b(viele|vielen|oft|häufig|meist|meistens|die meisten|fast alle)\b/i;
  it("Hinweise zur Kasse, Stichpunkte und Nutzen-Kasten", async () => {
    const { CONTENT_EN } = await import("./patientI18n");
    let n = 0;
    for (const s of [...ALLE_SPECIALTIES, DENTAL_SHOWCASE]) {
      for (const o of s.anlaesse.flatMap((a) => a.options)) {
        const wo = `${s.id}/${o.id}`;
        if (o.kasseWenn) { n++; if (/erstatt|zahl|zuschuss|übernehm/i.test(o.kasseWenn)) expect(o.kasseWenn, wo).not.toMatch(MENGE); }
        for (const b of o.benefits) {
          expect(b, wo).not.toMatch(/geschützt/i);
          if (/erstatt|zuschuss|übernehm/i.test(b)) expect(b, wo).not.toMatch(MENGE);
        }
        // Der Nutzen-Kasten bewertet nicht: kein „medizinisch nicht notwendig“, kein „kein medizinischer Nutzen“.
        if (o.nutzen) expect(o.nutzen, wo).not.toMatch(/nicht notwendig|kein medizinischer Nutzen/i);
      }
      const m = (s as { marketing?: { headline: string; problem: string; beispiel: string } }).marketing;
      if (m) for (const t of [m.headline, m.problem, m.beispiel]) expect(t, s.id).not.toMatch(/umsatz|bekannteste|meistkritisiert|lohnen|brechen viele|offen anbieten|\bbeste\b|optimal/i);
    }
    expect(n).toBeGreaterThan(20);
    for (const de of Object.keys(CONTENT_EN)) if (/erstatt|übernehm|zuschuss/i.test(de)) expect(de).not.toMatch(MENGE);
  });
});

// Öffentlicher Leistungskatalog (app/leistungen/[id]): Die Hinweise beschreiben, sie werten nicht („Wirksamkeit nicht
// belegt“, „umstritten“, „empfohlen“) und nennen keine Mengen ohne Quelle („viele Kassen“, „oft“, „meist“).
describe("Leistungskatalog: Hinweise ohne Wertung und ohne Mengenangaben", () => {
  const MENGE = /\b(viele|vielen|oft|häufig|meist|meistens|die meisten|fast alle)\b/i;
  const WERTEND = /wirksam|wirkung|belegt|nachgewiesen|umstritten|empfohlen|empfehl|sinnvoll|bewährt|heilversprechen vermeiden/i;
  it("kein Hinweis wertet oder nennt eine Menge ohne Quelle", async () => {
    const { LEISTUNGEN, leistung } = await import("./leistungskatalog");
    const mitHinweis = LEISTUNGEN.filter((l) => l.hinweis);
    expect(mitHinweis.length).toBeGreaterThan(20);
    // „Heilversprechen vermeiden (HWG)“ bei der Infusionstherapie ist ein Merkpunkt zur Werbung, keine Aussage über die Leistung.
    for (const l of mitHinweis) {
      expect(l.hinweis, l.id).not.toMatch(MENGE);
      if (l.id !== "aesthetische-medizin-minimal-invasiv-infusionstherapie") expect(l.hinweis, l.id).not.toMatch(WERTEND);
    }
    // Wirkungs- und Haltbarkeitsaussagen in den Zeilen mit NiSV-Hinweisen (Prüfbefund): nur das Verfahren
    for (const id of ["aesthetische-medizin-minimal-invasiv-laser-haarentfernung", "aesthetische-medizin-minimal-invasiv-ultraschall-lifting", "aesthetische-medizin-minimal-invasiv-radiofrequenz-microneedling", "aesthetische-medizin-minimal-invasiv-cellulite-behandlung"]) {
      const l = leistung(id)!;
      expect(l, id).not.toBeNull();
      expect(`${l.fachbegriff} ${l.beschreibung}`, id).not.toMatch(/dauerhaft|strafft|straffung|glättet/i);
    }
    // § 7 NiSV deckt nur Muskelaufbau und Muskelstraffung; Fettreduktion mit Hochfrequenz ist ärztlich (§ 6 Abs. 2 NiSV).
    const muskel = leistung("aesthetische-medizin-minimal-invasiv-muskelaufbau-fettreduktion-per-geraet")!;
    expect(muskel.name).not.toMatch(/Fett/);
    expect(muskel.hinweis).toMatch(/§ 6 Abs\. 2 NiSV/);
    // Subzision ist ein Eingriff unter der Haut: ärztlich
    expect(leistung("aesthetische-medizin-minimal-invasiv-cellulite-behandlung")!.behandler).toMatch(/^Arzt \(Subzision\)/);
  });
});
