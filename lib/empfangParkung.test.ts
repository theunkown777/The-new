// Empfangs-PIN auf dem Server: Die geparkte Sitzung gilt nur, solange der Server sie kennt, und
// gleichzeitige Anfragen kommen nicht über die Grenze von fünf Fehlversuchen. Braucht die Datenbank.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { PIN_MAX_FEHLVERSUCHE, PIN_MAX_SPERREN, PIN_SPERRE_MINUTEN } from "./empfang";
import { parkKennungHash, parkKennungNeu } from "./empfangParkung";

describe("Kennung der Parkung", () => {
  it("ist zufällig, lang genug und steht nur als Hashwert in der Datenbank", () => {
    const a = parkKennungNeu(), b = parkKennungNeu();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(parkKennungHash(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(parkKennungHash(a)).not.toContain(a);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("Empfangs-PIN: Parkung und Zähler in der Datenbank", () => {
  type Modul = typeof import("./empfangParkung");
  let m: Modul;
  let prisma: (typeof import("@/lib/prisma"))["prisma"];
  const praxen: string[] = [];
  const PIN = "2580";

  async function praxis() {
    const p = await prisma.practice.create({ data: { name: `Parkung ${Date.now()}`, accountHolder: "Test", empfangPinHash: bcrypt.hashSync(PIN, 4) }, select: { id: true } });
    praxen.push(p.id);
    return p.id;
  }
  const stand = (id: string) => prisma.practice.findUniqueOrThrow({ where: { id }, select: { empfangPinFehlversuche: true, empfangPinSperren: true, empfangPinGesperrtBis: true } });

  beforeAll(async () => {
    m = await import("./empfangParkung");
    prisma = (await import("@/lib/prisma")).prisma;
  });
  afterAll(async () => {
    if (praxen.length) await prisma.practice.deleteMany({ where: { id: { in: praxen } } });
  });

  it("richtige PIN: einmal ok, danach ist derselbe Cookie-Wert wertlos", async () => {
    const id = await praxis();
    const kennung = await m.parkungAnlegen(id);
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: PIN })).art).toBe("ok");
    expect(await prisma.empfangParkung.count({ where: { practiceId: id } })).toBe(0);
    // Kopierter Wert, richtige PIN: Der Server kennt die Parkung nicht mehr und prüft die PIN gar nicht.
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: PIN })).art).toBe("keine-sitzung");
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: "0000" })).art).toBe("keine-sitzung");
    expect((await stand(id)).empfangPinFehlversuche).toBe(0);
  });

  it("ohne Kennung, mit fremder Kennung oder für eine andere Praxis gibt es keine Sitzung", async () => {
    const a = await praxis(), b = await praxis();
    const kennungA = await m.parkungAnlegen(a);
    expect((await m.pinEntsperren({ practiceId: a, kennung: null, pin: PIN })).art).toBe("keine-sitzung");
    expect((await m.pinEntsperren({ practiceId: a, kennung: m.parkKennungNeu(), pin: PIN })).art).toBe("keine-sitzung");
    expect((await m.pinEntsperren({ practiceId: b, kennung: kennungA, pin: PIN })).art).toBe("keine-sitzung");
    expect(await prisma.empfangParkung.count({ where: { practiceId: a } })).toBe(1);
  });

  it("abgelaufene Parkung gilt nicht", async () => {
    const id = await praxis();
    const kennung = await m.parkungAnlegen(id, Date.now() - 13 * 3600e3);
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: PIN })).art).toBe("keine-sitzung");
    expect(await m.parkungenAufraeumen()).toBeGreaterThanOrEqual(1);
  });

  it("zwölf gleichzeitige falsche PINs: genau vier zählen als falsch, die fünfte sperrt, der Rest wird nicht geprüft", async () => {
    const id = await praxis();
    const kennung = await m.parkungAnlegen(id);
    const pins = Array.from({ length: 12 }, (_, i) => String(1000 + i * 7));
    const erg = await Promise.all(pins.map((pin) => m.pinEntsperren({ practiceId: id, kennung, pin })));
    const arten = erg.map((e) => e.art);
    expect(arten.filter((a) => a === "falsch").length).toBe(PIN_MAX_FEHLVERSUCHE - 1);
    expect(arten.filter((a) => a === "gesperrt").length).toBe(12 - (PIN_MAX_FEHLVERSUCHE - 1));
    expect(erg.filter((e) => e.art === "gesperrt" && e.neu).length).toBe(1);
    // Jeder Reststand kommt genau einmal vor: 4, 3, 2, 1.
    expect(erg.flatMap((e) => (e.art === "falsch" ? [e.rest] : [])).sort()).toEqual([1, 2, 3, 4]);
    const s = await stand(id);
    expect(s.empfangPinFehlversuche).toBe(0);
    expect(s.empfangPinSperren).toBe(1);
    // Während der Sperre zählt auch die richtige PIN nicht.
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: PIN })).art).toBe("gesperrt");
  }, 30_000);

  it("dritte Sperre in Folge: alle Parkungen der Praxis sind weg, auch mit richtiger PIN geht nichts mehr", async () => {
    const id = await praxis();
    const kennung = await m.parkungAnlegen(id);
    const zweitesTablet = await m.parkungAnlegen(id);
    let zeit = Date.now();
    let letzte: Awaited<ReturnType<Modul["pinEntsperren"]>> | null = null;
    for (let sperre = 1; sperre <= PIN_MAX_SPERREN; sperre++) {
      for (let i = 0; i < PIN_MAX_FEHLVERSUCHE; i++) letzte = await m.pinEntsperren({ practiceId: id, kennung, pin: "0001" }, new Date(zeit));
      expect(letzte?.art).toBe("gesperrt");
      zeit += (PIN_SPERRE_MINUTEN + 1) * 60_000;
    }
    expect(letzte && letzte.art === "gesperrt" && letzte.verwerfen).toBe(true);
    expect(await prisma.empfangParkung.count({ where: { practiceId: id } })).toBe(0);
    // Fünf Minuten später, derselbe (kopierte) Cookie-Wert: weder falsche noch richtige PIN werden angenommen.
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: "0002" }, new Date(zeit))).art).toBe("keine-sitzung");
    expect((await m.pinEntsperren({ practiceId: id, kennung, pin: PIN }, new Date(zeit))).art).toBe("keine-sitzung");
    expect((await m.pinEntsperren({ practiceId: id, kennung: zweitesTablet, pin: PIN }, new Date(zeit))).art).toBe("keine-sitzung");
    // Der Zähler der Sperren bleibt stehen, bis nach einer neuen Übergabe die richtige PIN kommt.
    expect((await stand(id)).empfangPinSperren).toBe(PIN_MAX_SPERREN);
    const neu = await m.parkungAnlegen(id);
    expect((await m.pinEntsperren({ practiceId: id, kennung: neu, pin: PIN }, new Date(zeit))).art).toBe("ok");
    expect((await stand(id)).empfangPinSperren).toBe(0);
  }, 30_000);
});
