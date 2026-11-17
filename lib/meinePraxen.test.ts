import { describe, expect, it } from "vitest";
import { MAX_PRAXEN, SPEICHER_SCHLUESSEL, abgelaufen, entfernen, kartenTitel, listeLesen, listeSchreiben, merken, portalPfad, umbenennen, type NeuePraxis } from "@/lib/meinePraxen";
import { darfAufGeraetMerken, praxisGeraet } from "@/lib/meinePraxenSchutz";
import { GEPARKT_COOKIE, UEBERGABE_COOKIE } from "@/lib/empfang";
import { BEREICH_COOKIE } from "@/lib/bereichSchutz";

const jetzt = new Date("2026-11-17T10:00:00Z");
const token = (z: string) => z.repeat(43).slice(0, 43);
const hausarzt: NeuePraxis = { token: token("a"), vorname: "Anna", praxisName: "Hausarztpraxis Dr. Weber", fachKurz: "Hausarztpraxis", gruppe: "arzt", ort: "Münster", gueltigBis: "2027-01-16T10:00:00.000Z" };
const zahnarzt: NeuePraxis = { token: token("b"), vorname: "Anna", praxisName: "Zahnarztpraxis Dr. Sonnenberg", fachKurz: "Zahnarztpraxis", gruppe: "zahn", ort: "Münster", gueltigBis: "2027-01-16T10:00:00.000Z" };

