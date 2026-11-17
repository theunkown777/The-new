// Grundsatz 1, automatisch geprüft: Die Software empfiehlt nichts.
//  - Vorausgewählt (item.recommended) ist nie etwas anderes als die Kassen- bzw. Regelleistung.
//  - Der Brief an den Patienten enthält nie die Wörter „Empfehlung“, „empfehlen“, „sinnvoll“, „Behandlungsbedarf“.
// Geprüft wird jede Kombination: jeder Zahnbefund an jeder Zahnart mit und ohne Nachbarlücke, jeder
// allgemeine Befund, jede Lücke je Kiefer, dazu alle Fächer aus lib/specialties.ts mit allen Anlässen.
import { describe, expect, it } from "vitest";
import {
  ABGEWAEHLT, DEFAULT_PRICES, FINDINGS, GLOBAL_FINDINGS, LOWER_TEETH, UPPER_TEETH, buildLetter, buildProposal, neighbors,
  type FindingCode, type GlobalCode, type PatientFactors, type ProposalInput, type ProposalItem,
} from "./proposals";
import { ALLE_SPECIALTIES, DENTAL_ID } from "./specialties";
import { CUSTOM_PREFIX } from "./medicalProposals";

const VERBOTEN = /empfehlung|empfehlen|empfiehlt|empfohlen|sinnvoll|behandlungsbedarf/i;
const BASIS = new Set(["kasse", "regel"]);
// Bekannte Ausnahmen außerhalb des Briefs. Jede steht mit Grund hier, damit eine neue Stelle auffällt.
const AUSNAHMEN: { text: RegExp; grund: string; fach?: boolean }[] = [
  // Amtlicher Begriff: die Empfehlung der Ständigen Impfkommission. Sie beschreibt bei einer Kassenleistung, wann die Kasse zahlt.
  { text: /nach STIKO-Empfehlung$/, grund: "amtlicher Begriff, keine Empfehlung der Software", fach: true },
  // Die zwei früheren Ausnahmen im Zahn-Regelwerk („… langfristig sinnvoller“, „… nur bei erhöhtem Kariesrisiko sinnvoll“)
  // sind neutral gefasst. Im Zahn-Regelwerk gibt es keine Ausnahme mehr.
];
const istAusnahme = (t: string) => AUSNAHMEN.some((a) => a.text.test(t));
const BEFUNDE = Object.keys(FINDINGS) as FindingCode[];
const ALLGEMEIN = Object.keys(GLOBAL_FINDINGS) as GlobalCode[];
/** Je Zahnart ein Zahn je Kiefer und Seite: vorn (Schneide- und Eckzahn), Prämolar, Molar, Weisheitszahn. */
const ZAEHNE = { vorn: [11, 13, 22, 31, 43], praemolar: [14, 25, 35, 44], molar: [16, 27, 36, 47], weisheitszahn: [18, 48] } as const;
const TAGE = [new Date("2026-11-16T10:00:00Z"), new Date("2027-02-01T10:00:00Z")];

const patient = (mehr: Partial<PatientFactors> = {}): PatientFactors => ({ age: 45, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0, ...mehr });
const PATIENTEN: PatientFactors[] = [
  patient(),
  patient({ bonusYears: 10, zuschussJahr: 2027 }),
  patient({ haertefall: true }),
  patient({ age: 16 }),
  patient({ age: 9 }),
  patient({ age: null }),
  patient({ age: 70, erstattungProzent: 80 }),
  patient({ insurance: "PKV", erstattungProzent: 80 }),
  patient({ insurance: "PKV", age: 12, erstattungProzent: 100 }),
];

let geprueftePositionen = 0;
let gepruefteBriefe = 0;

/** Vorauswahl einer Position: leer oder eine vorhandene Option vom Typ Kasse/Regel. */
function vorauswahlPruefen(items: ProposalItem[], wo: string) {
  for (const item of items) {
    geprueftePositionen++;
    if (item.recommended == null) continue;
    const o = item.options.find((x) => x.id === item.recommended);
    if (!o || !BASIS.has(o.type)) {
      throw new Error(`${wo}: Position „${item.where}: ${item.title}“ ist vorausgewählt auf „${o ? `${o.name}“ (Typ ${o.type})` : `${item.recommended}“ (gibt es nicht)`}`);
    }
  }
}

