import { describe, expect, it } from "vitest";
import { EBENEN, STRUKTUREN, seiteImBild, teilKennung, teilLesen, teilName } from "./koerper";
import { KOERPER_TEXTE } from "./koerperTexte";
import { INSTRUMENTE, MILCHZAEHNE, SCHICHTEN, ZAEHNE, zahnNach } from "./gebiss";
import { SCHNITTMODELLE } from "./schnitt";
import { FACH_MODELLE, MODELL_IDS, hauptModell, modelleFuerFach } from "./fach";
import { ALLE_SPECIALTIES } from "../specialties";
import { rahmen } from "./formen";
import { MODELL_BEFUNDE, istBleibenderZahn, markierungSchema, teilBezeichnung, teilGueltig } from "./markierung";

describe("Körpermodell", () => {
  it("jede Struktur hat Namen, Erklärung, Beschwerden und mindestens eine Ansicht", () => {
    expect(STRUKTUREN.length).toBeGreaterThanOrEqual(110);
    for (const s of STRUKTUREN) {
      expect(s.name.length, s.id).toBeGreaterThan(2);
      expect(s.was.length, s.id).toBeGreaterThan(40);
      expect(s.beschwerden.length, s.id).toBeGreaterThan(40);
      expect(!!(s.vorn?.length || s.hinten?.length), s.id).toBe(true);
    }
    expect(new Set(STRUKTUREN.map((s) => s.id)).size).toBe(STRUKTUREN.length);
    expect(Object.keys(KOERPER_TEXTE).sort()).toEqual(STRUKTUREN.map((s) => s.id).sort());
  });
  it("alle fünf Ebenen sind gefüllt: Knochen, Organe, Muskeln, Sehnen/Bänder/Gelenke, Nerven", () => {
    expect(EBENEN.map((e) => e.id)).toEqual(["knochen", "organe", "muskeln", "sehnen", "nerven"]);
    for (const e of EBENEN) expect(STRUKTUREN.filter((s) => s.ebene === e.id).length, e.id).toBeGreaterThanOrEqual(e.id === "nerven" ? 10 : 20);
    for (const id of ["herz", "lunge", "leber", "magen", "niere", "dickdarm", "gehirn", "schilddruese", "harnblase", "ischiasnerv", "mittelnerv"]) expect(STRUKTUREN.some((s) => s.id === id), id).toBe(true);
  });
  it("Gebärmutter und Prostata sind je einem Geschlecht zugeordnet, alles andere beiden", () => {
    expect(STRUKTUREN.filter((s) => s.geschlecht).map((s) => `${s.id}:${s.geschlecht}`).sort()).toEqual(["gebaermutter:W", "prostata:M"]);
  });
  it("Formen liegen in der Zeichenfläche und ergeben gültige Pfade", () => {
    for (const s of STRUKTUREN) for (const formen of [s.vorn, s.hinten]) {
      if (!formen) continue;
      for (const f of formen) expect(f.d, s.id).toMatch(/^M[\d. -]+[CAL]/);
      expect(f(formen), s.id).not.toContain("NaN");
      const r = rahmen(formen);
      expect(r.x, s.id).toBeGreaterThanOrEqual(0);
      expect(r.x + r.b, s.id).toBeLessThanOrEqual(400);
      expect(r.y + r.h, s.id).toBeLessThanOrEqual(880);
    }
  });
  it("Körperseite: von vorn liegt die rechte Körperseite links im Bild, von hinten umgekehrt", () => {
    expect(seiteImBild("vorn", "links")).toBe("R");
    expect(seiteImBild("vorn", "rechts")).toBe("L");
    expect(seiteImBild("hinten", "links")).toBe("L");
  });
  it("Teil-Kennung mit Seite; paarige Strukturen brauchen eine Seite, einzelne nicht", () => {
    expect(teilName(teilKennung("patellasehne", "L"))).toBe("Patellasehne links");
    expect(teilName("lws:M")).toBe("Lendenwirbelsäule");
    expect(teilLesen("patellasehne:M")).toBeNull();
    expect(teilLesen("lws:L")).toBeNull();
    expect(teilLesen("gibtesnicht:L")).toBeNull();
  });
});
const f = (formen: { d: string }[]) => formen.map((x) => x.d).join(" ");

