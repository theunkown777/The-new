import { describe, expect, it } from "vitest";
import {
  ANAMNESE_FRAGEN,
  ANAMNESE_JE_FACH,
  ANLIEGEN,
  BASIS_ANLIEGEN,
  BASIS_FRAGEN,
  NEUTRAL,
  anamneseFach,
  anamneseFuer,
  hinweisTeile,
  type Person,
} from "@/lib/anamneseProfile";
import { anamnesePruefen, anamnesisFlags, anamnesisSchemaFuer, parseAnamnesis } from "@/lib/anamnesis";
import { ALLE_SPECIALTIES, DENTAL_ID } from "@/lib/specialties";
import { ZAHN_BEGRIFFE } from "@/lib/zahnBegriffe";

const IDS = ALLE_SPECIALTIES.map((s) => s.id);
/** Jedes Fach außer Zahnmedizin, dazu „andere“ und Fälle ohne oder mit unbekanntem Fach. */
const NICHT_ZAHN: (string | null | undefined)[] = [...IDS, "andere", "unbekannt", "", null, undefined];
const PERSONEN: Person[] = [{}, { geschlecht: "W", alter: 30 }, { geschlecht: "M", alter: 45 }, { geschlecht: "D", alter: 70 }, { alter: 5 }, { geschlecht: "W", alter: 14 }];

/** Alles, was ein Patient oder die Praxis aus dem Bogen eines Fachs liest. */
function alleTexte(fach: string | null | undefined, person: Person = {}): string {
  const p = anamneseFuer(fach, person);
  const d = ANAMNESE_JE_FACH[anamneseFach(fach)];
  const katalog = [...BASIS_FRAGEN, ...d.fragen].map((k) => ANAMNESE_FRAGEN[k]);
  const anliegen = [...BASIS_ANLIEGEN, ...d.anliegen].map((k) => ANLIEGEN[k]);
  return JSON.stringify({ p, katalog, anliegen });
}

