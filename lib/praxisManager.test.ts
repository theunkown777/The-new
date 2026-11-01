import { describe, expect, it } from "vitest";
import { praxisManager, themaFuerFrage, type Snapshot } from "./praxisManager";

const now = new Date("2026-11-20T10:00:00");
const d = (s: string) => new Date(s);
const base: Snapshot = { now, invoices: [], reports: [], proposals: [], anamnesis: [], recallDue: 0, recallNeverReminded: 0 };
const get = (s: Snapshot, t: string) => praxisManager(s).find((a) => a.thema === t)!;

describe("Praxismanager", () => {
  it("meldet ruhige Lage ohne erfundene Zahlen", () => {
    const a = praxisManager(base);
    expect(a.map((x) => x.stufe)).toEqual(["ok", "ok", "ok", "ok", "ok", "ok"]);
    expect(get(base, "termine").kurz).toMatch(/kennt Sorrida nicht/);
  });

  it("findet überfällige Rechnungen und schlägt Erinnerungen vor, ohne zu versenden", () => {
    const s = {
      ...base,
      invoices: [
        { id: "1", status: "OFFEN", dueDate: d("2026-10-01"), amountCent: 50000, paidAt: null, reminderLevel: 1, remindedAt: d("2026-10-05") },
        { id: "2", status: "OFFEN", dueDate: d("2026-12-01"), amountCent: 10000, paidAt: null, reminderLevel: 0, remindedAt: null },
        { id: "3", status: "GEMELDET", dueDate: d("2026-11-25"), amountCent: 2000, paidAt: null, reminderLevel: 0, remindedAt: null },
      ],
    };
    const a = get(s, "rechnungen");
    expect(a.kurz).toBe("500,00 € sind überfällig.");
    expect(a.stufe).toBe("dringend");
    expect(a.punkte[0]).toContain("3 Rechnungen offen, zusammen 620,00 €");
    expect(a.vorschlag?.href).toBe("/zahlungen?f=ueberfaellig");
    expect(a.vorschlag?.text).toMatch(/vor dem Versand/);
  });

  it("vergleicht den Umsatz mit dem gleichen Zeitraum im Vormonat", () => {
    const paid = (at: string, c: number) => ({ id: at, status: "BEZAHLT", dueDate: d(at), amountCent: c, paidAt: d(at), reminderLevel: 0, remindedAt: null });
    const s = { ...base, invoices: [paid("2026-11-05", 20000), paid("2026-10-10", 10000), paid("2026-10-25", 99999)] };
    expect(get(s, "umsatz").kurz).toBe("Diesen Monat eingegangen: 200,00 €, +100 % zum gleichen Zeitraum im Vormonat.");
  });

  it("zählt Engpässe: liegende Vorschläge, offene Anamnese, alte Entwürfe", () => {
    const s = {
      ...base,
      proposals: [{ id: "p", status: "BESPROCHEN", createdAt: d("2026-10-01"), patientViewedAt: null, eigenanteilCent: 0 }],
      anamnesis: [{ createdAt: d("2026-11-15"), submittedAt: null, expiresAt: d("2026-12-15") }],
      reports: [{ id: "r", status: "ENTWURF", createdAt: d("2026-11-10") }],
    };
    const a = get(s, "engpaesse");
    expect(a.punkte).toHaveLength(3);
    expect(a.stufe).toBe("dringend");
    expect(a.punkte[0]).toContain("nie geöffnet");
    expect(get(s, "berichte").vorschlag?.href).toBe("/reports?status=ENTWURF");
  });

  it("ordnet freie Fragen nachvollziehbar zu", () => {
    expect(themaFuerFrage("Welche Rechnungen sind noch offen?")).toBe("rechnungen");
    expect(themaFuerFrage("Wie war der Umsatz im Vormonat?")).toBe("umsatz");
    expect(themaFuerFrage("Wie voll sind die Termine morgen?")).toBe("termine");
    expect(themaFuerFrage("Welche Berichte muss ich freigeben?")).toBe("berichte");
    expect(themaFuerFrage("Wo hakt es?")).toBe("engpaesse");
    expect(themaFuerFrage("Wie wird das Wetter?")).toBeNull();
  });
});