/** Brief in drei Lagen: nichts angeklickt, überall die letzte (meist teuerste) Option angeklickt, alles Freiwillige abgewählt. */
function briefePruefen(items: ProposalItem[], input: ProposalInput, wo: string) {
  const wahlen: Record<string, string>[] = [
    {},
    Object.fromEntries(items.filter((i) => i.options.length).map((i) => [i.key, i.options[i.options.length - 1].id])),
    Object.fromEntries(items.map((i) => [i.key, ABGEWAEHLT])),
  ];
  for (const choices of wahlen) {
    for (const date of TAGE) {
      const brief = buildLetter({ items, choices, patient: input.patient, patientName: "Erika Muster", practiceName: "Praxis Muster", date, fach: input.fach });
      gepruefteBriefe++;
      const treffer = VERBOTEN.exec(brief);
      if (treffer) {
        const zeile = brief.split("\n").find((z) => VERBOTEN.test(z)) ?? "";
        throw new Error(`${wo}: Brief enthält „${treffer[0]}“: ${zeile.trim().slice(0, 300)}`);
      }
    }
  }
}

function pruefen(input: ProposalInput, wo: string, mitBrief = true) {
  const items = buildProposal(input, DEFAULT_PRICES);
  vorauswahlPruefen(items, wo);
  if (mitBrief) briefePruefen(items, input, wo);
  return items;
}