describe("Anamnesebogen je Fach", () => {
  it("kennt jedes Fach aus lib/specialties.ts, auch ausgeblendete und Therapieberufe", () => {
    for (const id of [DENTAL_ID, ...IDS]) expect(ANAMNESE_JE_FACH[id], id).toBeDefined();
    // Keine Fächer, die es nicht gibt (außer dem neutralen Bogen).
    for (const id of Object.keys(ANAMNESE_JE_FACH)) expect([DENTAL_ID, NEUTRAL, ...IDS], id).toContain(id);
  });

  it("jedes Fach hat mindestens 2 eigene Fragen und 1 eigenes Anliegen, alle im Katalog", () => {
    for (const id of [DENTAL_ID, ...IDS]) {
      const d = ANAMNESE_JE_FACH[id];
      const eigeneFragen = d.fragen.filter((k) => !(BASIS_FRAGEN as readonly string[]).includes(k));
      const eigeneAnliegen = d.anliegen.filter((k) => !(BASIS_ANLIEGEN as readonly string[]).includes(k));
      expect(eigeneFragen.length, id).toBeGreaterThanOrEqual(2);
      expect(d.fragen.length, id).toBeLessThanOrEqual(4);
      expect(eigeneAnliegen.length, id).toBeGreaterThanOrEqual(1);
      expect(d.anliegen.length, id).toBeLessThanOrEqual(3);
      for (const k of d.fragen) expect(ANAMNESE_FRAGEN[k], `${id}: ${k}`).toBeDefined();
      for (const k of d.anliegen) expect(ANLIEGEN[k], `${id}: ${k}`).toBeDefined();
      for (const k of d.anliegen) expect(ANLIEGEN[k].alt, `${id}: ${k} wird nicht mehr angeboten`).toBeFalsy();
      // Im fertigen Bogen kommen die eigenen Fragen auch an (für eine Person ohne Einschränkung).
      const p = anamneseFuer(id, { geschlecht: "W", alter: 40 });
      expect(p.fach).toBe(id);
      expect(p.fragen.length, id).toBeGreaterThanOrEqual(BASIS_FRAGEN.length + 2);
    }
  });

  it("keine zahnärztlichen Begriffe außerhalb der Zahnmedizin: Fragen, Anliegen, Hinweise, Schweigepflicht", () => {
    for (const fach of NICHT_ZAHN)
      for (const person of PERSONEN) {
        const t = alleTexte(fach, person);
        expect(t, `${fach}: ${t.match(ZAHN_BEGRIFFE)?.[0]}`).not.toMatch(ZAHN_BEGRIFFE);
        expect(t, String(fach)).not.toMatch(/"(knirschen|bisphosphonate|bestrahlung|hell|luecke|zahnfleisch)"/);
      }
  });

  it("Gegenprobe Zahnmedizin: bisherige Fragen und Wünsche bleiben", () => {
    const p = anamneseFuer("zahn");
    const keys = p.fragen.map((f) => f.key);
    for (const k of ["bisphosphonate", "bestrahlung", "knirschen"]) expect(keys).toContain(k);
    expect(p.anliegen.map((a) => a.key)).toEqual(expect.arrayContaining(["hell", "luecke", "zahnfleisch", "angst"]));
    expect(p.schweigepflicht).toBe("Ihre Angaben unterliegen der zahnärztlichen Schweigepflicht.");
  });

  it("andere, fehlendes oder unbekanntes Fach: neutraler Bogen, nie Zahnmedizin", () => {
    for (const f of ["andere", "unbekannt", "", null, undefined, "Zahn", "ZAHN"]) {
      expect(anamneseFach(f), String(f)).toBe(NEUTRAL);
      // Ohne bekanntes Fach keine Behauptung einer Berufspflicht, nur Vertraulichkeit.
      expect(anamneseFuer(f).schweigepflicht).toBe("Wir behandeln Ihre Angaben vertraulich.");
    }
  });

  it("Schweigepflicht je Berufsgruppe: ärztlich nur bei ärztlichen Fächern, Vertraulichkeit ohne Berufspflicht", () => {
    const ARZT = "Ihre Angaben unterliegen der ärztlichen Schweigepflicht.";
    const HEILBERUF = "Ihre Angaben unterliegen der Schweigepflicht.";
    const VERTRAULICH = "Wir behandeln Ihre Angaben vertraulich.";
    // § 203 StGB gilt nach herrschender Meinung nicht für Heilpraktik, Augenoptik, Hörakustik und Sanitätshaus.
    const ohne203 = ["heilpraktiker", "optik", "hoerakustik", "sanitaetshaus"];
    // Psychotherapie leisten auch Psychologische Psychotherapeutinnen und -therapeuten; Kliniken haben viele Berufe.
    const heilberuf = ["psych", "physio", "ergo", "logo", "podo", "hebamme", "pflege", "apotheke", "klinik"];
    for (const s of ALLE_SPECIALTIES) {
      const p = anamneseFuer(s.id);
      const soll = ohne203.includes(s.id) ? VERTRAULICH : heilberuf.includes(s.id) ? HEILBERUF : ARZT;
      expect(p.schweigepflicht, s.id).toBe(soll);
      if (s.beruf === "therapie") expect(p.schweigepflicht, s.id).not.toBe(ARZT);
      // Nicht mehrdeutig: „Sie unterliegen …“ läse sich wie eine Pflicht der Patientin.
      expect(p.schweigepflicht, s.id).not.toMatch(/^Sie\b/);
    }
    expect(anamneseFuer("hausarzt").schweigepflicht).toBe(ARZT);
  });

  it("Kasse zuerst, Angst zuletzt; keine Selbstzahler-Werbung in den Anliegen", () => {
    for (const fach of [DENTAL_ID, ...NICHT_ZAHN]) {
      const a = anamneseFuer(fach).anliegen;
      expect(a[0].key, String(fach)).toBe("kasse");
      if (a.some((x) => x.key === "angst")) expect(a[a.length - 1].key, String(fach)).toBe("angst");
    }
    for (const a of Object.values(ANLIEGEN)) expect(a.text, a.key).not.toMatch(/IGeL|Selbstzahl|günstig|Angebot|Rabatt|Aktion|schöner|jünger|perfekt/i);
  });

  it("Texte: einfach, ohne Gedankenstriche, ohne Wertung", () => {
    const alle = [...Object.values(ANAMNESE_FRAGEN).flatMap((f) => [f.text, f.textEltern, f.detail, f.hinweis?.text]), ...Object.values(ANLIEGEN).flatMap((a) => [a.text, a.textEltern])].filter(Boolean) as string[];
    for (const t of alle) {
      expect(t, t).not.toMatch(/[–—]/);
      expect(t, t).not.toMatch(/empfehl|sollten Sie|müssen Sie|gefährlich|Risiko|Diagnose/i);
    }
    for (const f of Object.values(ANAMNESE_FRAGEN)) expect(f.text, f.key).toMatch(/\?$/);
  });

  it("feste Schlüssel: alle Schlüssel der Fassung 1 stehen weiter im Katalog", () => {
    for (const k of ["medikamente", "blutverduenner", "gerinnung", "bisphosphonate", "allergien", "herz", "blutdruck", "diabetes", "infektion", "bestrahlung", "schwanger", "rauchen", "knirschen"]) expect(ANAMNESE_FRAGEN[k], k).toBeDefined();
    for (const k of ["hell", "luecke", "zahnfleisch", "angst", "kosten"]) expect(ANLIEGEN[k], k).toBeDefined();
    expect(ANLIEGEN.kosten.alt).toBe(true);
  });
});

