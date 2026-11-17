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
    expect(p.schweigepflicht).toMatch(/zahnärztlichen Schweigepflicht/);
  });

  it("andere, fehlendes oder unbekanntes Fach: neutraler Bogen, nie Zahnmedizin", () => {
    for (const f of ["andere", "unbekannt", "", null, undefined, "Zahn", "ZAHN"]) {
      expect(anamneseFach(f), String(f)).toBe(NEUTRAL);
      expect(anamneseFuer(f).schweigepflicht).toBe("Sie unterliegen der Schweigepflicht.");
    }
  });

  it("Schweigepflicht je Berufsgruppe: ärztlich nur bei ärztlichen Fächern", () => {
    for (const s of ALLE_SPECIALTIES) {
      const p = anamneseFuer(s.id);
      if (s.beruf === "therapie") expect(p.schweigepflicht, s.id).toBe("Sie unterliegen der Schweigepflicht.");
      expect(p.schweigepflicht, s.id).not.toMatch(/zahn/i);
    }
    expect(anamneseFuer("hausarzt").schweigepflicht).toBe("Sie unterliegen der ärztlichen Schweigepflicht.");
    // Psychotherapie leisten auch Psychologische Psychotherapeutinnen und -therapeuten.
    expect(anamneseFuer("psych").schweigepflicht).toBe("Sie unterliegen der Schweigepflicht.");
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
    for (const fach of [DENTAL_ID, ...IDS]) {
      expect(keys(fach, { geschlecht: "M", alter: 40 }), fach).not.toContain("schwanger");
      expect(keys(fach, { geschlecht: "W", alter: 11 }), fach).not.toContain("schwanger");
      expect(keys(fach, { alter: 8 }), fach).not.toContain("rauchen");
      expect(keys(fach, { geschlecht: "W", alter: 30 }), fach).toContain("schwanger");
      expect(keys(fach, {}), fach).toEqual(expect.arrayContaining(["schwanger", "rauchen"]));
    }
    expect(keys("uro", { geschlecht: "M", alter: 60 })).not.toContain("schwanger");
  });

  it("Kinder- und Jugendmedizin: immer an die Eltern", () => {
    for (const person of PERSONEN) expect(anamneseFuer("kinder", person).ansprache).toBe("eltern");
    const p = anamneseFuer("kinder", { alter: 4 });
    expect(p.fragen.map((f) => f.key)).toEqual(expect.arrayContaining(["impfpass", "u_heft"]));
    expect(p.einleitung).toBe("Ihre Angaben helfen uns, Ihr Kind sicher zu behandeln.");
  });

  it("Eltern-Ansprache: keine Frage spricht das Kind mit „Sie“ an", () => {
    for (const fach of [DENTAL_ID, ...IDS, "andere"]) {
      const p = anamneseFuer(fach, { alter: 8 });
      if (p.ansprache !== "eltern") continue;
      for (const f of p.fragen) if (/\b(Sie|Ihnen)\b/.test(f.text)) expect(f.text, `${fach}: ${f.key}`).toMatch(/Ihr(em|es|er)? Kind/);
      for (const a of p.anliegen) {
        expect(a.text, `${fach}: ${a.key}`).not.toMatch(/\b(ich|mir|mich)\b/i);
        if (/\bmein(e|en|er|es)?\b/i.test(a.text)) expect(a.text, `${fach}: ${a.key}`).toMatch(/mein(es)? Kind/i);
      }
    }
  });

  it("Erwachsene werden selbst angesprochen; feste Ansprache in Frauenheilkunde und Hebammenhilfe", () => {
    expect(anamneseFuer("hausarzt", { alter: 40 }).ansprache).toBe("patient");
    expect(anamneseFuer("hausarzt", { alter: 9 }).ansprache).toBe("eltern");
    expect(anamneseFuer("gyn", { alter: 14 }).ansprache).toBe("patient");
    expect(anamneseFuer("hebamme", { alter: 15 }).ansprache).toBe("patient");
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