describe("Gebiss-Modell", () => {
  it("32 Zähne nach FDI-Schema, je Quadrant 1 bis 8", () => {
    expect(ZAEHNE).toHaveLength(32);
    expect(ZAEHNE.map((z) => z.fdi)).toEqual([1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q * 10 + n)));
    expect(zahnNach(16)?.name).toBe("Oberer rechter erster großer Backenzahn");
    expect(zahnNach(31)?.name).toBe("Unterer linker mittlerer Schneidezahn");
    expect(zahnNach(48)?.art).toBe("weisheitszahn");
  });
  it("rechte Seite des Patienten liegt links im Bild, Oberkiefer oben", () => {
    expect(zahnNach(18)!.mitte[0]).toBeLessThan(200);
    expect(zahnNach(28)!.mitte[0]).toBeGreaterThan(200);
    expect(zahnNach(11)!.mitte[1]).toBeLessThan(zahnNach(41)!.mitte[1]);
    expect(zahnNach(11)!.mitte[1]).toBeLessThan(zahnNach(18)!.mitte[1]); // Schneidezähne am Scheitel des Bogens
  });
  it("Zähne überlappen nicht (Abstand der Mittelpunkte) und liegen im Bild", () => {
    for (const kiefer of ["oben", "unten"] as const) for (const seite of ["rechts", "links"] as const) {
      const reihe = ZAEHNE.filter((z) => z.kiefer === kiefer && z.seite === seite).sort((a, b) => a.pos - b.pos);
      for (let i = 1; i < reihe.length; i++) expect(Math.hypot(reihe[i].mitte[0] - reihe[i - 1].mitte[0], reihe[i].mitte[1] - reihe[i - 1].mitte[1]), `${reihe[i].fdi}`).toBeGreaterThan(14);
    }
    for (const z of ZAEHNE) { const r = rahmen([z.form]); expect(r.x, `${z.fdi}`).toBeGreaterThan(0); expect(r.x + r.b, `${z.fdi}`).toBeLessThan(400); expect(r.y, `${z.fdi}`).toBeGreaterThan(0); expect(r.y + r.h, `${z.fdi}`).toBeLessThan(560); expect(z.form.d).not.toContain("NaN"); }
  });
  it("Schichten und Instrumente sind erklärt; Instrumente verweisen nur auf vorhandene Schichten", () => {
    expect(SCHICHTEN.map((s) => s.id)).toEqual(expect.arrayContaining(["schmelz", "dentin", "pulpa", "wurzelkanal", "zahnfleisch", "wurzelhaut", "kieferknochen"]));
    expect(INSTRUMENTE.length).toBeGreaterThanOrEqual(12);
    for (const i of INSTRUMENTE) {
      expect(i.wofuer.length, i.id).toBeGreaterThan(60);
      expect(i.gefuehl.length, i.id).toBeGreaterThan(30);
      if (i.schicht) expect(SCHICHTEN.some((s) => s.id === i.schicht), i.id).toBe(true);
    }
  });
});

describe("Markierungen der Praxis", () => {
  it("nimmt nur Teile an, die es im Modell gibt", () => {
    expect(teilGueltig("gebiss", "36")).toBe(true);
    expect(teilGueltig("gebiss", "49")).toBe(false);
    expect(teilGueltig("gebiss", "patellasehne:L")).toBe(false);
    expect(teilGueltig("koerper", "achillessehne:R")).toBe(true);
    expect(teilGueltig("koerper", "36")).toBe(false);
    expect(markierungSchema.safeParse({ modell: "koerper", teil: "lws:M", notiz: "  Hier   sitzt es. " }).data?.notiz).toBe("Hier sitzt es.");
    expect(markierungSchema.safeParse({ modell: "gebiss", teil: "99" }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss", teil: "36", notiz: "x".repeat(301) }).success).toBe(false);
  });
  it("markiert mehrere Stellen auf einmal und nimmt einen Befund nur für bleibende Zähne an", () => {
    const viele = markierungSchema.safeParse({ modell: "gebiss", teile: ["16", "26", "16"], notiz: "Füllungen geplant", befund: "karies_klein" });
    expect(viele.success && viele.data.teile).toEqual(["16", "26"]);
    expect(viele.success && viele.data.befund).toBe("karies_klein");
    expect(viele.success && viele.data.befundGesetzt).toBe(true);
    const einzeln = markierungSchema.safeParse({ modell: "gebiss", teil: "36" });
    expect(einzeln.success && einzeln.data.teile).toEqual(["36"]);
    expect(einzeln.success && einzeln.data.befundGesetzt).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss", teile: [] }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss" }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss", teile: ["16", "99"] }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss", teil: "16", befund: "gibtsnicht" }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "gebiss", teil: "55", befund: "karies_klein" }).success).toBe(false); // Milchzahn
    expect(markierungSchema.safeParse({ modell: "koerper", teil: "lws:M", befund: "karies_klein" }).success).toBe(false);
    expect(markierungSchema.safeParse({ modell: "koerper", teile: ["lws:M", "achillessehne:R"] }).success).toBe(true);
    expect(istBleibenderZahn("48")).toBe(true);
    expect(istBleibenderZahn("51")).toBe(false);
    expect(Object.keys(MODELL_BEFUNDE).length).toBeGreaterThan(3);
  });
  it("benennt Teile für Patienten lesbar", () => {
    expect(teilBezeichnung("gebiss", "36")).toBe("Zahn 36 (Unterer linker erster großer Backenzahn)");
    expect(teilBezeichnung("koerper", "achillessehne:R")).toBe("Achillessehne rechts");
  });
});

