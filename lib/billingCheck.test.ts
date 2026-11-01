import { describe, expect, it } from "vitest";
import { billingCheck, type CatalogItem } from "./billingCheck";
const cat = (id: string, x: Partial<CatalogItem> = {}): CatalogItem => ({
  id, code: id.toUpperCase(), title: "Pos " + id, faktorMin: 1, faktorMax: 3.5, regelhoechstfaktor: 2.3, begruendungspflichtAbFaktor: null,
  ausschlussMit: null, frequenzlimitAnzahl: null, frequenzlimitZeitraumTage: null, ...x,
});
const now = new Date("2026-11-20T12:00:00Z");
const catalog = new Map([
  ["a", cat("a")], ["b", cat("b")], ["c", cat("c", { ausschlussMit: "d" })], ["d", cat("d")],
  ["f", cat("f", { frequenzlimitAnzahl: 1, frequenzlimitZeitraumTage: 365 })],
]);
const en = (id: string, x = {}) => ({ catalogItemId: id, performed: true, faktor: null, begruendung: null, quantity: 1, ...x });
const base = { now, appointments: [], reports: [], proposals: [], catalog, patientName: new Map([["p", "Anna Müller"]]) };

describe("Abrechnungsprüfung", () => {
  it("findet Termin ohne Dokumentation und Vorschlag ohne Rechnung", () => {
    const r = billingCheck({
      ...base,
      appointments: [{ id: "t", patientId: "p", start: new Date("2026-11-18T09:00:00Z"), status: "ERSCHIENEN", reason: "Füllung" }],
      proposals: [{ id: "v", patientId: "p", status: "ANGENOMMEN", eigenanteilCent: 45000, updatedAt: new Date("2026-11-10"), invoiced: false }],
    });
    expect(r.map((x) => x.art)).toEqual(["ohne_doku", "ohne_rechnung"]);
    expect(r[1].betragCent).toBe(45000);
  });
  it("Termin mit Bericht am selben Tag ist in Ordnung", () => {
    const r = billingCheck({
      ...base,
      appointments: [{ id: "t", patientId: "p", start: new Date("2026-11-18T09:00:00Z"), status: "ERSCHIENEN", reason: "Füllung" }],
      reports: [{ id: "r", patientId: "p", createdAt: new Date("2026-11-18T15:00:00Z"), treatmentDate: null, entries: [en("b")] }],
    });
    expect(r).toEqual([]);
  });
  it("prüft Faktor, Begleitleistung, Ausschluss und Häufigkeit", () => {
    const r = billingCheck({
      ...base,
      reports: [
        { id: "r1", patientId: "p", createdAt: new Date("2026-05-01"), treatmentDate: null, entries: [en("f")] },
        { id: "r2", patientId: "p", createdAt: new Date("2026-11-01"), treatmentDate: null, entries: [en("a", { faktor: 3.0 }), en("c"), en("d"), en("f")] },
      ],
    });
    expect(r.map((x) => x.art).sort()).toEqual(["ausschluss", "faktor", "frequenz"]);
  });
});
