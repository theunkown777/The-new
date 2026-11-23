import { describe, expect, it } from "vitest";
import { KURZ_ARTEN, ORTE, ORTE_STAND, ORT_NACH, ZEICHEN, zeichenFuer, alteOrtNamen, kurzArt, kurzcheckLesen, kurzcheckSchema, kurzcheckText, nachbarZaehne, ortGueltig, ortName, orteFuer, staerkeWort } from "./kurzcheck";
import { KOPF_PUNKTE } from "../components/kurzcheck/figurPunkte";
import { FACH_MODELLE } from "./modelle/fach";

describe("Kurz-Fragebogen", () => {
  it("stellt höchstens fünf Fragen (Wo, Wie stark, Seit wann, Wie zeigt es sich, Was ist wichtig)", () => {
    const felder = Object.keys(kurzcheckSchema("zahn").parse({ keine: true, wichtig: "kontrolle" })).filter((k) => !["keine", "art", "notiz"].includes(k));
    expect(felder.sort()).toEqual(["orte", "seit", "staerke", "wichtig", "zeichen"]);
  });
  it("wählt die Abfrage aus dem Hauptmodell des Fachs, für jedes Fach in FACH_MODELLE", () => {
    const erwartet: Record<string, string> = { zahn: "zahn", augen: "auge", optik: "auge", hno: "hno", hoerakustik: "hno", logo: "hno", haut: "haut", aesthetik: "haut" };
    for (const fach of Object.keys(FACH_MODELLE)) expect(kurzArt(fach), fach).toBe(erwartet[fach] ?? "koerper");
    expect(kurzArt("kinder")).toBe("koerper");
    expect(kurzArt("ortho")).toBe("koerper");
  });
  it("gibt unbekannten oder fehlenden Fächern den Körper, nie die Zähne", () => {
    for (const f of [null, undefined, "", "unbekannt", "toString", "__proto__"]) expect(kurzArt(f as string | null)).toBe("koerper");
  });
  it("prüft Orte: alte Kennungen bleiben gültig", () => {
    expect(ortGueltig("zahn", "zahn:36")).toBe(true);
    expect(ortGueltig("zahn", "zahn:99")).toBe(false);
    expect(ortGueltig("zahn", "mund:zahnfleisch")).toBe(true);
    expect(ortGueltig("zahn", "mund:kiefergelenk")).toBe(true);
    expect(ortGueltig("zahn", "knie:R")).toBe(false);
    expect(ortGueltig("koerper", "zahn:36")).toBe(false);
    for (const alt of ["kopf", "hals", "schulter:R", "brust", "bauch", "ellenbogen:L", "hand:R", "huefte:L", "oberschenkel:R", "knie:R", "unterschenkel:L", "fuss:R", "nacken", "ruecken_oben", "ruecken_unten", "gesaess", "wade:L"]) expect(ortGueltig("koerper", alt), alt).toBe(true);
    expect(ortGueltig("koerper", "knie")).toBe(false);
    expect(ortGueltig("koerper", "kopf:L")).toBe(false);
    expect(ortName("knie:L")).toBe("Knie links");
    expect(ortName("zahn:36")).toBe("Zahn 36");
  });
  it("kennt die neuen, genaueren Orte", () => {
    for (const o of ["ellenbogen:R", "oberarm:L", "unterarm:R", "handgelenk:L", "leiste:R", "bauch:ro", "bauch:lo", "bauch:ru", "bauch:lu", "brust:L", "sprunggelenk:R", "kiefergelenk:L", "gesicht"]) expect(ortGueltig("koerper", o), o).toBe(true);
    for (const o of ["auge:R", "auge:L", "auge:B", "gesicht:stirn", "gesicht:schlaefe:L", "kopf"]) expect(ortGueltig("auge", o), o).toBe(true);
    for (const o of ["ohr:R", "ohr:L", "ohr:B", "nase", "rachen", "kiefergelenk:R", "gesicht:stirn", "gesicht:wange:R", "gesicht:mund", "gesicht:kinn", "kopf"]) expect(ortGueltig("hno", o), o).toBe(true);
    expect(ortGueltig("koerper", "auge:R")).toBe(false);
    expect(ortGueltig("haut", "kiefergelenk:R")).toBe(false);
    expect(ortGueltig("haut", "ueberall")).toBe(true);
    expect(ortName("bauch:ro")).toBe("Oberbauch rechts");
    expect(ortName("gesicht:wange:L")).toBe("Wange links");
    expect(ortName("auge:B")).toBe("Beide Augen");
    expect(ortName("ellenbogen:R")).toBe("Ellenbogen rechts");
    expect(ortName("ellenbogen:R", true)).toBe("Arm und Ellenbogen rechts");
    expect(new Set(ORTE.map((o) => o.id)).size).toBe(ORTE.length);
    for (const o of ORTE) expect(o.id.length, o.id).toBeLessThanOrEqual(30);
    for (const art of ["koerper", "haut", "hno"] as const) expect(orteFuer(art).length, art).toBeGreaterThan(10);
    expect(orteFuer("auge").length).toBeGreaterThanOrEqual(5);
  });
  it("trennt Augen- und HNO-Praxis: jede bekommt nur ihre Stellen", () => {
    // Augenpraxis: kein Ohr, keine Nase, kein Rachen, kein Mund
    for (const o of ["ohr:R", "ohr:B", "nase", "rachen", "gesicht:mund", "gesicht:kinn", "gesicht:wange:L", "kiefergelenk:R", "nacken"]) expect(ortGueltig("auge", o), o).toBe(false);
    // HNO-Praxis: keine Augen; Stirn und Wangen bleiben (Nebenhöhlen)
    for (const o of ["auge:R", "auge:L", "auge:B", "gesicht:schlaefe:R", "nacken"]) expect(ortGueltig("hno", o), o).toBe(false);
    expect(orteFuer("auge").map((o) => o.id).sort()).toEqual(["auge:B", "auge:L", "auge:R", "gesicht:schlaefe:L", "gesicht:schlaefe:R", "gesicht:stirn", "kopf"]);
  });
  it("Zeichnung des Kopfes: jede Stelle der Augen- und HNO-Praxis lässt sich antippen (außer „Beide“)", () => {
    const punkte = new Set(KOPF_PUNKTE.map((p) => p.ort));
    for (const art of ["auge", "hno"] as const) {
      const fehlt = orteFuer(art).map((o) => o.id).filter((o) => !o.endsWith(":B") && !punkte.has(o));
      expect(fehlt, art).toEqual([]);
    }
    // Jeder Punkt gehört zu einer der beiden Arten
    for (const p of KOPF_PUNKTE) expect(ortGueltig("auge", p.ort) || ortGueltig("hno", p.ort), p.ort).toBe(true);
  });
  it("schlägt Nachbarzähne im selben Kieferviertel vor", () => {
    expect(nachbarZaehne(36)).toEqual([35, 37]);
    expect(nachbarZaehne(11)).toEqual([12]);
    expect(nachbarZaehne(48)).toEqual([47]);
  });
  it("verlangt bei Beschwerden Ort, Stärke und Dauer", () => {
    const s = kurzcheckSchema("koerper");
    expect(s.safeParse({ orte: [], staerke: 5, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], staerke: 11, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["a", "b", "c", "d"], staerke: 5, seit: "tage", wichtig: "schnell" }).success).toBe(false);
    expect(s.safeParse({ orte: ["knie:R"], staerke: 5, seit: "tage", zeichen: ["kalt"], wichtig: "schnell" }).success).toBe(false);
    const ok = s.safeParse({ orte: ["knie:R", "knie:R"], staerke: 7, seit: "wochen", zeichen: ["stechend", "bewegung"], wichtig: "ursache", notiz: "  beim   Treppensteigen " });
    expect(ok.success && ok.data.orte).toEqual(["knie:R"]);
    expect(ok.success && ok.data.notiz).toBe("beim Treppensteigen");
    expect(kurzcheckSchema("auge").safeParse({ orte: ["auge:L"], staerke: 3, seit: "tage", zeichen: ["traenen", "rot"], wichtig: "ursache" }).success).toBe(true);
    expect(kurzcheckSchema("hno").safeParse({ orte: ["ohr:B"], staerke: 3, seit: "wochen", zeichen: ["hoeren"], wichtig: "ursache" }).success).toBe(true);
    expect(kurzcheckSchema("haut").safeParse({ orte: ["ueberall"], staerke: 3, seit: "wochen", zeichen: ["juckt"], wichtig: "ursache" }).success).toBe(true);
  });
  it("lässt ohne Beschwerden nur „Was ist wichtig“ übrig", () => {
    const d = kurzcheckSchema("zahn").parse({ keine: true, orte: ["zahn:36"], staerke: 4, seit: "tage", zeichen: ["kalt"], wichtig: "kontrolle" });
    expect(d).toMatchObject({ keine: true, orte: [], staerke: null, seit: null, zeichen: [] });
    expect(kurzcheckText(d)).toEqual(["Keine Beschwerden angegeben.", "Wichtig für den Termin: Nur Kontrolle oder Vorsorge"]);
  });
  it("fasst die Antworten für die Praxis zusammen", () => {
    const d = kurzcheckSchema("zahn").parse({ orte: ["zahn:36", "mund:zahnfleisch"], staerke: 8, seit: "tage", zeichen: ["kalt", "pochend"], wichtig: "angst", notiz: "links unten", stand: 2 });
    expect(kurzcheckText(d)).toEqual([
      "Wo: Zahn 36, Zahnfleisch",
      "Wie stark: 8 von 10 (stark), seit ein paar Tagen",
      "Wie es sich zeigt: Bei Kaltem, Pochend, auch nachts",
      "Wichtig für den Termin: Ich bin nervös vor der Behandlung",
      "Eigene Worte: „links unten“",
    ]);
    expect(kurzcheckLesen(d)).toEqual(d);
    expect(kurzcheckLesen({ quatsch: 1 })).toBeNull();
    expect(staerkeWort(0)).toBe("keine");
    expect(staerkeWort(10)).toBe("sehr stark");
    for (const a of KURZ_ARTEN) expect(ZEICHEN[a].length, a).toBeLessThanOrEqual(8);
  });
  it("liest alte gespeicherte Antworten weiter, mit den damaligen, größer gefassten Namen", () => {
    // So stand es vor den genaueren Orten in der Datenbank (ohne „stand“)
    const altKoerper = { art: "koerper", keine: false, orte: ["ellenbogen:R", "huefte:L", "bauch"], staerke: 6, seit: "wochen", zeichen: ["dumpf"], wichtig: "ursache", notiz: "" };
    const a = kurzcheckLesen(altKoerper);
    expect(a?.orte).toEqual(["ellenbogen:R", "huefte:L", "bauch"]);
    expect(kurzcheckText(a!)[0]).toBe("Wo: Arm und Ellenbogen rechts, Hüfte und Leiste links, Bauch");
    const altZahn = { art: "zahn", keine: false, orte: ["zahn:46", "mund:kiefergelenk"], staerke: 4, seit: "tage", zeichen: ["kauen"], wichtig: "schnell", notiz: "" };
    expect(kurzcheckText(kurzcheckLesen(altZahn)!)[0]).toBe("Wo: Zahn 46, Kiefer oder Kiefergelenk");
    // Neue Einträge tragen den Stand und zeigen die genauen Namen
    const neu = kurzcheckLesen({ ...altKoerper, orte: ["ellenbogen:R", "bauch:ru"], stand: 2 });
    expect(kurzcheckText(neu!)[0]).toBe("Wo: Ellenbogen rechts, Unterbauch rechts");
  });
  it("bleibt lesbar, wenn der Stand der Orte später steigt", () => {
    const eintrag = { art: "koerper", keine: false, orte: ["ellenbogen:R"], staerke: 4, seit: "tage", zeichen: [], wichtig: "ursache", notiz: "" };
    // Ein Eintrag mit dem heutigen Stand und einer mit einem späteren Stand (z. B. 3) werden beide gelesen
    for (const stand of [ORTE_STAND, ORTE_STAND + 1, 7]) {
      const a = kurzcheckLesen({ ...eintrag, stand });
      expect(a?.stand, String(stand)).toBe(stand);
      expect(kurzcheckText(a!)[0]).toBe("Wo: Ellenbogen rechts");
    }
    // Ohne Stand oder mit Stand 1: die damaligen Namen
    expect(alteOrtNamen(undefined)).toBe(true);
    expect(alteOrtNamen(1)).toBe(true);
    expect(alteOrtNamen(2)).toBe(false);
    expect(alteOrtNamen(3)).toBe(false);
    // Kaputte Werte bleiben abgelehnt
    expect(kurzcheckLesen({ ...eintrag, stand: "2" })).toBeNull();
    expect(kurzcheckLesen({ ...eintrag, stand: 0 })).toBeNull();
  });
  it("prüft die gespeicherte Art ausdrücklich: Unbekanntes ergibt null", () => {
    const basis = { keine: false, orte: ["knie:R"], staerke: 3, seit: "tage", zeichen: [], wichtig: "ursache", notiz: "" };
    expect(kurzcheckLesen({ ...basis, art: "koerper" })?.art).toBe("koerper");
    expect(kurzcheckLesen({ ...basis, art: "fuss" })).toBeNull();
    expect(kurzcheckLesen({ ...basis, art: "zahn" })).toBeNull(); // Knie gibt es bei den Zähnen nicht
    expect(kurzcheckLesen({ ...basis })).toBeNull();
    expect(kurzcheckLesen(null)).toBeNull();
    expect(kurzcheckLesen("koerper")).toBeNull();
    expect(kurzcheckLesen({ ...basis, art: "auge", orte: ["auge:B"] })?.orte).toEqual(["auge:B"]);
    expect(ORT_NACH.get("auge:B")?.basis).toBe("Beide Augen");
  });
});