describe("Filter nach Geschlecht und Alter", () => {
  const keys = (fach: string, person: Person) => anamneseFuer(fach, person).fragen.map((f) => f.key);

  it("Schwangerschaft nur bei Frauen ab 12; Rauchen ab 12; Unbekanntes schließt nichts aus", () => {
    // Kinder- und Jugendmedizin fragt die Eltern (nie nach einer Schwangerschaft), die Hebamme fragt nicht, ob jemand schwanger ist.
    const ohneSchwanger = ["kinder", "hebamme"];
    for (const fach of [DENTAL_ID, ...IDS]) {
      expect(keys(fach, { geschlecht: "M", alter: 40 }), fach).not.toContain("schwanger");
      expect(keys(fach, { geschlecht: "W", alter: 11 }), fach).not.toContain("schwanger");
      expect(keys(fach, { alter: 8 }), fach).not.toContain("rauchen");
      if (ohneSchwanger.includes(fach)) {
        expect(keys(fach, { geschlecht: "W", alter: 30 }), fach).not.toContain("schwanger");
        continue;
      }
      expect(keys(fach, { geschlecht: "W", alter: 30 }), fach).toContain("schwanger");
      expect(keys(fach, {}), fach).toEqual(expect.arrayContaining(["schwanger", "rauchen"]));
    }
    expect(keys("uro", { geschlecht: "M", alter: 60 })).not.toContain("schwanger");
  });

  it("nie an Eltern: Schwangerschaft, Verhütung und andere vertrauliche Fragen", () => {
    const vertraulich = Object.values(ANAMNESE_FRAGEN).filter((f) => f.nurSelbst).map((f) => f.key);
    expect(vertraulich).toEqual(expect.arrayContaining(["schwanger", "verhuetung", "schwangerschaften", "regelblutung"]));
    for (const fach of [DENTAL_ID, ...IDS, "andere"])
      for (const person of [{ geschlecht: "W", alter: 13 }, { geschlecht: "W", alter: 15 }, { alter: 14 }, { geschlecht: "W", alter: 40 }]) {
        const p = anamneseFuer(fach, person);
        if (p.ansprache === "eltern") for (const k of vertraulich) expect(keys(fach, person), `${fach} ${JSON.stringify(person)}`).not.toContain(k);
      }
  });

  it("Kinder- und Jugendmedizin: immer an die Eltern", () => {
    for (const person of PERSONEN) expect(anamneseFuer("kinder", person).ansprache).toBe("eltern");
    const p = anamneseFuer("kinder", { alter: 4 });
    expect(p.fragen.map((f) => f.key)).toEqual(expect.arrayContaining(["impfpass", "u_heft"]));
    expect(p.einleitung).toBe("Ihre Angaben helfen uns, Ihr Kind sicher zu behandeln.");
  });

  it("Ansprache je Fach und Alter (5, 8, 14, 40 Jahre)", () => {
    // Frauenheilkunde und Hebammenhilfe: Jugendliche ab 12 antworten selbst. Kinder- und Jugendmedizin: immer die Eltern.
    const selbstAb12 = ["gyn", "hebamme"];
    for (const fach of [DENTAL_ID, ...IDS, "andere", null])
      for (const geschlecht of ["W", "M", null]) {
        const a = (alter: number) => anamneseFuer(fach, { geschlecht, alter }).ansprache;
        expect(a(5), `${fach} 5`).toBe("eltern");
        expect(a(8), `${fach} 8`).toBe("eltern");
        expect(a(14), `${fach} 14`).toBe(selbstAb12.includes(String(fach)) ? "patient" : "eltern");
        expect(a(40), `${fach} 40`).toBe(fach === "kinder" ? "eltern" : "patient");
      }
  });

  it("Eltern-Ansprache: keine Frage spricht das Kind mit „Sie“ an (Alter 5, 8 und 14)", () => {
    for (const fach of [DENTAL_ID, ...IDS, "andere"])
      for (const person of [{ alter: 5 }, { geschlecht: "W", alter: 8 }, { geschlecht: "M", alter: 8 }, { geschlecht: "W", alter: 14 }, { geschlecht: "M", alter: 14 }]) {
        const p = anamneseFuer(fach, person);
        if (p.ansprache !== "eltern") continue;
        for (const f of p.fragen) if (/\b(Sie|Ihnen)\b/.test(f.text)) expect(f.text, `${fach}: ${f.key}`).toMatch(/Ihr(em|es|er)? Kind/);
        for (const a of p.anliegen) {
          expect(a.text, `${fach}: ${a.key}`).not.toMatch(/\b(ich|mir|mich)\b/i);
          if (/\bmein(e|en|er|em|es)?\b/i.test(a.text)) expect(a.text, `${fach}: ${a.key}`).toMatch(/mein(es)? Kind/i);
        }
        expect(p.einleitung, fach).toContain("Ihr Kind");
      }
  });

  it("Frauenheilkunde: Verhütung, Regelblutung und frühere Schwangerschaften erst ab 12, Krebsfrüherkennung ab 20", () => {
    const gyn = (alter: number) => keys("gyn", { geschlecht: "W", alter });
    const eigene = ["verhuetung", "regelblutung", "schwangerschaften", "letzte_vorsorge"];
    for (const k of eigene) expect(gyn(8), k).not.toContain(k);
    expect(anamneseFuer("gyn", { geschlecht: "W", alter: 8 }).anliegen.map((a) => a.key)).not.toContain("verhuetung_kasse");
    expect(gyn(14)).toEqual(expect.arrayContaining(["verhuetung", "regelblutung", "schwangerschaften"]));
    expect(gyn(14)).not.toContain("letzte_vorsorge");
    expect(gyn(25)).toEqual(expect.arrayContaining(eigene));
  });

  it("Erwachsene werden selbst angesprochen; in Frauenheilkunde und Hebammenhilfe Jugendliche ab 12", () => {
    expect(anamneseFuer("hausarzt", { alter: 40 }).ansprache).toBe("patient");
    expect(anamneseFuer("hausarzt", { alter: 9 }).ansprache).toBe("eltern");
    expect(anamneseFuer("gyn", { alter: 14 }).ansprache).toBe("patient");
    expect(anamneseFuer("hebamme", { alter: 15 }).ansprache).toBe("patient");
    // Kinder werden in keinem Fach mit „Sie“ angesprochen, auch nicht in Pflege, Podologie oder Ästhetik.
    for (const fach of ["gyn", "hebamme", "pflege", "podo", "aesthetik"]) expect(anamneseFuer(fach, { alter: 8 }).ansprache, fach).toBe("eltern");
    expect(anamneseFuer("pflege", { alter: 8 }).fragen.find((f) => f.key === "pflegegrad")?.text).toBe("Hat Ihr Kind einen Pflegegrad?");
    // Ohne bekanntes Alter antwortet die Person selbst.
    expect(anamneseFuer("pflege", {}).ansprache).toBe("patient");
  });

  it("Hinweis zur Krisenhilfe: nicht „sofort“ gelesen, Nummern als Link, für Eltern mit der Nummer gegen Kummer", () => {
    const patient = anamneseFuer("psych", { alter: 30 }).hinweis!;
    const eltern = anamneseFuer("psych", { alter: 13 }).hinweis!;
    for (const h of [patient, eltern]) {
      expect(h).toMatch(/^Die Praxis liest diesen Bogen nicht unbedingt sofort\./);
      expect(hinweisTeile(h).filter((t) => t.tel).map((t) => t.tel)).toEqual(expect.arrayContaining(["08001110111", "08001110222", "112"]));
      expect(hinweisTeile(h).map((t) => t.text).join("")).toBe(h);
    }
    expect(eltern).toContain("116 111");
    expect(hinweisTeile(eltern).some((t) => t.tel === "116111")).toBe(true);
    expect(patient).not.toContain("116 111");
    expect(hinweisTeile("Ohne Nummer.")).toEqual([{ text: "Ohne Nummer." }]);
  });
});

