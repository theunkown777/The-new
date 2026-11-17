// „Eigene Angaben mitnehmen“: Verschlüsselung, Ablage, Ablauf und Zuordnung der Fragen (ohne Browser).
import { describe, expect, it } from "vitest";
import { anamneseFuer } from "@/lib/anamneseProfile";
import {
  ANGABEN_SCHLUESSEL,
  FalscherCode,
  MAX_KOPIEN,
  MAX_PROTOKOLL,
  PBKDF2_DURCHLAEUFE,
  PBKDF2_MINDESTENS,
  ablageLesen,
  ablageSchreiben,
  ablaufTag,
  abgelaufen,
  codeGueltig,
  heute,
  kopieAblegen,
  kopieEntfernen,
  kopieEntschluesseln,
  kopieVerschluesseln,
  protokollNotieren,
  type Ablage,
  type AngabenInhalt,
  type Kopie,
} from "@/lib/meineAngaben";
import { NIE_MITNEHMEN, angabenAusBogen, uebernahmeFuer } from "@/lib/meineAngabenUebernahme";

const INHALT: AngabenInhalt = {
  v: 1,
  fach: "zahn",
  ansprache: "patient",
  praxis: "Zahnarztpraxis Dr. Sonnenberg",
  q: { medikamente: { yes: true, detail: "Ramipril 5 mg" }, allergien: { yes: true, detail: "Penicillin" }, herz: { yes: false }, knirschen: { yes: true } },
};
const META = { bezeichnung: "Meine Angaben", stand: "2026-11-17", gruppe: "zahn" as const };
const CODE = "Sonne-2026";
// Für schnelle Tests die kleinste erlaubte Zahl; neue Kopien nutzen PBKDF2_DURCHLAEUFE.
const SCHNELL = PBKDF2_MINDESTENS;

describe("WebCrypto steht bereit", () => {
  it("in Node 22 wie im Browser als globalThis.crypto.subtle", () => {
    expect(typeof globalThis.crypto?.subtle?.deriveKey).toBe("function");
    expect(typeof globalThis.crypto.getRandomValues).toBe("function");
  });
});

