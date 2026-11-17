// Grundsatz 1, zweiter Teil: Sorrida sagt Patienten nichts zur Haltbarkeit oder zum Erfolg einer Behandlung
// („hält länger“, „begrenzt haltbar“, „bewährt und haltbar“, „Ergebnis hält 1–3 Jahre“, „höhere Erfolgsquote“,
// „stoppt Knochenabbau“, „sehr gut verträglich“) und nicht, was jemand braucht, was reicht oder was gleichwertig ist.
// Geprüft wird alles, was die Patientenansicht je Möglichkeit zeigt und vorliest: Name, Stichpunkte und
// die Hinweise der Art „info“. Hinweise der Art „warn“ sieht nur die Praxis im Editor.
// Dazu die Quellen selbst: die Angebote aller Fächer (lib/specialties.ts, lib/fachangebote.ts) und die
// Beispielkarte der Zahnmedizin auf der Website (lib/dentalShowcase.ts).
import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, buildProposal, type FindingCode, type GlobalCode, type PatientFactors, type ProposalInput } from "./proposals";
import { ALLE_SPECIALTIES, DENTAL_ID, type Specialty } from "./specialties";
import { DENTAL_SHOWCASE } from "./dentalShowcase";

const HALTBARKEIT = /haltbar|langlebig|lebensdauer|hält\s+(\d|lange|länger|am längsten|ein leben)|jahre haltbar/i;
/** Aussagen zu Erfolg und Wirkung. „Nach erfolgloser Vorbehandlung“ ist eine Regel der Kasse und kein Treffer. */
const ERFOLG = /erfolgsquote|erfolgsaussicht|erfolgreich|\berfolg\b|wirksam|\bwirkung\b|stoppt|\bverträglich\b|bewährt|schmerzarm|schmerzfrei|lindert|lindern|\bheilt\b|substanzschonend|natürliche optik|\b(besser|bessere|besseres|höhere|glattere|gleichmäßigere)\b/i;
/** Wertungen und Zusagen im Namen der Praxis: „moderne Technik“, „ganzheitlich“, „schneller Termin“, „ohne Wartezeit“, „Kraft und Stabilität“. */
const WERTUNG = /\bmodern|ganzheitlich|schnelle[rnsm]? termin|ohne wartezeit|\bkraft\b|stabilität|schonend|\bsanft|hochwertig|präzise|zuverlässig|\b(genaue[rnsm]?|einfache[rnsm]?|geringe[rnsm]?)\b/i;
/** Aussagen dazu, was jemand braucht, was reicht oder was gleichwertig ist. */
const BEDARF = /\bbrauch(t|en|st)\b|\breicht\b[^.]*\baus\b|ausreichend|gleichwertig|vollwertig|nicht nötig|unnötig|\bnötig\b|ohnehin|aufwendiger|sinnvoll|empfehl|empfohlen|optimal|\bbeste[nrs]?\b/i;
const VERBOTEN = [HALTBARKEIT, ERFOLG, WERTUNG, BEDARF];
/**
 * Die Überschrift einer Position ist der Befund, den die Praxis angeklickt hat („Stark zerstört, Krone nötig“),
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

  // Der Kasten „Zum Nutzen“ sagt, wo ein Nutzen nicht belegt ist oder was eine Leistung nicht ersetzt. Er sagt nicht,
  // dass etwas wirkt oder hilft, und nicht, was stattdessen zu tun wäre („am meisten bringt der Rauchstopp“,
  // „Beckenbodentraining ist die Basis“, „Kann Todesfälle verhindern“, „Belegt vor allem bei …“).
  it("der Kasten „Nutzen“: keine Aussage zu Haltbarkeit, Erfolg, Wirkung oder Bedarf und keine Therapieaussage", () => {
    // Benannte Ausnahme: „medizinisch notwendig“ ist der Begriff des Gesetzes für die Kassenleistung (§ 12 SGB V).
    const AUSNAHMEN = new Set<string>([]);
    const POSITIV = /verhinder|\bbringt\b|\bhilft\b|ist die basis|\bschützt\b|\bsenkt\b|vor allem bei/i;
    let texte = 0;
    for (const s of [...ALLE_SPECIALTIES, DENTAL_SHOWCASE]) {
      for (const o of s.anlaesse.flatMap((a) => a.options)) {
        if (!o.nutzen) continue;
        texte++;
        const wo = `${s.id}/${o.id}`;
        if (AUSNAHMEN.has(wo)) continue;
        for (const muster of [HALTBARKEIT, ERFOLG, BEDARF, POSITIV]) expect(o.nutzen, wo).not.toMatch(muster);
        // „belegt“, „gezeigt“, „nachgewiesen“ nur verneint: „ist ein Nutzen nicht belegt“, „kein Nutzen belegt“.
        if (/belegt|gezeigt|nachgewiesen/i.test(o.nutzen)) expect(o.nutzen, wo).toMatch(/\b(nicht|kein|keine)\b/i);
      }
    }
    expect(texte).toBeGreaterThan(30);
  });
});
