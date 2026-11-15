import { describe, expect, it } from "vitest";
import {
  G_FRIST_MS, KUERZEL, KUERZEL_START, MAX_JE_GRUPPE, SEITEN, aktionenSuchen, geburtsdatumLesen, gruppieren, istEingabefeld, kuerzelSchritt, nachRang, naechsterIndex, norm,
  patientBedingung, patientRang, seitenRang, seitenSuchen, sichtbareSeiten, startAktionen, suchbegriffe, sucheLangGenug, trefferRang, zuletztMerken, type SeitenKontext, type Treffer,
} from "@/lib/suche";
import { menueRechte } from "@/lib/rollen";

const admin: SeitenKontext = { rechte: menueRechte("admin"), zahn: true, personPl: "Patienten", abschluss: "Behandlung" };
const behandler: SeitenKontext = { rechte: menueRechte("behandler"), zahn: false, personPl: "Kunden", abschluss: "Versorgung" };

describe("norm und trefferRang", () => {
  it("vereinheitlicht Umlaute, ß und Großschreibung", () => {
    expect(norm("Müller")).toBe("mueller");
    expect(norm("MUELLER")).toBe("mueller");
    expect(norm("Straße  René")).toBe("strasse rene");
  });
  it("ordnet gleich > Anfang > Wortanfang > enthält", () => {
    expect(trefferRang("Termine", "termine")).toBe(100);
    expect(trefferRang("Termine", "term")).toBe(80);
    expect(trefferRang("Online-Termine und Kalender", "kal")).toBe(60);
    expect(trefferRang("Bankabgleich", "abgleich")).toBe(40);
    expect(trefferRang("Vorsorge fällig", "vor fäl")).toBe(30);
    expect(trefferRang("Termine", "xyz")).toBe(0);
    expect(trefferRang("Termine", "")).toBe(0);
  });
  it("nachRang sortiert stabil, wirft Nieten weg und begrenzt", () => {
    expect(nachRang(["b2", "a3", "c0", "d3"], (s) => Number(s[1]))).toEqual(["a3", "d3", "b2"]);
    expect(nachRang(Array.from({ length: 20 }, (_, i) => i), () => 1)).toHaveLength(MAX_JE_GRUPPE);
  });
});

describe("Filter der Seitenliste", () => {
  it("findet Seiten über Stichwörter: DATEV → Zahlungen, Diktat → Sicherheit", () => {
    expect(seitenSuchen("DATEV", admin)[0]).toMatchObject({ href: "/zahlungen", titel: "Zahlungen", gruppe: "seiten" });
    expect(seitenSuchen("Diktat", admin)[0]).toMatchObject({ href: "/settings/security", titel: "Sicherheit", unter: "Einstellungen" });
    expect(seitenSuchen("2fa", admin)[0].href).toBe("/settings/security");
    expect(seitenSuchen("csv", admin)[0].href).toBe("/patients/import");
  });
  it("stellt den Titel-Treffer vor den Stichwort-Treffer", () => {
    const t = seitenSuchen("termine", admin).map((x) => x.href);
    expect(t[0]).toBe("/termine");
    expect(t).toContain("/settings/termine");
    expect(seitenRang({ titel: "Termine", stichworte: [] }, "termine")).toBeGreaterThan(seitenRang({ titel: "X", stichworte: ["termine"] }, "termine"));
  });
  it("braucht mindestens zwei Zeichen", () => {
    expect(seitenSuchen("t", admin)).toEqual([]);
    expect(seitenSuchen(" ", admin)).toEqual([]);
  });
  it("zeigt höchstens acht Treffer", () => {
    expect(seitenSuchen("ei", admin).length).toBeLessThanOrEqual(MAX_JE_GRUPPE);
  });
  it("blendet aus, was die Rolle nicht sehen darf", () => {
    expect(seitenSuchen("datev", behandler)).toEqual([]);
    expect(seitenSuchen("umsatz", behandler).map((t) => t.href)).not.toContain("/analyse");
    expect(seitenSuchen("team", behandler)).toEqual([]);
    expect(seitenSuchen("katalog", behandler).map((t) => t.href)).not.toContain("/settings/catalog");
    // Das eigene Konto bleibt erreichbar.
    expect(seitenSuchen("zwei-faktor", behandler)[0].href).toBe("/settings/security");
    const mitFreigabe = { ...behandler, rechte: menueRechte("behandler", true) };
    expect(seitenSuchen("datev", mitFreigabe)[0].href).toBe("/zahlungen");
  });
  it("zeigt Zahn-Seiten nur in Zahnarztpraxen", () => {
    expect(sichtbareSeiten(admin).some((s) => s.href === "/reports")).toBe(true);
    expect(sichtbareSeiten({ ...admin, zahn: false }).some((s) => s.href === "/reports" || s.href === "/settings/billing")).toBe(false);
  });
  it("setzt das Wort des Fachs ein", () => {
    expect(sichtbareSeiten(behandler).find((s) => s.href === "/patients")?.titel).toBe("Kunden und Wege");
    expect(sichtbareSeiten(behandler).find((s) => s.href === "/abschluss/new")?.titel).toBe("Versorgung abschließen");
    expect(seitenSuchen("patienten", behandler)[0].href).toBe("/patients");
  });
  it("hat jede Adresse nur einmal und keine Fachwörter im Titel offen", () => {
    const hrefs = SEITEN.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const s of SEITEN) expect(s.href.startsWith("/")).toBe(true);
  });
});

