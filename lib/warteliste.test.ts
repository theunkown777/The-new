import { describe, expect, it } from "vitest";
import { angebotText, passende, passt, tageszeit, wartelisteSchema, wunschText, type WarteEintrag } from "./warteliste";

const e = (id: string, x: Partial<WarteEintrag> = {}): WarteEintrag => ({
  id, patientId: `p-${id}`, vonTag: null, bisTag: null, zeit: null, createdAt: new Date("2026-11-01T08:00:00Z"), erledigtAt: null, ...x,
});
const tag = (t: string) => new Date(`${t}T00:00:00Z`);
// Mittwoch, 18.11.2026, 10:00 Uhr in Berlin (Winterzeit: UTC+1)
const frei = { start: new Date("2026-11-18T09:00:00Z"), patientId: "p-abgesagt" };

describe("Warteliste: passt ein Eintrag zur frei gewordenen Zeit", () => {
  it("ohne Wünsche passt jede Zeit", () => {
    expect(passt(e("a"), frei)).toBe(true);
  });
  it("beachtet das Datumsfenster, beide Grenzen eingeschlossen", () => {
    expect(passt(e("a", { vonTag: tag("2026-11-18") }), frei)).toBe(true);
    expect(passt(e("a", { vonTag: tag("2026-11-19") }), frei)).toBe(false);
    expect(passt(e("a", { bisTag: tag("2026-11-18") }), frei)).toBe(true);
    expect(passt(e("a", { bisTag: tag("2026-11-17") }), frei)).toBe(false);
    expect(passt(e("a", { vonTag: tag("2026-11-10"), bisTag: tag("2026-11-30") }), frei)).toBe(true);
  });
  it("rechnet den Tag in Berliner Zeit (kurz nach Mitternacht ist schon der neue Tag)", () => {
    const spaet = { start: new Date("2026-11-18T23:30:00Z") }; // 19.11., 00:30 Uhr in Berlin
    expect(passt(e("a", { bisTag: tag("2026-11-18") }), spaet)).toBe(false);
    expect(passt(e("a", { vonTag: tag("2026-11-19") }), spaet)).toBe(true);
  });
  it("beachtet die Tageszeit: Vormittag endet um 12 Uhr Ortszeit", () => {
    expect(tageszeit(new Date("2026-11-18T10:59:00Z"))).toBe("VORMITTAG"); // 11:59 Uhr
    expect(tageszeit(new Date("2026-11-18T11:00:00Z"))).toBe("NACHMITTAG"); // 12:00 Uhr
    expect(tageszeit(new Date("2026-07-15T09:59:00Z"))).toBe("VORMITTAG"); // Sommerzeit: 11:59 Uhr
    expect(tageszeit(new Date("2026-07-15T10:00:00Z"))).toBe("NACHMITTAG"); // Sommerzeit: 12:00 Uhr
    expect(passt(e("a", { zeit: "VORMITTAG" }), frei)).toBe(true);
    expect(passt(e("a", { zeit: "NACHMITTAG" }), frei)).toBe(false);
  });
  it("erledigte Einträge passen nie", () => {
    expect(passt(e("a", { erledigtAt: new Date("2026-11-02T00:00:00Z") }), frei)).toBe(false);
  });
  it("wer selbst abgesagt hat, bekommt dieselbe Zeit nicht angeboten", () => {
    expect(passt(e("a", { patientId: "p-abgesagt" }), frei)).toBe(false);
  });
});