describe("Vorauswahl ist immer die Kassen- oder Regelleistung", () => {
  it("jeder Zahnbefund × Zahnart × mit und ohne Nachbarlücke × Patientenlage", () => {
    let faelle = 0;
    for (const befund of BEFUNDE) {
      for (const [art, zaehne] of Object.entries(ZAEHNE)) {
        for (const zahn of zaehne) {
          const nachbarn = neighbors(zahn);
          // ohne Nachbarlücke, je ein Nachbar fehlt, beide Nachbarn fehlen
          const luecken: number[][] = [[], ...nachbarn.map((n) => [n]), ...(nachbarn.length > 1 ? [nachbarn] : [])];
          for (const luecke of luecken) {
            for (const p of PATIENTEN) {
              const teeth: ProposalInput["teeth"] = { [String(zahn)]: befund, ...Object.fromEntries(luecke.map((n) => [String(n), "fehlt" as FindingCode])) };
              const wo = `Zahn ${zahn} (${art}) ${befund}, Nachbarlücke ${luecke.join("+") || "keine"}, ${p.insurance} Alter ${p.age}${p.haertefall ? " Härtefall" : ""}`;
              const items = pruefen({ teeth, globals: {}, patient: p }, wo);
              // Jeder Befund führt zu mindestens einer Position (ein fehlender Weisheitszahn bleibt ohne Vorschlag).
              if (!(befund === "fehlt" && art === "weisheitszahn")) expect(items.length, wo).toBeGreaterThan(0);
              faelle++;
            }
          }
        }
      }
    }
    expect(faelle).toBeGreaterThan(3000);
  }, 120_000);

  it("jeder allgemeine Befund, allein, zusammen und neben einem Zahnbefund", () => {
    for (const p of PATIENTEN) {
      for (const code of ALLGEMEIN) {
        pruefen({ teeth: {}, globals: { [code]: true }, patient: p }, `allgemein ${code}, ${p.insurance} Alter ${p.age}`);
        for (const befund of BEFUNDE) pruefen({ teeth: { "36": befund }, globals: { [code]: true }, patient: p }, `Zahn 36 ${befund} mit ${code}, ${p.insurance} Alter ${p.age}`, befund === "fehlt" || befund === "zerstoert");
      }
      const alle = Object.fromEntries(ALLGEMEIN.map((c) => [c, true]));
      pruefen({ teeth: {}, globals: alle, patient: p }, `alle allgemeinen Befunde, ${p.insurance} Alter ${p.age}`);
      pruefen({ teeth: { "11": "fehlt", "26": "zerstoert", "46": "karies_gross" }, globals: alle, patient: p }, `gemischter Befund mit allen allgemeinen Befunden, ${p.insurance} Alter ${p.age}`);
    }
  }, 120_000);

  it("jede Lücke je Kiefer: 1 bis 6 fehlende Zähne an jeder Stelle, Freiend, zahnloser Kiefer, beide Kiefer", () => {
    let faelle = 0;
    for (const kiefer of [UPPER_TEETH, LOWER_TEETH]) {
      for (let start = 0; start < kiefer.length; start++) {
        for (let laenge = 1; laenge <= 6 && start + laenge <= kiefer.length; laenge++) {
          const fehlend = kiefer.slice(start, start + laenge);
          for (const p of [PATIENTEN[0], PATIENTEN[2], PATIENTEN[7]]) {
            const teeth = Object.fromEntries(fehlend.map((n) => [String(n), "fehlt" as FindingCode]));
            for (const psi of [false, true]) pruefen({ teeth, globals: psi ? { psi: true } : {}, patient: p }, `fehlend ${fehlend.join(",")}${psi ? " mit Parodontitis" : ""}, ${p.insurance}`, laenge <= 4);
            faelle++;
          }
        }
      }
      for (const rest of [0, 2, 3, 4]) {
        // zahnlos bzw. kleiner Restzahnbestand (Eckzähne bleiben zuerst)
        const bleiben = kiefer.filter((n) => n % 10 === 3 || (rest > 2 && n % 10 === 4)).slice(0, rest);
        const teeth = Object.fromEntries(kiefer.filter((n) => !bleiben.includes(n)).map((n) => [String(n), "fehlt" as FindingCode]));
        for (const p of PATIENTEN) pruefen({ teeth, globals: {}, patient: p }, `Kiefer mit ${rest} Restzähnen, ${p.insurance} Alter ${p.age}`);
        faelle++;
      }
    }
    const alles = Object.fromEntries([...UPPER_TEETH, ...LOWER_TEETH].map((n) => [String(n), "fehlt" as FindingCode]));
    for (const p of PATIENTEN) pruefen({ teeth: alles, globals: {}, patient: p }, `beide Kiefer zahnlos, ${p.insurance}`);
    expect(faelle).toBeGreaterThan(400);
  }, 120_000);

  it("2.000 zufällige Gebisse mit festem Startwert", () => {
    let a = 20261116;
    const zufall = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const alle = [...UPPER_TEETH, ...LOWER_TEETH];
    for (let i = 0; i < 2000; i++) {
      const dichte = zufall() * 0.6;
      const teeth: ProposalInput["teeth"] = {};
      for (const n of alle) if (zufall() < dichte) teeth[String(n)] = zufall() < 0.5 ? "fehlt" : BEFUNDE[Math.floor(zufall() * BEFUNDE.length)];
      const globals = Object.fromEntries(ALLGEMEIN.filter(() => zufall() < 0.2).map((c) => [c, true]));
      const p = PATIENTEN[Math.floor(zufall() * PATIENTEN.length)];
      pruefen({ teeth, globals, patient: p }, `Zufallsgebiss ${i}: ${JSON.stringify(teeth)} ${JSON.stringify(globals)} ${p.insurance} Alter ${p.age}`, i % 4 === 0);
    }
  }, 120_000);

  it("alle Fächer mit allen Anlässen: einzeln, alle zusammen, mit eigenen Leistungen der Praxis", () => {
    expect(ALLE_SPECIALTIES.length).toBeGreaterThan(10);
    const eigene = [
      { id: "kasse1", anlass: "Eigene Leistung", name: "Eigene Kassenleistung", price: 40, kasse: true },
      { id: "selbst1", anlass: "Eigene Leistung", name: "Eigene Selbstzahlerleistung", price: 90, nutzen: "Der Nutzen ist nicht belegt." },
      { id: "selbst2", anlass: "Nur Selbstzahler", name: "Zweite Selbstzahlerleistung", price: 120 },
    ];
    let anlaesse = 0;
    for (const fach of ALLE_SPECIALTIES) {
      expect(fach.id).not.toBe(DENTAL_ID);
      expect(fach.anlaesse.length, `${fach.id}: keine Anlässe`).toBeGreaterThan(0);
      const alter = [null, 5, 17, 18, 34, 35, 50, 55, 64, 65, 80];
      for (const age of alter) {
        for (const insurance of ["GKV", "PKV"] as const) {
          const p = patient({ age, insurance, erstattungProzent: insurance === "PKV" ? 80 : 0 });
          for (const anlass of fach.anlaesse) {
            const items = pruefen({ teeth: {}, globals: {}, patient: p, fach: fach.id, anlaesse: [anlass.id] }, `${fach.id} / ${anlass.id}, ${insurance} Alter ${age}`);
            expect(items.length, `${fach.id} / ${anlass.id}: keine Position`).toBeGreaterThan(0);
            // Gibt es eine Kassenleistung, ist sie vorausgewählt; sonst nichts. Zusatzleistungen sind nie vorausgewählt.
            for (const item of items) {
              const kasse = item.options.find((o) => o.type === "kasse");
              if (item.zusatz) expect(item.recommended, `${fach.id} / ${anlass.id}: Zusatzleistung vorausgewählt`).toBeNull();
              else expect(item.recommended, `${fach.id} / ${anlass.id}`).toBe(kasse?.id ?? null);
            }
            anlaesse++;
          }
          const alleIds = [...fach.anlaesse.map((x) => x.id), ...eigene.map((e) => `${CUSTOM_PREFIX}${e.id}`)];
          pruefen({ teeth: {}, globals: {}, patient: p, fach: fach.id, anlaesse: alleIds, med: { custom: eigene } }, `${fach.id} / alle Anlässe mit eigenen Leistungen, ${insurance} Alter ${age}`);
        }
      }
    }
    expect(anlaesse).toBeGreaterThan(500);
  }, 120_000);

  it("die Texte der Fächer selbst (Leistungen, Vorteile, Hinweise) enthalten die Wörter ebenfalls nicht", () => {
    const funde: string[] = [];
    for (const fach of ALLE_SPECIALTIES) {
      for (const a of fach.anlaesse) {
        const texte = [a.label, a.bereich, ...(a.notes ?? []), ...a.options.flatMap((o) => [o.name, ...o.benefits, o.kasseWenn ?? "", o.nutzen ?? ""])];
        for (const t of texte) if (VERBOTEN.test(t) && !istAusnahme(t)) funde.push(`${fach.id} / ${a.id}: ${t.slice(0, 160)}`);
      }
    }
    expect(funde).toEqual([]);
  });

  it("die Texte des Zahn-Regelwerks (Namen, Vorteile, Hinweise, Ausschlüsse) enthalten die Wörter ebenfalls nicht", () => {
    const funde = new Set<string>();
    const gefundeneAusnahmen = new Set<string>();
    for (const p of PATIENTEN) {
      const eingaben: ProposalInput[] = [
        ...BEFUNDE.flatMap((b) => [11, 14, 16, 18].map((z) => ({ teeth: { [String(z)]: b }, globals: {}, patient: p }) as ProposalInput)),
        { teeth: { "11": "fehlt", "12": "fehlt", "36": "fehlt", "46": "zerstoert" }, globals: Object.fromEntries(ALLGEMEIN.map((c) => [c, true])), patient: p },
        { teeth: Object.fromEntries(UPPER_TEETH.map((n) => [String(n), "fehlt" as FindingCode])), globals: { psi: true, raucher: true }, patient: p },
      ];
      for (const input of eingaben) {
        for (const item of buildProposal(input, DEFAULT_PRICES)) {
          const texte = [item.where, item.title, ...item.excluded, ...item.notes.map((n) => n.text), ...item.options.flatMap((o) => [o.name, o.typeLabel ?? "", o.hinweis ?? "", o.nutzen ?? "", ...o.benefits])];
          for (const t of texte) {
            if (!VERBOTEN.test(t)) continue;
            if (istAusnahme(t)) gefundeneAusnahmen.add(t);
            else funde.add(t.slice(0, 200));
          }
        }
      }
    }
    expect([...funde]).toEqual([]);
    // Ist eine Ausnahme im Regelwerk behoben, soll sie auch hier verschwinden.
    expect(gefundeneAusnahmen.size, "Ausnahmeliste enthält Einträge, die es nicht mehr gibt").toBe(AUSNAHMEN.filter((a) => !a.fach).length);
    // Was der Patient sieht (Hinweise der Art „info“), ist von den Ausnahmen nicht betroffen.
    for (const p of PATIENTEN) {
      for (const b of BEFUNDE) {
        for (const z of [11, 14, 16]) {
          for (const item of buildProposal({ teeth: { [String(z)]: b }, globals: {}, patient: p }, DEFAULT_PRICES)) {
            for (const n of item.notes.filter((x) => x.kind === "info")) expect(istAusnahme(n.text), n.text).toBe(false);
          }
        }
      }
    }
  });

  it("hat wirklich viel geprüft", () => {
    console.info(`Vorauswahl: ${geprueftePositionen} Positionen und ${gepruefteBriefe} Briefe geprüft`);
    expect(geprueftePositionen).toBeGreaterThan(20000);
    expect(gepruefteBriefe).toBeGreaterThan(20000);
  });
});