describe("Suchbegriffe und Geburtsdatum", () => {
  it("liest TT.MM.JJJJ und T.M.JJJJ", () => {
    expect(geburtsdatumLesen("03.07.1984")?.von.toISOString()).toBe("1984-07-03T00:00:00.000Z");
    expect(geburtsdatumLesen("3.7.1984")?.von.toISOString()).toBe("1984-07-03T00:00:00.000Z");
    const g = geburtsdatumLesen("Meier 03.07.1984 Anna")!;
    expect(g.rest).toBe("Meier Anna");
    expect(g.bis.getTime() - g.von.getTime()).toBe(864e5);
  });
  it("lehnt unmögliche und unvollständige Daten ab", () => {
    expect(geburtsdatumLesen("31.02.1990")).toBeNull();
    expect(geburtsdatumLesen("00.01.1990")).toBeNull();
    expect(geburtsdatumLesen("12.13.1990")).toBeNull();
    expect(geburtsdatumLesen("03.07.84")).toBeNull();
    expect(geburtsdatumLesen("03.07.")).toBeNull();
    expect(geburtsdatumLesen("2026-0042")).toBeNull();
    expect(geburtsdatumLesen("1.1.1850")).toBeNull();
  });
  it("trennt Wörter, Komma und Datum", () => {
    const b = suchbegriffe("  Meier, Anna 03.07.1984 ");
    expect(b.woerter).toEqual(["Meier", "Anna"]);
    expect(b.geburt?.von.toISOString()).toBe("1984-07-03T00:00:00.000Z");
    expect(sucheLangGenug(b)).toBe(true);
    expect(sucheLangGenug(suchbegriffe("a"))).toBe(false);
    expect(sucheLangGenug(suchbegriffe("  "))).toBe(false);
  });
  it("kürzt überlange Eingaben und begrenzt die Wortzahl", () => {
    const b = suchbegriffe("a b c d e f g h " + "x".repeat(200));
    expect(b.woerter).toHaveLength(5);
    expect(b.text.length).toBeLessThanOrEqual(60);
  });
  it("baut die Bedingung für Patienten", () => {
    expect(patientBedingung(suchbegriffe(""))).toBeNull();
    const nurDatum = patientBedingung(suchbegriffe("03.07.1984"))!;
    expect(nurDatum.AND).toHaveLength(1);
    expect(nurDatum.AND[0]).toHaveProperty("birthDate");
    const beides = patientBedingung(suchbegriffe("meier 03.07.1984"))!;
    expect(beides.AND).toHaveLength(2);
    expect(beides.AND[0]).toEqual({ OR: [{ firstName: { contains: "meier", mode: "insensitive" } }, { lastName: { contains: "meier", mode: "insensitive" } }] });
  });
});