describe("Warteliste: Auswahl und Reihenfolge", () => {
  it("wer am längsten wartet, steht vorn; höchstens zwei", () => {
    const liste = [
      e("neu", { createdAt: new Date("2026-11-10T08:00:00Z") }),
      e("alt", { createdAt: new Date("2026-10-01T08:00:00Z") }),
      e("mittel", { createdAt: new Date("2026-10-20T08:00:00Z") }),
    ];
    expect(passende(liste, frei).map((x) => x.id)).toEqual(["alt", "mittel"]);
    expect(passende(liste, frei, 1).map((x) => x.id)).toEqual(["alt"]);
  });
  it("überspringt unpassende und erledigte und rückt die nächsten nach", () => {
    const liste = [
      e("erledigt", { createdAt: new Date("2026-09-01T08:00:00Z"), erledigtAt: new Date("2026-09-05T08:00:00Z") }),
      e("nachmittag", { createdAt: new Date("2026-09-02T08:00:00Z"), zeit: "NACHMITTAG" }),
      e("spaeter", { createdAt: new Date("2026-09-03T08:00:00Z"), vonTag: tag("2026-12-01") }),
      e("b", { createdAt: new Date("2026-10-02T08:00:00Z") }),
      e("a", { createdAt: new Date("2026-10-01T08:00:00Z") }),
    ];
    expect(passende(liste, frei).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("nennt jede Person nur einmal, auch mit zwei Einträgen", () => {
    const liste = [
      e("a1", { patientId: "p1", createdAt: new Date("2026-10-01T08:00:00Z") }),
      e("a2", { patientId: "p1", createdAt: new Date("2026-10-02T08:00:00Z") }),
      e("b", { patientId: "p2", createdAt: new Date("2026-10-03T08:00:00Z") }),
    ];
    expect(passende(liste, frei).map((x) => x.id)).toEqual(["a1", "b"]);
  });
  it("liefert nichts, wenn die Liste leer ist", () => {
    expect(passende([], frei)).toEqual([]);
  });
});

describe("Warteliste: Eingabe und Texte", () => {
  it("nimmt einen vollständigen Eintrag an", () => {
    const p = wartelisteSchema.safeParse({ patientId: "p1", anlass: "Kontrolle", vonTag: "2026-11-20", bisTag: "2026-12-05", zeit: "VORMITTAG", notiz: "nur montags" });
    expect(p.success).toBe(true);
  });
  it("erlaubt leere Wunschfelder", () => {
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "Beratung", vonTag: "", bisTag: null, zeit: "" }).success).toBe(true);
  });
  it("weist falsche Daten, vertauschte Grenzen und fremde Felder ab", () => {
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "Kontrolle", vonTag: "2026-02-31" }).success).toBe(false);
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "Kontrolle", vonTag: "2026-12-05", bisTag: "2026-11-20" }).success).toBe(false);
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "K" }).success).toBe(false);
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "Kontrolle", zeit: "ABENDS" }).success).toBe(false);
    expect(wartelisteSchema.safeParse({ patientId: "p1", anlass: "Kontrolle", practiceId: "fremd" }).success).toBe(false);
  });
  it("beschreibt den Wunsch kurz", () => {
    expect(wunschText({ vonTag: null, bisTag: null, zeit: null })).toBe("jederzeit");
    expect(wunschText({ vonTag: tag("2026-11-20"), bisTag: null, zeit: "VORMITTAG" })).toBe("ab 20.11. · vormittags");
    expect(wunschText({ vonTag: tag("2026-11-20"), bisTag: tag("2026-12-05"), zeit: null })).toBe("20.11. bis 05.12.");
  });
  it("schreibt die Nachricht ohne Anlass, mit Zeit und Link", () => {
    const t = angebotText({ firstName: "Anna", practiceName: "Praxis am Markt", start: frei.start, url: "https://x.test/portal/abc/termin", onlineBuchbar: true });
    expect(t).toContain("Hallo Anna");
    expect(t).toContain("18.11.");
    expect(t).toContain("10:00 Uhr");
    expect(t).toContain("https://x.test/portal/abc/termin");
    expect(t).toContain("buchen");
    const ohne = angebotText({ firstName: "Anna", practiceName: "Praxis am Markt", start: frei.start, url: "https://x.test/portal/abc", onlineBuchbar: false });
    expect(ohne).toContain("melden Sie sich");
    expect(ohne).not.toContain("Wer zuerst bucht");
  });
});