describe("Verschlüsseln und Entschlüsseln", () => {
  it("öffnet mit dem richtigen Code genau den Inhalt", async () => {
    const k = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    expect(await kopieEntschluesseln(k, CODE)).toEqual(INHALT);
  });
  it("neue Kopien nutzen mindestens 250 000 Durchläufe, Salz und IV sind zufällig", async () => {
    expect(PBKDF2_DURCHLAEUFE).toBeGreaterThanOrEqual(250_000);
    const a = await kopieVerschluesseln(INHALT, CODE, META);
    const b = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    expect(a.iter).toBe(PBKDF2_DURCHLAEUFE);
    expect(atob(a.salt)).toHaveLength(16);
    expect(atob(a.iv)).toHaveLength(12);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.id).not.toBe(b.id);
    expect(a.daten).not.toBe(b.daten);
  });
  it("ein falscher Code ergibt einen Fehler, keinen Inhalt", async () => {
    const k = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    await expect(kopieEntschluesseln(k, "sonne-2026")).rejects.toBeInstanceOf(FalscherCode);
    await expect(kopieEntschluesseln(k, "")).rejects.toBeInstanceOf(FalscherCode);
  });
  it("eine veränderte Kopie lässt sich nicht öffnen (Stand, Art und Inhalt sind gebunden)", async () => {
    const k = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    await expect(kopieEntschluesseln({ ...k, stand: "2026-11-18" }, CODE)).rejects.toBeInstanceOf(FalscherCode);
    await expect(kopieEntschluesseln({ ...k, gruppe: "arzt" }, CODE)).rejects.toBeInstanceOf(FalscherCode);
    const bytes = Uint8Array.from(atob(k.daten), (c) => c.charCodeAt(0));
    bytes[3] ^= 1;
    await expect(kopieEntschluesseln({ ...k, daten: btoa(String.fromCharCode(...bytes)) }, CODE)).rejects.toBeInstanceOf(FalscherCode);
  });
  it("nimmt keine Kopie mit weniger als 250 000 Durchläufen an und legt keine an", async () => {
    const k = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    await expect(kopieEntschluesseln({ ...k, iter: 1000 }, CODE)).rejects.toThrow();
    await expect(kopieVerschluesseln(INHALT, CODE, META, 100_000)).rejects.toThrow();
  });
  it("verlangt einen Code mit mindestens 6 Zeichen", async () => {
    expect(codeGueltig("12345")).toBe(false);
    expect(codeGueltig("      ")).toBe(false);
    expect(codeGueltig("123456")).toBe(true);
    await expect(kopieVerschluesseln(INHALT, "kurz", META, SCHNELL)).rejects.toThrow();
  });
  it("im Speicher steht kein Klartext: keine Antwort, keine Ergänzung, kein Praxisname, kein Fach, kein Code", async () => {
    const k = await kopieVerschluesseln(INHALT, CODE, META, SCHNELL);
    const roh = ablageSchreiben({ kopien: [k], protokoll: [] });
    for (const wort of ["Ramipril", "Penicillin", "Sonnenberg", "medikamente", "allergien", "knirschen", "yes", "true", "fach", "ansprache", "patient", CODE]) {
      expect(roh, wort).not.toContain(wort);
    }
    // Lesbar ist nur die Art des Bogens (hier „arzt“), nicht das Fach der Quelle.
    const haus = await kopieVerschluesseln({ ...INHALT, fach: "psych", praxis: "Praxis für Psychotherapie" }, CODE, { ...META, gruppe: "arzt" }, SCHNELL);
    expect(ablageSchreiben({ kopien: [haus], protokoll: [] })).not.toMatch(/psych/i);
    expect(Object.keys(JSON.parse(roh).kopien[0]).sort()).toEqual(["bezeichnung", "daten", "gruppe", "id", "iter", "iv", "salt", "stand"]);
  });
  it("lehnt Inhalte mit unbekannten Feldern ab (kein Name, kein Geburtsdatum, keine Wünsche)", async () => {
    await expect(kopieVerschluesseln({ ...INHALT, name: "Anna" } as AngabenInhalt, CODE, META, SCHNELL)).rejects.toThrow();
    await expect(kopieVerschluesseln({ ...INHALT, wishes: ["hell"] } as AngabenInhalt, CODE, META, SCHNELL)).rejects.toThrow();
  });
});