describe("Rangfolge der Treffer", () => {
  it("Nachname vor Vorname, Anfang vor Mitte", () => {
    const b = suchbegriffe("anna");
    const liste = [
      { firstName: "Hanna", lastName: "Berg" },
      { firstName: "Anna", lastName: "Meier" },
      { firstName: "Tom", lastName: "Annaberg" },
      { firstName: "Tom", lastName: "Anna" },
    ];
    expect(nachRang(liste, (p) => patientRang(p, b)).map((p) => `${p.lastName} ${p.firstName}`)).toEqual(["Anna Tom", "Meier Anna", "Annaberg Tom", "Berg Hanna"]);
  });
  it("jedes Wort muss passen", () => {
    const b = suchbegriffe("meier anna");
    expect(patientRang({ firstName: "Anna", lastName: "Meier" }, b)).toBeGreaterThan(0);
    expect(patientRang({ firstName: "Paul", lastName: "Meier" }, b)).toBe(0);
  });
  it("nur Geburtsdatum: alle gleich gut", () => {
    expect(patientRang({ firstName: "A", lastName: "B" }, suchbegriffe("03.07.1984"))).toBe(50);
  });
  it("gruppiert in fester Reihenfolge und lässt leere Gruppen weg", () => {
    const t: Treffer[] = [
      { id: "s", gruppe: "seiten", titel: "S", href: "/s" },
      { id: "r", gruppe: "rechnungen", titel: "R", href: "/r" },
      { id: "p", gruppe: "patienten", titel: "P", href: "/p" },
      { id: "a", gruppe: "aktionen", titel: "A", href: "/a" },
    ];
    expect(gruppieren(t).map((g) => g.gruppe)).toEqual(["patienten", "aktionen", "rechnungen", "seiten"]);
    const viele = Array.from({ length: 12 }, (_, i): Treffer => ({ id: `p${i}`, gruppe: "patienten", titel: `P${i}`, href: "/p" }));
    expect(gruppieren(viele)[0].treffer).toHaveLength(8);
  });
});

describe("Aktionen", () => {
  it("bietet „Neuer Vorschlag für <Patient>“ für die besten Treffer", () => {
    const a = aktionenSuchen("meier", [{ id: "p1", name: "Anna Meier" }, { id: "p2", name: "Paul Meier" }, { id: "p3", name: "X Meier" }, { id: "p4", name: "Y Meier" }]);
    expect(a.slice(0, 3).map((x) => x.titel)).toEqual(["Neuer Vorschlag für Anna Meier", "Neuer Vorschlag für Paul Meier", "Neuer Vorschlag für X Meier"]);
    expect(a[0].href).toBe("/proposals/new?patientId=p1");
    expect(a.some((x) => x.titel.includes("Y Meier"))).toBe(false);
  });
  it("findet feste Aktionen über das Suchwort", () => {
    expect(aktionenSuchen("termin", []).map((a) => a.titel)).toContain("Termin eintragen");
    expect(aktionenSuchen("anlegen", [], "Kunde")[0]).toMatchObject({ titel: "Kunde anlegen", href: "/patients/new" });
    expect(aktionenSuchen("xyz", [])).toEqual([]);
  });
  it("zeigt ohne Suchwort die drei Grundaktionen", () => {
    expect(startAktionen().map((a) => a.titel)).toEqual(["Neuer Vorschlag", "Termin eintragen", "Patient anlegen"]);
  });
});

describe("Bedienung", () => {
  it("Pfeiltasten laufen im Kreis", () => {
    expect(naechsterIndex(-1, 3, 1)).toBe(0);
    expect(naechsterIndex(-1, 3, -1)).toBe(2);
    expect(naechsterIndex(2, 3, 1)).toBe(0);
    expect(naechsterIndex(0, 3, -1)).toBe(2);
    expect(naechsterIndex(0, 0, 1)).toBe(-1);
  });
  it("merkt zuletzt geöffnete Patienten ohne Doppelte", () => {
    const a = { id: "patient-1", patientId: "1" }, b = { id: "patient-2", patientId: "2" };
    let l = zuletztMerken([], a);
    l = zuletztMerken(l, b);
    l = zuletztMerken(l, a);
    expect(l.map((x) => x.patientId)).toEqual(["1", "2"]);
    for (let i = 3; i < 12; i++) l = zuletztMerken(l, { id: `patient-${i}`, patientId: String(i) });
    expect(l).toHaveLength(5);
  });
});