describe("Prüfung je Fach", () => {
  it("lehnt fremde Schlüssel ab und nimmt den vollständigen Bogen an", () => {
    for (const fach of [...NICHT_ZAHN, DENTAL_ID]) {
      const p = anamneseFuer(fach);
      const q = Object.fromEntries(p.fragen.map((f) => [f.key, { yes: false }]));
      const schema = anamnesisSchemaFuer(p);
      expect(schema.safeParse({ q, wishes: [p.anliegen[0].key], confirmName: "Vor Nach" }).success, String(fach)).toBe(true);
      expect(schema.safeParse({ q, wishes: [], confirmName: "Vor Nach", extra: 1 }).success, String(fach)).toBe(false);
      if (fach === DENTAL_ID) continue;
      expect(schema.safeParse({ q, wishes: ["hell"], confirmName: "Vor Nach" }).success, String(fach)).toBe(false);
      expect(schema.safeParse({ q: { ...q, knirschen: { yes: true } }, wishes: [], confirmName: "Vor Nach" }).success, String(fach)).toBe(false);
      const ok = anamnesePruefen({ q, wishes: [], confirmName: "Vor Nach" }, p);
      expect(ok.ok && ok.daten.fach, String(fach)).toBe(p.fach);
    }
  });

  it("v1-Daten (ohne Fach) bleiben lesbar", () => {
    const a = parseAnamnesis({ q: { blutverduenner: { yes: true, detail: "ASS 100" }, knirschen: { yes: false } }, wishes: ["angst"], confirmName: "A B" });
    expect(a).toMatchObject({ v: 1, fach: null, wishes: ["angst"] });
    expect(anamnesisFlags(a!).map((f) => f.text)).toEqual(["Blutverdünner", "Angst vor der Behandlung angegeben"]);
  });
});
