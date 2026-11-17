// Patientenliste speichern: Die Obergrenze hält auch, wenn viele Blöcke gleichzeitig ankommen. Braucht die Datenbank.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_PATIENTEN_MAX, type ImportPatient } from "./patientenImport";
import { importSperre } from "./patientenImportSperre";

const zeilen = (anzahl: number, start: number): ImportPatient[] =>
  Array.from({ length: anzahl }, (_, i) => ({
    zeile: start + i, lastName: `Sperrtest${start + i}`, firstName: "Vorname", birthDate: null, geschlecht: null,
    insuranceType: "GKV", insuranceName: null, phone: null, email: null, patientNummer: null,
  })) as unknown as ImportPatient[];

describe("Name der Sperre", () => {
  it("gilt je Praxis", () => {
    expect(importSperre("a")).not.toBe(importSperre("b"));
    expect(importSperre("a")).toBe("patienten-import:a");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("Import-Sperre in der Datenbank", () => {
  type Modul = typeof import("./patientenImportSperre");
  let m: Modul;
  let prisma: (typeof import("@/lib/prisma"))["prisma"];
  const praxen: string[] = [];

  async function praxis(isDemo: boolean) {
    const p = await prisma.practice.create({ data: { name: `Importsperre ${Date.now()}`, accountHolder: "Test", isDemo }, select: { id: true } });
    praxen.push(p.id);
    return p.id;
  }

  beforeAll(async () => {
    m = await import("./patientenImportSperre");
    prisma = (await import("@/lib/prisma")).prisma;
  });
  afterAll(async () => {
    if (praxen.length) {
      await prisma.patient.deleteMany({ where: { practiceId: { in: praxen } } });
      await prisma.practice.deleteMany({ where: { id: { in: praxen } } });
    }
  });

  it("Gastzugang: 12 gleichzeitige Blöcke mit je 130 Zeilen kommen zusammen nicht über die Grenze", async () => {
    const id = await praxis(true);
    await prisma.patient.createMany({ data: zeilen(70, 1).map((p) => ({ practiceId: id, lastName: p.lastName, firstName: p.firstName, insuranceType: "GKV" })) });
    const laeufe = await Promise.all(
      Array.from({ length: 12 }, (_, i) => m.mitImportSperre(id, (tx) => m.importSpeichern(tx, { practiceId: id, demo: true, neu: zeilen(130, 1000 * (i + 1)) }), { versuche: 200, pauseMs: 20 })),
    );
    const gespeichert = laeufe.filter((l) => !l.belegt && l.wert.ok);
    const abgelehnt = laeufe.filter((l) => !l.belegt && !l.wert.ok);
    // Bestand 70 + 130 = 200: genau ein Block passt, alle anderen sehen den neuen Bestand und werden abgelehnt.
    expect(gespeichert).toHaveLength(1);
    expect(abgelehnt).toHaveLength(11);
    for (const l of abgelehnt) if (!l.belegt && !l.wert.ok) expect(l.wert.grund).toContain(String(DEMO_PATIENTEN_MAX));
    expect(await prisma.patient.count({ where: { practiceId: id } })).toBe(DEMO_PATIENTEN_MAX);
  });

  it("solange ein Block die Sperre hält, bekommt sie kein zweiter; danach ist sie wieder frei", async () => {
    const id = await praxis(true);
    let loslassen!: () => void;
    const warten = new Promise<void>((fertig) => { loslassen = fertig; });
    let haelt!: () => void;
    const gehalten = new Promise<void>((fertig) => { haelt = fertig; });
    const erster = m.mitImportSperre(id, async () => { haelt(); await warten; return "erster"; });
    await gehalten;
    // Zweiter Versuch, während der erste noch arbeitet: nach zwei kurzen Versuchen „belegt“, nichts getan.
    let lief = false;
    expect(await m.mitImportSperre(id, async () => { lief = true; return "zweiter"; }, { versuche: 2, pauseMs: 10 })).toEqual({ belegt: true });
    expect(lief).toBe(false);
    // Eine andere Praxis ist davon nicht betroffen.
    const andere = await praxis(true);
    expect(await m.mitImportSperre(andere, async () => "andere", { versuche: 1 })).toEqual({ belegt: false, wert: "andere" });
    loslassen();
    expect(await erster).toEqual({ belegt: false, wert: "erster" });
    expect(await m.mitImportSperre(id, async () => "dritter", { versuche: 1 })).toEqual({ belegt: false, wert: "dritter" });
  });

  it("echte Praxis: keine Grenze beim Bestand; Einwilligungen werden nicht gesetzt", async () => {
    const id = await praxis(false);
    const r = await m.mitImportSperre(id, (tx) => m.importSpeichern(tx, { practiceId: id, demo: false, neu: zeilen(250, 1) }));
    expect(r).toEqual({ belegt: false, wert: { ok: true, gespeichert: 250 } });
    const einer = await prisma.patient.findFirstOrThrow({ where: { practiceId: id }, select: { contactConsentAt: true, whatsappConsentAt: true } });
    expect(einer.contactConsentAt).toBeNull();
    expect(einer.whatsappConsentAt).toBeNull();
  });

  it("Einzelanlage im Gastzugang: 60 gleichzeitige Anlagen bei Bestand 195 ergeben höchstens 200", async () => {
    const id = await praxis(true);
    await prisma.patient.createMany({ data: zeilen(195, 1).map((p) => ({ practiceId: id, lastName: p.lastName, firstName: p.firstName, insuranceType: "GKV" })) });
    const laeufe = await Promise.all(
      Array.from({ length: 60 }, (_, i) => m.mitPatientenGrenze({ practiceId: id, demo: true }, (tx) => tx.patient.create({ data: { practiceId: id, firstName: `Einzel${i}`, lastName: "Ohnegrenze" }, select: { id: true } }), { versuche: 400, pauseMs: 10 })),
    );
    expect(laeufe.filter((l) => l.ok)).toHaveLength(5);
    expect(laeufe.filter((l) => !l.ok && !l.belegt && l.grund === m.DEMO_GRENZE_EINZELN)).toHaveLength(55);
    expect(await prisma.patient.count({ where: { practiceId: id } })).toBe(DEMO_PATIENTEN_MAX);
    // Ohne neuen Patienten (neu: 0) geht es auch an der Grenze weiter.
    expect(await m.mitPatientenGrenze({ practiceId: id, demo: true, neu: 0 }, async () => "vorhanden")).toEqual({ ok: true, wert: "vorhanden" });
  });

  it("Einzelanlage in einer echten Praxis: keine Grenze beim Bestand", async () => {
    const id = await praxis(false);
    await prisma.patient.createMany({ data: zeilen(205, 1).map((p) => ({ practiceId: id, lastName: p.lastName, firstName: p.firstName, insuranceType: "GKV" })) });
    const r = await m.mitPatientenGrenze({ practiceId: id, demo: false }, (tx) => tx.patient.create({ data: { practiceId: id, firstName: "Neu", lastName: "Echt" }, select: { id: true } }));
    expect(r.ok).toBe(true);
    expect(await prisma.patient.count({ where: { practiceId: id } })).toBe(206);
  });
});