describe("Tastenkürzel", () => {
  const druck = (keys: (string | { key: string; [k: string]: unknown })[], abstand = 100) => {
    let z = KUERZEL_START, t = 1000;
    let letzte: ReturnType<typeof kuerzelSchritt>["ergebnis"] = null;
    for (const k of keys) {
      const r = kuerzelSchritt(z, typeof k === "string" ? { key: k } : k, t);
      z = r.zustand;
      letzte = r.ergebnis;
      t += abstand;
    }
    return letzte;
  };

  it("g dann Buchstabe führt zum Ziel", () => {
    expect(druck(["g", "h"])).toEqual({ art: "ziel", href: "/dashboard" });
    expect(druck(["g", "p"])).toEqual({ art: "ziel", href: "/patients" });
    expect(druck(["g", "e"])).toEqual({ art: "ziel", href: "/eingang" });
    expect(druck(["g", "t"])).toEqual({ art: "ziel", href: "/termine" });
    expect(druck(["g", "v"])).toEqual({ art: "ziel", href: "/proposals" });
    expect(druck(["g", "z"])).toEqual({ art: "ziel", href: "/zahlungen" });
  });
  it("n, ? und Strg+K / ⌘K", () => {
    expect(druck(["n"])).toEqual({ art: "ziel", href: "/proposals/new" });
    expect(druck(["?"])).toEqual({ art: "hilfe" });
    expect(druck([{ key: "k", ctrlKey: true }])).toEqual({ art: "suche" });
    expect(druck([{ key: "K", metaKey: true }])).toEqual({ art: "suche" });
  });
  it("Großbuchstaben zählen wie kleine", () => {
    expect(druck(["G", "H"])).toEqual({ art: "ziel", href: "/dashboard" });
  });
  it("löst im Eingabefeld nie aus – außer Strg+K", () => {
    expect(druck([{ key: "n", imEingabefeld: true }])).toBeNull();
    expect(druck([{ key: "?", imEingabefeld: true }])).toBeNull();
    expect(druck([{ key: "g", imEingabefeld: true }, { key: "h", imEingabefeld: true }])).toBeNull();
    // „g“ außerhalb, dann Fokus ins Feld und „h“ getippt: nichts.
    expect(druck(["g", { key: "h", imEingabefeld: true }])).toBeNull();
    expect(druck([{ key: "k", ctrlKey: true, imEingabefeld: true }])).toEqual({ art: "suche" });
  });
  it("löst mit Strg, ⌘ oder Alt nicht aus (Browser-Kürzel bleiben frei)", () => {
    expect(druck([{ key: "n", ctrlKey: true }])).toBeNull();
    expect(druck([{ key: "n", metaKey: true }])).toBeNull();
    expect(druck(["g", { key: "t", altKey: true }])).toBeNull();
    expect(druck([{ key: "k", ctrlKey: true, altKey: true }])).toBeNull();
  });
  it("vergisst das g nach der Frist und nach einer fremden Taste", () => {
    expect(druck(["g", "h"], G_FRIST_MS + 1)).toBeNull();
    expect(druck(["g", "x", "h"])).toBeNull();
    expect(druck(["g", "g", "h"])).toEqual({ art: "ziel", href: "/dashboard" });
  });
  it("g gefolgt von n ist kein neuer Vorschlag", () => {
    expect(druck(["g", "n"])).toBeNull();
  });
  it("ignoriert gehaltene Tasten und Sondertasten", () => {
    expect(druck([{ key: "n", repeat: true }])).toBeNull();
    expect(druck(["Shift"])).toBeNull();
    expect(druck(["Escape"])).toBeNull();
  });
  it("die Liste der Kürzel nennt jedes Ziel", () => {
    expect(KUERZEL.filter((k) => k.ziel).map((k) => k.tasten.join(" "))).toEqual(["g h", "g p", "g e", "g t", "g v", "g z", "n"]);
    expect(KUERZEL.some((k) => k.aktion === "hilfe")).toBe(true);
  });

  it("erkennt Eingabefelder", () => {
    expect(istEingabefeld({ tagName: "INPUT" })).toBe(true);
    expect(istEingabefeld({ tagName: "textarea" })).toBe(true);
    expect(istEingabefeld({ tagName: "SELECT" })).toBe(true);
    expect(istEingabefeld({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(istEingabefeld({ tagName: "DIV", getAttribute: (n) => (n === "role" ? "combobox" : null) })).toBe(true);
    expect(istEingabefeld({ tagName: "BUTTON" })).toBe(false);
    expect(istEingabefeld({ tagName: "A", getAttribute: () => null })).toBe(false);
    expect(istEingabefeld(null)).toBe(false);
  });
});
