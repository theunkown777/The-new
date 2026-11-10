import { describe, expect, it } from "vitest";
import { kalenderUrlPruefen } from "./kalenderSync";

describe("Kalender-Adresse prüfen", () => {
  const fehler = (u: string) => "fehler" in kalenderUrlPruefen(u);
  it("nimmt nur öffentliche https-Adressen an; webcal wird zu https", () => {
    expect(kalenderUrlPruefen("webcal://p01-caldav.icloud.com/published/2/abc")).toEqual({ url: "https://p01-caldav.icloud.com/published/2/abc" });
    expect(kalenderUrlPruefen("  https://calendar.google.com/calendar/ical/x/basic.ics ")).toEqual({ url: "https://calendar.google.com/calendar/ical/x/basic.ics" });
    expect(fehler("http://example.com/a.ics")).toBe(true);
    expect(fehler("ftp://example.com/a.ics")).toBe(true);
    expect(fehler("kein link")).toBe(true);
  });
  it("lehnt Adressen im Praxisnetz und interne Adressen ab (Schutz des Servers)", () => {
    for (const u of ["https://localhost/a.ics", "https://127.0.0.1/a.ics", "https://10.0.0.5/k.ics", "https://192.168.178.20/k.ics", "https://172.20.1.1/k.ics", "https://169.254.169.254/latest/meta-data", "https://[::1]/k.ics", "https://praxis.local/k.ics", "https://server/k.ics", "https://nas.intranet/k.ics", "https://user:pw@example.com/a.ics"])
      expect(fehler(u), u).toBe(true);
  });
});