describe("Meine Praxen auf diesem Gerät: Liste", () => {
  it("Schlüssel und Format sind festgelegt", () => {
    expect(SPEICHER_SCHLUESSEL).toBe("sorrida:meine-praxen:v1");
    const r = merken([], hausarzt, jetzt);
    expect(JSON.parse(listeSchreiben(r.praxen))).toEqual({ v: 1, praxen: [{ ...hausarzt, gemerktAm: jetzt.toISOString() }] });
  });

  it("schreibt und liest zwei Praxen als getrennte Einträge in der Reihenfolge des Merkens", () => {
    const eins = merken([], hausarzt, jetzt);
    const zwei = merken(eins.praxen, zahnarzt, jetzt);
    expect([eins.art, zwei.art]).toEqual(["neu", "neu"]);
    const gelesen = listeLesen(listeSchreiben(zwei.praxen));
    expect(gelesen.kaputt).toBe(false);
    expect(gelesen.praxen.map((p) => p.praxisName)).toEqual(["Hausarztpraxis Dr. Weber", "Zahnarztpraxis Dr. Sonnenberg"]);
    expect(gelesen.praxen.map((p) => p.gruppe)).toEqual(["arzt", "zahn"]);
  });

  it("nimmt nur die erlaubten Felder an, beim Merken und beim Lesen", () => {
    const mitMehr = { ...hausarzt, geburtsdatum: "1980-01-01", email: "anna@example.org", practiceId: "prax1" } as NeuePraxis;
    const r = merken([], mitMehr, jetzt);
    expect(Object.keys(r.praxen[0]).sort()).toEqual(["fachKurz", "gemerktAm", "gruppe", "gueltigBis", "ort", "praxisName", "token", "vorname"]);
    const roh = JSON.stringify({ v: 1, praxen: [{ ...hausarzt, gemerktAm: jetzt.toISOString(), geburtsdatum: "1980-01-01", notiz: "x" }] });
    const gelesen = listeLesen(roh).praxen[0] as Record<string, unknown>;
    expect(gelesen.geburtsdatum).toBeUndefined();
    expect(gelesen.notiz).toBeUndefined();
    expect(listeSchreiben(listeLesen(roh).praxen)).not.toMatch(/geburtsdatum|notiz/);
  });

  it("verwirft kaputten Speicher", () => {
    for (const roh of ["{", "null", "[]", "42", JSON.stringify({ v: 2, praxen: [] }), JSON.stringify({ praxen: [] }), JSON.stringify({ v: 1, praxen: "x" })]) {
      expect(listeLesen(roh), roh).toEqual({ praxen: [], kaputt: true });
    }
    expect(listeLesen(null)).toEqual({ praxen: [], kaputt: false });
    expect(listeLesen("")).toEqual({ praxen: [], kaputt: false });
  });

  it("verwirft einzelne kaputte Einträge und behält den Rest", () => {
    const gut = { ...hausarzt, gemerktAm: jetzt.toISOString() };
    const roh = JSON.stringify({
      v: 1,
      praxen: [gut, { ...gut, token: "zu-kurz" }, { ...zahnarzt, gemerktAm: jetzt.toISOString(), gruppe: "werbung" }, { ...gut, token: token("c"), gueltigBis: "morgen" }, "text", gut],
    });
    const r = listeLesen(roh);
    expect(r.kaputt).toBe(true);
    expect(r.praxen).toEqual([gut]);
  });

  it("nimmt nur Portal-Tokens an und öffnet genau ein Portal", () => {
    expect(merken([], { ...hausarzt, token: "../../api/portal" }, jetzt).art).toBe("ungueltig");
    expect(merken([], { ...hausarzt, token: "https://boese.example/x" }, jetzt).art).toBe("ungueltig");
    expect(merken([], { ...hausarzt, praxisName: "  " }, jetzt).art).toBe("ungueltig");
    expect(merken([], { ...hausarzt, gruppe: "x" as never }, jetzt).art).toBe("ungueltig");
    expect(portalPfad(hausarzt.token)).toBe(`/portal/${hausarzt.token}`);
    expect(portalPfad("a/b")).toBeNull();
    expect(portalPfad(`${hausarzt.token},${zahnarzt.token}`)).toBeNull();
  });

  it("derselbe Link oder ein erneuerter Link derselben Praxis ersetzt den Eintrag, der eigene Name bleibt", () => {
    let liste = merken([], hausarzt, jetzt).praxen;
    liste = umbenennen(liste, hausarzt.token, "  Hausärztin   Mama ");
    expect(liste[0].eigenerName).toBe("Hausärztin Mama");
    expect(kartenTitel(liste[0])).toBe("Hausärztin Mama");
    const nochmal = merken(liste, { ...hausarzt, gueltigBis: "2027-02-01T10:00:00.000Z" }, jetzt);
    expect(nochmal.art).toBe("erneuert");
    expect(nochmal.praxen).toHaveLength(1);
    expect(nochmal.praxen[0].gueltigBis).toBe("2027-02-01T10:00:00.000Z");
    const neuerLink = merken(nochmal.praxen, { ...hausarzt, token: token("n") }, jetzt);
    expect(neuerLink.art).toBe("erneuert");
    expect(neuerLink.praxen.map((p) => p.token)).toEqual([token("n")]);
    expect(neuerLink.praxen[0].eigenerName).toBe("Hausärztin Mama");
    // Eine andere Person (Kind) bei derselben Praxis bleibt ein eigener Eintrag.
    expect(merken(neuerLink.praxen, { ...hausarzt, token: token("k"), vorname: "Ben" }, jetzt).praxen).toHaveLength(2);
    // Leerer Name setzt den Praxisnamen wieder ein.
    expect(kartenTitel(umbenennen(neuerLink.praxen, token("n"), "  ")[0])).toBe("Hausarztpraxis Dr. Weber");
  });

  it("entfernt genau einen Eintrag", () => {
    const liste = merken(merken([], hausarzt, jetzt).praxen, zahnarzt, jetzt).praxen;
    expect(entfernen(liste, hausarzt.token).map((p) => p.token)).toEqual([zahnarzt.token]);
    expect(entfernen(liste, "unbekannt")).toEqual(liste);
  });

  it("merkt sich höchstens 20 Praxen", () => {
    let liste = merken([], hausarzt, jetzt).praxen;
    for (let i = 1; i < MAX_PRAXEN; i++) liste = merken(liste, { ...zahnarzt, token: `${"t".repeat(30)}${String(i).padStart(4, "0")}`, vorname: `Kind ${i}` }, jetzt).praxen;
    expect(liste).toHaveLength(MAX_PRAXEN);
    const voll = merken(liste, { ...zahnarzt, token: token("z"), vorname: "Noch eins" }, jetzt);
    expect(voll.art).toBe("voll");
    expect(voll.praxen).toBe(liste);
  });

  it("erkennt abgelaufene Links auf dem Gerät", () => {
    expect(abgelaufen({ gueltigBis: "2026-11-17T09:59:59.000Z" }, jetzt)).toBe(true);
    expect(abgelaufen({ gueltigBis: "2026-11-17T10:00:01.000Z" }, jetzt)).toBe(false);
  });
});

describe("Meine Praxen auf diesem Gerät: nicht auf Geräten der Praxis", () => {
  it("kein Merken bei Praxis-Sitzung, Empfangsmodus, geparkter Sitzung oder entsperrtem Bereich", () => {
    for (const n of ["next-auth.session-token", "__Secure-next-auth.session-token", "__Secure-next-auth.session-token.0", UEBERGABE_COOKIE, GEPARKT_COOKIE, BEREICH_COOKIE]) {
      expect(praxisGeraet([n]), n).toBe(true);
      expect(darfAufGeraetMerken(["etwas", n]), n).toBe(false);
    }
  });
  it("auf dem Gerät des Patienten erlaubt, auch mit dem Cookie der Geburtsdatum-Prüfung", () => {
    expect(darfAufGeraetMerken([])).toBe(true);
    expect(darfAufGeraetMerken(["sorrida_pp_abc123", "next-auth.csrf-token", "sorrida_vorschau"])).toBe(true);
  });
});
