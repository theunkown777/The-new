import { describe, expect, it } from "vitest";
import { auslastung, ausfallquote, tagesGrenzen, bestaetigungText } from "./termine";
describe("Termine", () => {
  it("rechnet Auslastung je Standort, abgesagte zählen nicht", () => {
    const t = [
      { minutes: 60, status: "GEPLANT", locationId: "a" },
      { minutes: 60, status: "ABGESAGT", locationId: "a" },
      { minutes: 120, status: "BESTAETIGT", locationId: "b" },
    ];
    const s = [{ id: "a", rooms: 2, minutesPerDay: 300 }, { id: "b", rooms: 1, minutesPerDay: 240 }];
    expect(auslastung(t, s)).toEqual({ prozent: 21, gebucht: 180, kapazitaet: 840, angenommen: false });
    expect(auslastung(t, s, "b").prozent).toBe(50);
    expect(auslastung(t, []).angenommen).toBe(true);
  });
  it("Ausfallquote erst ab fünf Fällen", () => {
    expect(ausfallquote([{ status: "ERSCHIENEN" }, { status: "NICHT_ERSCHIENEN" }])).toBeNull();
    expect(ausfallquote([...Array(4)].map(() => ({ status: "ERSCHIENEN" })).concat([{ status: "NICHT_ERSCHIENEN" }]))).toBe(20);
  });
  it("Tagesgrenzen in deutscher Zeit (Winter und Sommer)", () => {
    expect(tagesGrenzen("2026-11-20").von.toISOString()).toBe("2026-11-19T23:00:00.000Z");
    expect(tagesGrenzen("2026-07-01").von.toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });
  it("Bestätigungstext nennt Zeit, Ort und Absagehinweis", () => {
    const t = bestaetigungText({ firstName: "Anna", practiceName: "Praxis X", start: new Date("2026-11-20T08:30:00Z"), ort: "Zweigpraxis" });
    expect(t).toContain("09:30");
    expect(t).toContain("(Zweigpraxis)");
    expect(t).toContain("rechtzeitig ab");
  });
  it("Bestätigungstext nennt den Anlass nicht, auch wenn ihn jemand mitgibt", () => {
    // Der Anlass ist ein Freitext der Praxis („Kontrolle nach Wurzelbehandlung“) und gehört nicht in eine E-Mail.
    const mitAnlass = { firstName: "Anna", practiceName: "Praxis X", start: new Date("2026-11-20T08:30:00Z"), ort: null, reason: "Kontrolle nach Wurzelbehandlung" };
    const t = bestaetigungText(mitAnlass);
    expect(t).not.toContain("Wurzelbehandlung");
    expect(t).not.toContain("Kontrolle");
    expect(t).toBe("Hallo Anna, Ihr Termin bei Praxis X ist eingetragen: Freitag, 20.11., 09:30 Uhr. Falls Sie nicht kommen können, sagen Sie bitte rechtzeitig ab, dann kann jemand anderes nachrücken.");
  });
});

describe("Erinnerungstext je Fach", () => {
  it("Versichertenkarte nur, wo sie gebraucht wird", async () => {
    const { erinnerungText } = await import("./termine");
    const basis = { firstName: "Anna", practiceName: "X", start: new Date("2026-11-20T09:00:00Z"), ort: null };
    expect(erinnerungText({ ...basis, fach: "hausarzt" })).toContain("Versichertenkarte");
    expect(erinnerungText({ ...basis, fach: "optik" })).not.toContain("Versichertenkarte");
    expect(erinnerungText({ ...basis, fach: "pflege" })).not.toContain("Versichertenkarte");
  });
});