describe("Ablage auf dem Gerät", () => {
  const kopie = (id: string, bezeichnung: string, stand = "2026-11-17"): Kopie => ({
    id: id.padStart(16, "0"),
    bezeichnung,
    stand,
    gruppe: "zahn",
    salt: "A".repeat(22) + "==",
    iv: "B".repeat(16),
    iter: PBKDF2_DURCHLAEUFE,
    daten: "C".repeat(40),
  });
  const jetzt = new Date(2026, 10, 17, 12);

  it("liest leer, kaputt und fremd ohne Absturz und verwirft Kaputtes", () => {
    expect(ablageLesen(null, jetzt)).toEqual({ kopien: [], protokoll: [], geaendert: false, abgelaufen: 0 });
    expect(ablageLesen("{kaputt", jetzt).geaendert).toBe(true);
    expect(ablageLesen(JSON.stringify({ v: 2, kopien: [] }), jetzt).geaendert).toBe(true);
    const r = ablageLesen(JSON.stringify({ v: 1, kopien: [kopie("1", "A"), { id: "x" }, { ...kopie("2", "B"), iter: 10 }], protokoll: [] }), jetzt);
    expect(r.kopien.map((k) => k.bezeichnung)).toEqual(["A"]);
    expect(r.geaendert).toBe(true);
  });
  it("schreibt nur die erlaubten Felder", () => {
    const roh = ablageSchreiben({ kopien: [{ ...kopie("1", "A"), name: "Anna", token: "x" } as Kopie], protokoll: [{ am: "2026-11-17", praxis: "Hausarztpraxis", kopie: "A", link: "/a/x" } as never] });
    const j = JSON.parse(roh);
    expect(Object.keys(j).sort()).toEqual(["kopien", "protokoll", "v"]);
    expect(Object.keys(j.kopien[0]).sort()).toEqual(["bezeichnung", "daten", "gruppe", "id", "iter", "iv", "salt", "stand"]);
    expect(Object.keys(j.protokoll[0]).sort()).toEqual(["am", "kopie", "praxis"]);
  });
  it("höchstens 5 Kopien: die sechste wird abgelehnt, gleicher Name ersetzt nur auf Wunsch", () => {
    let a: Ablage = { kopien: [], protokoll: [] };
    for (let i = 1; i <= MAX_KOPIEN; i++) {
      const r = kopieAblegen(a, kopie(String(i), `Kopie ${i}`));
      expect(r.art).toBe("neu");
      a = r.ablage;
    }
    expect(MAX_KOPIEN).toBe(5);
    expect(kopieAblegen(a, kopie("6", "Kopie 6")).art).toBe("voll");
    expect(kopieAblegen(a, kopie("7", "kopie 3 ")).art).toBe("gleicherName");
    const ersetzt = kopieAblegen(a, kopie("7", "Kopie 3"), true);
    expect(ersetzt.art).toBe("ersetzt");
    expect(ersetzt.ablage.kopien).toHaveLength(5);
    expect(ersetzt.ablage.kopien[0].id).toBe("7".padStart(16, "0"));
    const sieben = JSON.stringify({ v: 1, kopien: [1, 2, 3, 4, 5, 6, 7].map((i) => kopie(String(i), `K${i}`)) });
    const gelesen = ablageLesen(sieben, jetzt);
    expect(gelesen.kopien).toHaveLength(5);
    expect(gelesen.geaendert).toBe(true);
    expect(kopieEntfernen(a, "3".padStart(16, "0")).kopien.map((k) => k.bezeichnung)).toEqual(["Kopie 5", "Kopie 4", "Kopie 2", "Kopie 1"]);
  });
  it("Kopien verfallen 12 Monate nach ihrem Stand und werden beim Lesen gelöscht", () => {
    expect(ablaufTag("2026-11-17")).toBe("2027-11-17");
    expect(ablaufTag("2028-02-29")).toBe("2029-03-01");
    expect(abgelaufen("2026-11-17", new Date(2027, 10, 16, 23))).toBe(false);
    expect(abgelaufen("2026-11-17", new Date(2027, 10, 17, 0, 5))).toBe(true);
    const roh = JSON.stringify({ v: 1, kopien: [kopie("1", "Neu", "2026-06-01"), kopie("2", "Alt", "2025-11-17")], protokoll: [{ am: "2025-11-01", praxis: "Alt", kopie: "Alt" }, { am: "2026-11-01", praxis: "Hausarztpraxis", kopie: "Neu" }] });
    const r = ablageLesen(roh, jetzt);
    expect(r.kopien.map((k) => k.bezeichnung)).toEqual(["Neu"]);
    expect(r.abgelaufen).toBe(1);
    expect(r.protokoll.map((p) => p.praxis)).toEqual(["Hausarztpraxis"]);
    expect(r.geaendert).toBe(true);
  });
  it("Protokoll: neueste zuerst, höchstens 20 Einträge, nur Tag, Praxis und Name der Kopie", () => {
    let a: Ablage = { kopien: [], protokoll: [] };
    for (let i = 0; i < 25; i++) a = protokollNotieren(a, { am: heute(jetzt), praxis: `Praxis ${i}`, kopie: "Meine Angaben" });
    expect(a.protokoll).toHaveLength(MAX_PROTOKOLL);
    expect(a.protokoll[0].praxis).toBe("Praxis 24");
    expect(protokollNotieren(a, { am: "gestern", praxis: "X", kopie: "Y" })).toBe(a);
  });
  it("der Schlüssel im Speicher ist fest", () => {
    expect(ANGABEN_SCHLUESSEL).toBe("sorrida:meine-angaben:v1");
  });
});

