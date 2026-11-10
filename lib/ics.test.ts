import { describe, expect, it } from "vitest";
import { belegungenAusIcs, icsSchreiben, ortszeit } from "./ics";

const von = new Date("2026-11-09T00:00:00Z"), bis = new Date("2026-12-07T00:00:00Z");
const kal = (...ereignisse: string[]) => ["BEGIN:VCALENDAR", "VERSION:2.0", ...ereignisse.flatMap((e) => ["BEGIN:VEVENT", ...e.split("\n"), "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");
const iso = (d: Date) => d.toISOString().slice(0, 16);

describe("Ortszeit", () => {
  it("rechnet deutsche Zeit in UTC um, im Winter und im Sommer", () => {
    expect(ortszeit(2026, 11, 16, 9, 0).toISOString()).toBe("2026-11-16T08:00:00.000Z");
    expect(ortszeit(2026, 7, 16, 9, 0).toISOString()).toBe("2026-07-16T07:00:00.000Z");
  });
});

describe("Kalender einlesen (ICS)", () => {
  it("liest Termine mit Zeitzone, in UTC und ohne Zeitzone (dann deutsche Zeit)", () => {
    const b = belegungenAusIcs(kal(
      "UID:a\nDTSTART;TZID=Europe/Berlin:20261116T090000\nDTEND;TZID=Europe/Berlin:20261116T093000\nSUMMARY:Geheim, wird nicht gelesen",
      "UID:b\nDTSTART:20261116T100000Z\nDTEND:20261116T103000Z",
      "UID:c\nDTSTART:20261116T140000\nDURATION:PT45M",
      "UID:d\nDTSTART;TZID=W. Europe Standard Time:20261117T080000\nDTEND;TZID=W. Europe Standard Time:20261117T083000",
    ), von, bis);
    expect(b.map((x) => `${x.uid} ${iso(x.start)} ${iso(x.ende)}`)).toEqual([
      "a 2026-11-16T08:00 2026-11-16T08:30", "b 2026-11-16T10:00 2026-11-16T10:30", "c 2026-11-16T13:00 2026-11-16T13:45", "d 2026-11-17T07:00 2026-11-17T07:30",
    ]);
    expect(JSON.stringify(b)).not.toContain("Geheim");
  });
  it("ganztägige Einträge gelten für den ganzen Tag in deutscher Zeit", () => {
    const [x] = belegungenAusIcs(kal("UID:u\nDTSTART;VALUE=DATE:20261120\nDTEND;VALUE=DATE:20261123\nSUMMARY:Urlaub"), von, bis);
    expect(x.ganztag).toBe(true);
    expect(iso(x.start)).toBe("2026-11-19T23:00");
    expect(iso(x.ende)).toBe("2026-11-22T23:00");
  });
  it("abgesagte und als frei markierte Termine zählen nicht", () => {
    expect(belegungenAusIcs(kal("UID:x\nDTSTART:20261116T100000Z\nDTEND:20261116T103000Z\nSTATUS:CANCELLED", "UID:y\nDTSTART:20261116T110000Z\nDTEND:20261116T113000Z\nTRANSP:TRANSPARENT"), von, bis)).toEqual([]);
  });
  it("löst wöchentliche Serien auf, mit Wochentagen, Ausnahmen und Ende", () => {
    const b = belegungenAusIcs(kal("UID:s\nDTSTART;TZID=Europe/Berlin:20261102T120000\nDTEND;TZID=Europe/Berlin:20261102T130000\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261125T235959Z\nEXDATE;TZID=Europe/Berlin:20261118T120000"), von, bis);
    expect(b.map((x) => iso(x.start))).toEqual(["2026-11-09T11:00", "2026-11-11T11:00", "2026-11-16T11:00", "2026-11-23T11:00", "2026-11-25T11:00"]);
  });
  it("Serien behalten ihre Uhrzeit über die Zeitumstellung", () => {
    const b = belegungenAusIcs(kal("UID:z\nDTSTART;TZID=Europe/Berlin:20261019T090000\nDTEND;TZID=Europe/Berlin:20261019T100000\nRRULE:FREQ=WEEKLY;COUNT=3"), new Date("2026-10-01T00:00:00Z"), new Date("2026-12-01T00:00:00Z"));
    expect(b.map((x) => iso(x.start))).toEqual(["2026-10-19T07:00", "2026-10-26T08:00", "2026-11-02T08:00"]); // 9 Uhr bleibt 9 Uhr
  });
  it("tägliche, 14-tägige und monatliche Serien; COUNT zählt ab dem ersten Termin", () => {
    const t = belegungenAusIcs(kal("UID:t\nDTSTART:20261110T080000Z\nDTEND:20261110T083000Z\nRRULE:FREQ=DAILY;COUNT=3"), von, bis);
    expect(t.map((x) => iso(x.start).slice(0, 10))).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
    const z = belegungenAusIcs(kal("UID:w\nDTSTART:20261028T080000Z\nDTEND:20261028T083000Z\nRRULE:FREQ=WEEKLY;INTERVAL=2"), von, bis);
    expect(z.map((x) => iso(x.start).slice(0, 10))).toEqual(["2026-11-11", "2026-11-25"]);
    const m = belegungenAusIcs(kal("UID:m\nDTSTART:20260815T080000Z\nDTEND:20260815T083000Z\nRRULE:FREQ=MONTHLY"), von, bis);
    expect(m.map((x) => iso(x.start).slice(0, 10))).toEqual(["2026-11-15"]);
  });
  it("ein einzeln verschobenes Vorkommen ersetzt das Original der Serie", () => {
    const b = belegungenAusIcs(kal(
      "UID:v\nDTSTART:20261109T090000Z\nDTEND:20261109T100000Z\nRRULE:FREQ=WEEKLY;COUNT=2",
      "UID:v\nRECURRENCE-ID:20261116T090000Z\nDTSTART:20261116T140000Z\nDTEND:20261116T150000Z",
    ), von, bis);
    expect(b.map((x) => iso(x.start))).toEqual(["2026-11-09T09:00", "2026-11-16T14:00"]);
  });
  it("verträgt gefaltete Zeilen, Erinnerungen im Termin und Unsinn", () => {
    const text = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:f\r\nDTSTART;TZID=Europe/Ber\r\n lin:20261116T090000\r\nDTEND;TZID=Europe/Berlin:20261116T100000\r\nBEGIN:VALARM\r\nTRIGGER:-PT15M\r\nDURATION:PT5M\r\nEND:VALARM\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:kaputt\r\nEND:VEVENT\r\nEND:VCALENDAR";
    const b = belegungenAusIcs(text, von, bis);
    expect(b).toHaveLength(1);
    expect(iso(b[0].ende)).toBe("2026-11-16T09:00");
    expect(belegungenAusIcs("kein Kalender", von, bis)).toEqual([]);
  });
  it("liefert nur Termine im gefragten Zeitraum", () => {
    expect(belegungenAusIcs(kal("UID:alt\nDTSTART:20260101T100000Z\nDTEND:20260101T103000Z", "UID:spaet\nDTSTART:20270101T100000Z\nDTEND:20270101T103000Z"), von, bis)).toEqual([]);
  });
});

describe("Kalender ausgeben (ICS)", () => {
  it("schreibt Termine ohne Patientennamen und lässt sich wieder einlesen", () => {
    const ics = icsSchreiben("Sorrida: Praxis am Markt", [
      { id: "t1", start: new Date("2026-11-16T08:00:00Z"), minutes: 20, titel: "Sorrida-Termin (online gebucht)", ort: "Hauptpraxis, Markt 1" },
      { id: "t2", start: new Date("2026-11-17T08:00:00Z"), minutes: 30, titel: "Sorrida-Termin", abgesagt: true },
    ], new Date("2026-11-10T10:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261116T080000Z");
    expect(ics).toContain("LOCATION:Hauptpraxis\\, Markt 1");
    expect(ics).toContain("STATUS:CANCELLED");
    const b = belegungenAusIcs(ics, von, bis);
    expect(b.map((x) => `${x.uid} ${iso(x.start)} ${iso(x.ende)}`)).toEqual(["t1@sorrida 2026-11-16T08:00 2026-11-16T08:20"]);
  });
});