describe("Milchgebiss", () => {
  it("20 Milchzähne in den Quadranten 5 bis 8, je fünf", () => {
    expect(MILCHZAEHNE.map((z) => z.fdi)).toEqual([5, 6, 7, 8].flatMap((q) => [1, 2, 3, 4, 5].map((n) => q * 10 + n)));
    expect(zahnNach(55)?.name).toBe("Oberer rechter zweiter Milchbackenzahn");
    expect(zahnNach(71)?.milch).toBe(true);
    expect(zahnNach(16)?.milch).toBeUndefined();
    expect(teilGueltig("gebiss", "75")).toBe(true);
    expect(teilGueltig("gebiss", "56")).toBe(false);
  });
});

describe("Auge, Ohr und Haut", () => {
  it("jedes Modell hat erklärte Teile mit gültigen Formen in der Zeichenfläche", () => {
    for (const m of Object.values(SCHNITTMODELLE)) {
      expect(m.teile.length, m.id).toBeGreaterThanOrEqual(10);
      expect(new Set(m.teile.map((t) => t.id)).size, m.id).toBe(m.teile.length);
      for (const t of m.teile) {
        expect(t.was.length, `${m.id}.${t.id}`).toBeGreaterThan(50);
        expect(t.beschwerden.length, `${m.id}.${t.id}`).toBeGreaterThan(50);
        expect(f(t.formen), `${m.id}.${t.id}`).not.toContain("NaN");
        // Der Rahmen rechnet mit den Stützpunkten der Kurven; die liegen bei eckigen Flächen etwas außerhalb der Linie
        const r = rahmen(t.formen);
        expect(r.x, `${m.id}.${t.id}`).toBeGreaterThanOrEqual(-60);
        expect(r.x + r.b, `${m.id}.${t.id}`).toBeLessThanOrEqual(m.breite + 60);
        expect(r.y + r.h, `${m.id}.${t.id}`).toBeLessThanOrEqual(m.hoehe + 60);
      }
    }
    expect(teilGueltig("auge", "linse")).toBe(true);
    expect(teilGueltig("auge", "trommelfell")).toBe(false);
    expect(teilBezeichnung("ohr", "trommelfell")).toBe("Trommelfell (Ohr)");
    expect(teilBezeichnung("haut", "muttermal")).toBe("Muttermal (Haut)");
  });
});

describe("Passendes Modell je Fachrichtung", () => {
  it("jede Fachrichtung hat ein Hauptmodell; die naheliegenden stimmen", () => {
    for (const s of ALLE_SPECIALTIES) {
      expect(FACH_MODELLE[s.id], s.id).toBeDefined();
      for (const m of modelleFuerFach(s.id).modelle) expect(MODELL_IDS, s.id).toContain(m);
    }
    expect(hauptModell("zahn")).toBe("gebiss");
    expect(hauptModell(null)).toBe("gebiss");
    expect(hauptModell("augen")).toBe("auge");
    expect(hauptModell("hno")).toBe("ohr");
    expect(hauptModell("haut")).toBe("haut");
    expect(hauptModell("kardio")).toBe("koerper");
    expect(modelleFuerFach("kardio").ebenen).toContain("organe");
    expect(modelleFuerFach("ortho").ebenen).toEqual(["knochen", "muskeln", "sehnen"]);
    expect(modelleFuerFach("neuro").ebenen).toContain("nerven");
    expect(modelleFuerFach("gyn").geschlecht).toBe("W");
    expect(hauptModell("gibtesnicht")).toBe("koerper");
  });
});
