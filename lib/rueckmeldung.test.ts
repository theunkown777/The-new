import { describe, expect, it } from "vitest";
import { auswertung, fensterAb, gepruefterGoogleLink, googleProfilUrl, offenerTermin, rueckmeldungSchema } from "@/lib/rueckmeldung";

const now = new Date("2026-11-15T10:00:00Z");
const vor = (tage: number) => new Date(now.getTime() - tage * 864e5);

describe("Eine Frage nach dem Termin", () => {
  it("fragt nur nach erschienenen Terminen der letzten 14 Tage ohne Antwort", () => {
    expect(fensterAb(now)).toEqual(vor(14));
    const t = (status: string, tage: number, rueckmeldung: unknown = null) => ({ id: `${status}${tage}`, status, start: vor(tage), rueckmeldung });
    expect(offenerTermin([t("ERSCHIENEN", 3)], now)?.id).toBe("ERSCHIENEN3");
    expect(offenerTermin([t("ERSCHIENEN", 15)], now)).toBeNull();
    expect(offenerTermin([t("GEPLANT", 2), t("ABGESAGT", 1), t("NICHT_ERSCHIENEN", 1)], now)).toBeNull();
    expect(offenerTermin([t("ERSCHIENEN", 3, { id: "r" })], now)).toBeNull();
    expect(offenerTermin([t("ERSCHIENEN", -1)], now)).toBeNull();
    // Der jüngste offene Termin zuerst.
    expect(offenerTermin([t("ERSCHIENEN", 9), t("ERSCHIENEN", 2), t("ERSCHIENEN", 1, { id: "r" })], now)?.id).toBe("ERSCHIENEN2");
  });

  it("nimmt fünf Stufen und höchstens 300 Zeichen", () => {
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 5 }).success).toBe(true);
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 1, text: "x".repeat(300) }).success).toBe(true);
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 0 }).success).toBe(false);
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 6 }).success).toBe(false);
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 3.5 }).success).toBe(false);
    expect(rueckmeldungSchema.safeParse({ appointmentId: "a", stufe: 3, text: "x".repeat(301) }).success).toBe(false);
  });

  it("zeigt der Praxis erst ab fünf Antworten mehr als die Anzahl", () => {
    const vier = [5, 4, 1, 2].map((stufe, i) => ({ stufe, text: "geheim", createdAt: vor(i + 1) }));
    const r = auswertung(vier, now);
    expect(r).toEqual({ genug: false, anzahl: 4, mindestens: 5, tage: 90 });
    expect(JSON.stringify(r)).not.toContain("geheim");
  });

  it("rechnet Durchschnitt und Verteilung der letzten 90 Tage und gibt Texte ohne Namen und ohne Stufe", () => {
    const antworten = [
      { stufe: 5, text: "Sehr freundlich.", createdAt: vor(1) },
      { stufe: 4, text: null, createdAt: vor(2) },
      { stufe: 4, text: "  ", createdAt: vor(3) },
      { stufe: 2, text: "Lange gewartet.", createdAt: vor(10) },
      { stufe: 1, text: null, createdAt: vor(80) },
      { stufe: 5, text: "Zu alt.", createdAt: vor(120) },
    ];
    const r = auswertung(antworten, now);
    if (!r.genug) throw new Error("erwartet: genug Antworten");
    expect(r.anzahl).toBe(5);
    expect(r.durchschnitt).toBe(3.2);
    expect(r.verteilung).toEqual([1, 1, 0, 2, 1]);
    expect(r.texte).toEqual([{ datum: "14.11.2026", text: "Sehr freundlich." }, { datum: "05.11.2026", text: "Lange gewartet." }]);
    expect(Object.keys(r.texte[0]).sort()).toEqual(["datum", "text"]);
  });

  it("lässt als Bewertungs-Link nur https auf google.com, g.page und maps.app.goo.gl zu", () => {
    for (const gut of ["https://g.page/r/abc123/review", "https://maps.app.goo.gl/AbC123", "https://www.google.com/maps/place/Praxis", "https://google.com/maps?cid=123", "https://search.google.com/local/writereview?placeid=abc"])
      expect(googleProfilUrl(gut), gut).toEqual({ ok: true, url: new URL(gut).toString() });
    expect(googleProfilUrl("")).toEqual({ ok: true, url: null });
    expect(googleProfilUrl("   ")).toEqual({ ok: true, url: null });
    expect(googleProfilUrl(null)).toEqual({ ok: true, url: null });
    for (const schlecht of [
      "http://g.page/r/abc",
      "https://google.de/maps",
      "https://google.com.evil.de/maps",
      "https://evilgoogle.com/maps",
      "https://g.page.evil.de/",
      "https://x.maps.app.goo.gl/abc",
      "https://goo.gl/maps/abc",
      "https://user:pass@google.com/",
      "https://google.com:8443/",
      "https://google.com/ maps",
      "javascript:alert(1)",
      "//google.com/maps",
      "https://google.com/\"><script>",
      "google.com/maps",
      `https://google.com/${"a".repeat(300)}`,
      42,
    ])
      expect(googleProfilUrl(schlecht), String(schlecht)).toEqual({ ok: false });
    expect(gepruefterGoogleLink("https://g.page/r/abc")).toBe("https://g.page/r/abc");
    expect(gepruefterGoogleLink("https://evil.de/")).toBeNull();
    expect(gepruefterGoogleLink(null)).toBeNull();
  });
});
