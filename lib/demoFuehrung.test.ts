import { describe, expect, it } from "vitest";
import { FUEHRUNG_LEER, FUEHRUNG_SCHRITTE, fuehrungAktuell, fuehrungErledigt, fuehrungFertig, fuehrungLesen, fuehrungNachSeite } from "./demoFuehrung";

describe("Führung im Gastzugang", () => {
  it("hat drei Schritte in fester Reihenfolge", () => {
    expect(FUEHRUNG_SCHRITTE.map((s) => `${s.nr} ${s.text}`)).toEqual(["1 Vorschlag anlegen", "2 Patientenansicht öffnen", "3 Rückmeldung im Eingang sehen"]);
    expect(FUEHRUNG_SCHRITTE[0].href).toBe("/proposals/new");
    expect(FUEHRUNG_SCHRITTE[2].href).toBe("/eingang");
  });

  it("liest gespeicherte Stände robust", () => {
    expect(fuehrungLesen(null)).toEqual(FUEHRUNG_LEER);
    expect(fuehrungLesen("kein json")).toEqual(FUEHRUNG_LEER);
    expect(fuehrungLesen("null")).toEqual(FUEHRUNG_LEER);
    expect(fuehrungLesen(JSON.stringify({ erledigt: [3, 1, 7, "x"], warNeu: true, zu: "ja" }))).toEqual({ erledigt: [1, 3], warNeu: true, zu: false });
  });

  it("Schritt 1 ist geschafft, wenn nach „Vorschlag anlegen“ ein Vorschlag offen ist", () => {
    let z = fuehrungNachSeite(FUEHRUNG_LEER, "/proposals/new");
    expect(z.warNeu).toBe(true);
    expect(z.erledigt).toEqual([]);
    z = fuehrungNachSeite(z, "/proposals/cabc123");
    expect(z.erledigt).toEqual([1]);
  });

  it("ein Vorschlag ohne den Weg über „neu“ zählt nicht als Schritt 1", () => {
    expect(fuehrungNachSeite(FUEHRUNG_LEER, "/proposals/cabc123").erledigt).toEqual([]);
    expect(fuehrungNachSeite({ ...FUEHRUNG_LEER, warNeu: true }, "/proposals/nachfassen").erledigt).toEqual([]);
    expect(fuehrungNachSeite({ ...FUEHRUNG_LEER, warNeu: true }, "/proposals").erledigt).toEqual([]);
  });

  it("der Eingang schließt Schritt 3 ab, der Klick Schritt 2", () => {
    expect(fuehrungNachSeite(FUEHRUNG_LEER, "/eingang").erledigt).toEqual([3]);
    expect(fuehrungErledigt(FUEHRUNG_LEER, 2).erledigt).toEqual([2]);
    expect(fuehrungErledigt({ ...FUEHRUNG_LEER, erledigt: [2] }, 2).erledigt).toEqual([2]);
  });

  it("der aktuelle Schritt ergibt sich aus der Seite, sonst ist es der erste offene", () => {
    expect(fuehrungAktuell(FUEHRUNG_LEER, "/dashboard")).toBe(1);
    expect(fuehrungAktuell({ ...FUEHRUNG_LEER, erledigt: [1] }, "/dashboard")).toBe(2);
    expect(fuehrungAktuell({ ...FUEHRUNG_LEER, erledigt: [1, 2] }, "/dashboard")).toBe(3);
    expect(fuehrungAktuell({ ...FUEHRUNG_LEER, erledigt: [2] }, "/proposals/new")).toBe(1);
    expect(fuehrungAktuell({ ...FUEHRUNG_LEER, erledigt: [1], warNeu: true }, "/proposals/cabc123")).toBe(2);
    // Im Eingang ist Schritt 3 schon erledigt: gezeigt wird, was noch offen ist.
    expect(fuehrungAktuell({ ...FUEHRUNG_LEER, erledigt: [3] }, "/eingang")).toBe(1);
  });

  it("ist fertig, wenn alle drei Schritte erledigt sind", () => {
    expect(fuehrungFertig({ ...FUEHRUNG_LEER, erledigt: [1, 2] })).toBe(false);
    const fertig = { ...FUEHRUNG_LEER, erledigt: [1, 2, 3] as (1 | 2 | 3)[] };
    expect(fuehrungFertig(fertig)).toBe(true);
    expect(fuehrungAktuell(fertig, "/dashboard")).toBeNull();
  });
});