describe("Zeichen je Fach", () => {
  it("Hörakustik fragt nicht nach Hals, Nase und Stimme, dafür nach Lärm und Hörgerät", () => {
    const ids = zeichenFuer("hno", "hoerakustik").map((z) => z.id);
    for (const weg of ["schlucken", "nase", "heiser", "riechen"]) expect(ids).not.toContain(weg);
    expect(ids).toEqual(expect.arrayContaining(["hoeren", "geraeusch", "laerm", "hoergeraet"]));
    expect(ids.length).toBeLessThanOrEqual(8);
    // HNO-Praxis: alle Zeichen des Ohr-Modells, ohne die der Hörakustik
    expect(zeichenFuer("hno", "hno")).toEqual(ZEICHEN.hno);
  });
  it("beim Absenden zählt das Fach, beim Lesen bleibt alles der Art lesbar", () => {
    const eingabe = { orte: ["ohr:B"], staerke: 3, seit: "wochen", zeichen: ["nase"], wichtig: "ursache" };
    expect(kurzcheckSchema("hno", "hoerakustik").safeParse(eingabe).success).toBe(false);
    expect(kurzcheckSchema("hno", "hno").safeParse(eingabe).success).toBe(true);
    expect(kurzcheckSchema("hno", "hno").safeParse({ ...eingabe, zeichen: ["laerm"] }).success).toBe(false);
    const neu = kurzcheckSchema("hno", "hoerakustik").parse({ ...eingabe, zeichen: ["laerm"] });
    expect(kurzcheckLesen(neu)?.zeichen).toEqual(["laerm"]);
    expect(kurzcheckText(kurzcheckLesen(neu)!).join(" ")).toContain("Im Lärm schwer zu verstehen");
  });
});