describe("Zuordnung: nur passende Fragen", () => {
  const ja = (detail?: string) => ({ yes: true, ...(detail ? { detail } : {}) });
  const alleJa = (profil: ReturnType<typeof anamneseFuer>) => Object.fromEntries(profil.fragen.map((f) => [f.key, ja(f.detail ? "Ergänzung" : undefined)]));

  it("speichert nur beantwortete Fragen des Bogens, ohne Angaben zum Anlass, Ergänzungen nur bei Ja", () => {
    const zahn = anamneseFuer("zahn", { geschlecht: "W", alter: 30 });
    const q = angabenAusBogen(zahn, { ...alleJa(zahn), herz: { yes: false, detail: "nicht senden" }, fremd: { yes: true } });
    expect(q.schwanger).toBeUndefined();
    expect(q.fremd).toBeUndefined();
    expect(q.herz).toEqual({ yes: false });
    expect(q.medikamente).toEqual({ yes: true, detail: "Ergänzung" });
    expect(q.knirschen).toEqual({ yes: true });
    for (const k of NIE_MITNEHMEN) expect(q[k]).toBeUndefined();
  });

  it("Zahnarzt → Hausarzt: nur Grundfragen, keine zahnärztliche Frage", () => {
    const zahn = anamneseFuer("zahn", { geschlecht: "M", alter: 40 });
    const haus = anamneseFuer("hausarzt", { geschlecht: "M", alter: 40 });
    const r = uebernahmeFuer({ fach: "zahn", ansprache: "patient", q: angabenAusBogen(zahn, alleJa(zahn)) }, haus);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.werte).sort()).toEqual(["allergien", "blutdruck", "blutverduenner", "diabetes", "gerinnung", "herz", "infektion", "medikamente", "rauchen"]);
    for (const k of ["bisphosphonate", "bestrahlung", "knirschen", "schwanger"]) expect(r.werte[k]).toBeUndefined();
  });

  it("Hausarzt → Zahnarzt: keine ärztliche Frage in den zahnärztlichen Bogen", () => {
    const haus = anamneseFuer("hausarzt", { alter: 50 });
    const q = { ...angabenAusBogen(haus, alleJa(haus)), bisphosphonate: { yes: true }, operationen: { yes: true } };
    const r = uebernahmeFuer({ fach: "hausarzt", ansprache: "patient", q }, anamneseFuer("zahn", { alter: 50 }));
    expect(r.ok && Object.keys(r.werte).every((k) => (["medikamente", "blutverduenner", "gerinnung", "allergien", "herz", "blutdruck", "diabetes", "infektion", "rauchen"] as string[]).includes(k))).toBe(true);
    expect(r.ok && r.werte.bisphosphonate).toBeFalsy();
  });

  it("Hausarzt → Chirurgie: gemeinsame Fachfragen gehen mit (Operationen)", () => {
    const haus = anamneseFuer("hausarzt", { alter: 50 });
    const r = uebernahmeFuer({ fach: "hausarzt", ansprache: "patient", q: angabenAusBogen(haus, alleJa(haus)) }, anamneseFuer("chirurgie", { alter: 50 }));
    expect(r.ok && r.werte.operationen).toEqual({ yes: true, detail: "Ergänzung" });
    expect(r.ok && r.werte.familie_erkrankungen).toBeFalsy();
  });

  it("Kinderarzt: nur eine Kopie in der Eltern-Fassung passt, nie eine eigene Kopie der Eltern", () => {
    const kinder = anamneseFuer("kinder", { alter: 6 });
    expect(kinder.ansprache).toBe("eltern");
    const eigene = uebernahmeFuer({ fach: "hausarzt", ansprache: "patient", q: { medikamente: ja("Ramipril") } }, kinder);
    expect(eigene).toEqual({ ok: false, grund: "ansprache" });
    const zahnKind = anamneseFuer("zahn", { alter: 6 });
    expect(zahnKind.ansprache).toBe("eltern");
    const kind = uebernahmeFuer({ fach: "zahn", ansprache: "eltern", q: angabenAusBogen(zahnKind, alleJa(zahnKind)) }, kinder);
    expect(kind.ok).toBe(true);
    if (kind.ok) {
      expect(kind.werte.medikamente).toEqual({ yes: true, detail: "Ergänzung" });
      expect(kind.werte.rauchen).toBeUndefined(); // ab 12
      for (const k of ["impfpass", "u_heft"]) expect(kind.werte[k]).toBeUndefined();
    }
    // Eine Kopie für ein Kind füllt nie den Bogen eines Erwachsenen.
    expect(uebernahmeFuer({ fach: "zahn", ansprache: "eltern", q: { medikamente: ja() } }, anamneseFuer("hausarzt", { alter: 40 }))).toEqual({ ok: false, grund: "ansprache" });
  });

  it("nurSelbst: vertrauliche Fragen erreichen nie die Eltern-Fassung", () => {
    // Eine Jugendliche (14) füllt bei der Frauenärztin selbst aus; beim Kinderarzt füllen die Eltern aus.
    const gyn = anamneseFuer("gyn", { geschlecht: "W", alter: 14 });
    expect(gyn.ansprache).toBe("patient");
    const q = angabenAusBogen(gyn, alleJa(gyn));
    expect(q.verhuetung).toBeDefined();
    expect(uebernahmeFuer({ fach: "gyn", ansprache: "patient", q }, anamneseFuer("kinder", { geschlecht: "W", alter: 14 }))).toEqual({ ok: false, grund: "ansprache" });
    // Auch wenn eine Kopie in der Eltern-Fassung (von außen verändert) eine solche Antwort enthielte:
    const r = uebernahmeFuer({ fach: "kinder", ansprache: "eltern", q: { verhuetung: ja("Pille"), regelblutung: ja(), medikamente: ja() } }, anamneseFuer("hausarzt", { geschlecht: "W", alter: 14 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.werte)).toEqual(["medikamente"]);
  });

  it("Altersgrenzen: Fragen erst ab einem Alter kommen nicht in den Bogen eines jüngeren Kindes", () => {
    const kinder10 = anamneseFuer("kinder", { alter: 10 });
    expect(kinder10.fragen.some((f) => f.key === "rauchen")).toBe(false);
    const r = uebernahmeFuer({ fach: "kinder", ansprache: "eltern", q: { rauchen: { yes: false }, allergien: { yes: false } } }, kinder10);
    expect(r).toEqual({ ok: true, werte: { allergien: { yes: false } } });
  });

  it("nichts Passendes: ein eigener Grund, keine leere Übernahme", () => {
    expect(uebernahmeFuer({ fach: "augen", ansprache: "patient", q: { kontaktlinsen: { yes: true } } }, anamneseFuer("zahn", {}))).toEqual({ ok: false, grund: "nichts" });
  });

  it("Ergänzung nur bei Ja und nur, wo der Zielbogen nachfragt", () => {
    const r = uebernahmeFuer({ fach: "zahn", ansprache: "patient", q: { herz: { yes: false, detail: "alt" }, blutdruck: { yes: true, detail: "x" }, allergien: { yes: true, detail: "Penicillin" } } }, anamneseFuer("hausarzt", {}));
    expect(r).toEqual({ ok: true, werte: { herz: { yes: false }, blutdruck: { yes: true }, allergien: { yes: true, detail: "Penicillin" } } });
  });
});
