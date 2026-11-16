import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES, SPECIALTIES, specialty } from "@/lib/specialties";
import { SYNONYME, anlassEintraege, erkenneAnlaesse, normWort, wortstamm } from "@/lib/anlassErkennung";

const fuer = (fach: string, text: string) => {
  const s = specialty(fach)!;
  return erkenneAnlaesse(text, anlassEintraege(s.anlaesse), { fach });
};
const ids = (fach: string, text: string) => fuer(fach, text).erkannt.map((e) => e.id);

describe("Wörter angleichen", () => {
  it("Umlaute, Groß- und Kleinschreibung", () => {
    expect(normWort("Hörtest")).toBe("hoertest");
    expect(normWort("HOERTEST")).toBe("hoertest");
    expect(normWort("Fußpflege")).toBe("fusspflege");
    expect(normWort("Café")).toBe("cafe");
  });
  it("Wortstämme", () => {
    expect(wortstamm("impfungen")).toBe("impfung");
    expect(wortstamm("schmerzen")).toBe("schmerz");
    expect(wortstamm("u10")).toBe("u10");
    expect(wortstamm("ct")).toBe("ct");
  });
});

describe("Jeder Anlass wird an seiner eigenen Bezeichnung erkannt", () => {
  for (const s of ALLE_SPECIALTIES) {
    it(s.name, () => {
      const liste = anlassEintraege(s.anlaesse);
      for (const a of s.anlaesse) {
        const r = erkenneAnlaesse(a.label, liste, { fach: s.id });
        expect(r.erkannt.map((e) => e.id), `${s.id}: ${a.label}`).toContain(a.id);
      }
    });
  }
});

// Sätze, wie sie nach einem Gespräch diktiert oder getippt werden. Je Fach: Text → erwartete Anlässe.
const BEISPIELE: Record<string, [string, string[]][]> = {
  hausarzt: [
    ["Check-up gewünscht, außerdem Reise nach Thailand im März", ["checkup", "reise"]],
    ["Tetanus auffrischen und Grippeimpfung", ["impfen"]],
    ["läuft im Herbst Marathon, möchte vorher eine Sportuntersuchung", ["sport"]],
    ["Diabetes seit 2019, Einschreibung ins DMP", ["chroniker"]],
    ["Reiseimpfung für Kenia", ["reise"]],
  ],
  augen: [
    ["Augendruck messen, Mutter hatte grünen Star", ["glaukom"]],
    ["Sehtest für den Führerschein", ["fuehrerschein"]],
    ["klagt über trockene Augen, fragt nach Lasern", ["trockenes_auge", "lasern"]],
    ["Makuladegeneration beim Vater, OCT besprochen", ["netzhaut"]],
  ],
  haut: [
    ["Hautkrebsscreening, zwei auffällige Muttermale am Rücken", ["hautkrebs"]],
    ["Haarausfall seit dem Sommer", ["haare"]],
    ["Akne im Gesicht", ["akne"]],
  ],
  gyn: [
    ["Krebsvorsorge mit Abstrich, zusätzlich Brustultraschall gewünscht", ["krebsvorsorge", "brust"]],
    ["schwanger, 10. SSW, fragt nach Toxoplasmose", ["schwangerschaft"]],
    ["möchte eine Kupferspirale", ["verhuetung"]],
    ["Hitzewallungen, Wechseljahre", ["wechseljahre"]],
  ],
  uro: [
    ["PSA-Test zur Vorsorge", ["prostata"]],
    ["wiederkehrende Blasenentzündungen", ["hwi"]],
    ["Vasektomie geplant", ["vasektomie"]],
    ["Urinverlust beim Husten", ["inkontinenz"]],
  ],
  ortho: [
    ["Knieschmerzen rechts seit Monaten, Hyaluron besprochen", ["gelenkschmerz"]],
    ["Rückenschmerzen, LWS", ["ruecken"]],
    ["Knochendichtemessung wegen Osteoporose in der Familie", ["osteoporose"]],
    ["Arbeitsunfall gestern, BG-Fall", ["arbeitsunfall"]],
  ],
  hno: [
    ["Patientin hört schlecht, Hörtest gewünscht", ["hoeren"]],
    ["Ehefrau klagt über Schnarchen mit Atemaussetzern", ["schnarchen"]],
    ["Ohrgeräusche links seit zwei Wochen", ["tinnitus"]],
    ["Heuschnupfen, Allergietest", ["allergie"]],
  ],
  kinder: [
    ["U9 steht an", ["vorsorge_kind"]],
    ["U10 gewünscht", ["u10"]],
    ["Masern-Impfung fehlt noch", ["impfen_kind"]],
    ["Bescheinigung für den Sportverein", ["sport_kind"]],
  ],
  kardio: [
    ["Herzstolpern, Langzeit-EKG", ["rhythmus"]],
    ["Herz-Check ohne Beschwerden gewünscht", ["herzcheck"]],
    ["Leistungssport, Sportkardiologie", ["sportkardio"]],
  ],
  radiologie: [
    ["Ganzkörper-MRT auf eigenen Wunsch", ["mrt_wunsch"]],
    ["Mammographie", ["mamma"]],
    ["Knochendichte messen", ["knochen"]],
  ],
  neuro: [
    ["wird vergesslich, Angst vor Demenz", ["gedaechtnis"]],
    ["Migräne seit Jahren", ["kopfschmerz"]],
    ["Ultraschall der Halsschlagadern", ["gefaesse"]],
  ],
  psych: [
    ["sucht einen Therapieplatz wegen Depression", ["therapieplatz"]],
    ["Coaching zur Stressbewältigung", ["coaching"]],
  ],
  gastro: [
    ["Darmspiegelung zur Vorsorge", ["darm"]],
    ["Verdacht auf Laktoseintoleranz", ["unvertraeglich"]],
    ["Reizdarm, Blähungen", ["atemtest"]],
  ],
  pneumo: [
    ["Lungenfunktion prüfen, Husten seit Wochen", ["lunge"]],
    ["möchte mit dem Rauchen aufhören", ["rauchstopp"]],
  ],
  endo: [
    ["Schilddrüsenwerte kontrollieren", ["schilddruese"]],
    ["fragt nach einem Glukosesensor", ["glukose"]],
    ["Ernährungsberatung, möchte abnehmen", ["ernaehrung"]],
  ],
  chirurgie: [
    ["Besenreiser veröden", ["venen"]],
    ["Lipom am Oberarm entfernen", ["haut_entfernung"]],
  ],
  aesthetik: [
    ["Botox an der Stirn gewünscht", ["gesicht"]],
    ["Schlupflider stören beim Sehen", ["lider"]],
  ],
  physio: [
    ["Rückenschmerzen, Krankengymnastik auf Verordnung", ["ruecken"]],
    ["Lymphdrainage nach OP", ["lymph"]],
    ["Beckenbodentraining nach Geburt", ["beckenboden"]],
    ["Rückenkurs", ["praevention"]],
  ],
  ergo: [
    ["Ergotherapie nach Schlaganfall, als Hausbesuch", ["ergo_behandlung", "ergo_hausbesuch"]],
    ["Handtherapie ohne Verordnung", ["ergo_privat"]],
  ],
  logo: [
    ["Kind stottert, Logopädie", ["sprache"]],
    ["Schluckstörung nach Schlaganfall", ["logo_schlucken"]],
    ["Lehrerin, wünscht Stimmtraining", ["logo_stimme_beruf"]],
  ],
  podo: [
    ["eingewachsener Nagel, Nagelspange", ["nagelspange"]],
    ["Fußpflege gewünscht", ["fusspflege"]],
    ["diabetischer Fuß, podologische Behandlung", ["fuss"]],
  ],
};

describe("Sätze aus dem Praxisalltag je Fach", () => {
  it("für jedes sichtbare Fach gibt es Beispiele", () => {
    for (const s of SPECIALTIES) expect(BEISPIELE[s.id], s.id).toBeDefined();
  });
  for (const [fach, saetze] of Object.entries(BEISPIELE)) {
    it(fach, () => {
      for (const [text, erwartet] of saetze) {
        const gefunden = ids(fach, text);
        for (const id of erwartet) expect(gefunden, `${fach}: „${text}“`).toContain(id);
      }
    });
  }
  it("genaue Treffer verdrängen Wortteile", () => {
    expect(ids("hausarzt", "Reiseimpfung für Kenia")).toEqual(["reise"]);
    expect(ids("physio", "Rückenkurs")).toEqual(["praevention"]);
    expect(ids("gyn", "HPV-Test")).toEqual(["krebsvorsorge"]);
  });
});

describe("Verneinung", () => {
  it("kein, ohne, nicht: wird nicht vorgeschlagen, sondern als verneint gemeldet", () => {
    const r = fuer("hno", "kein Tinnitus, aber Hörtest gewünscht");
    expect(r.erkannt.map((e) => e.id)).toEqual(["hoeren"]);
    expect(r.verneint.map((e) => e.id)).toEqual(["tinnitus"]);
  });
  it("ohne", () => {
    const r = fuer("ortho", "Rückenschmerzen, ohne Osteoporose");
    expect(r.erkannt.map((e) => e.id)).toContain("ruecken");
    expect(r.erkannt.map((e) => e.id)).not.toContain("osteoporose");
    expect(r.verneint.map((e) => e.id)).toContain("osteoporose");
  });
  it("nachgestellt: nicht gewünscht, abgelehnt, lehnt … ab", () => {
    expect(ids("hausarzt", "Check-up nicht gewünscht")).toEqual([]);
    expect(ids("hausarzt", "Grippeimpfung abgelehnt")).toEqual([]);
    expect(ids("hausarzt", "lehnt die Grippeimpfung ab, Check-up ja")).toEqual(["checkup"]);
  });
  it("weder … noch", () => {
    const r = fuer("hno", "weder Schnarchen noch Tinnitus, Allergietest");
    expect(r.erkannt.map((e) => e.id)).toEqual(["allergie"]);
  });
  it("„nicht nur“ ist keine Verneinung", () => {
    expect(ids("hno", "nicht nur Tinnitus, auch Heuschnupfen")).toEqual(expect.arrayContaining(["tinnitus", "allergie"]));
  });
  it("eine Verneinung gilt nur bis zum nächsten Satzteil", () => {
    expect(ids("gyn", "keine Schwangerschaft. Verhütung besprochen")).toEqual(["verhuetung"]);
  });
  it("„ohne Beschwerden“ in der Eingabe verneint den Anlass nicht", () => {
    expect(ids("kardio", "Herz-Check ohne Beschwerden")).toContain("herzcheck");
    expect(ids("psych", "Beratung ohne Krankheitswert")).toContain("coaching");
  });
});

describe("Grenzen", () => {
  it("leerer oder fremder Text: keine Vorschläge", () => {
    expect(fuer("hno", "").erkannt).toEqual([]);
    expect(fuer("hno", "   ").erkannt).toEqual([]);
    expect(fuer("hno", "Bitte Rückruf am Montag, Rechnung an die neue Adresse").erkannt).toEqual([]);
    expect(fuer("physio", "Bitte Rückruf am Montag").erkannt).toEqual([]);
  });
  it("Umlaute ausgeschrieben und Großschreibung", () => {
    expect(ids("hno", "HOERTEST")).toEqual(["hoeren"]);
    expect(ids("ortho", "rueckenschmerzen")).toContain("ruecken");
  });
  it("nennt die Wörter, an denen erkannt wurde", () => {
    const r = fuer("hno", "Hörtest gewünscht");
    expect(r.erkannt[0].treffer).toEqual(["Hörtest"]);
  });
  it("eigene Leistungen der Praxis werden an ihrem Namen erkannt", () => {
    const liste = anlassEintraege([], [{ id: "l1", anlass: "Atteste", name: "Tauchtauglichkeit" }], "custom:");
    expect(erkenneAnlaesse("Attest zur Tauchtauglichkeit", liste).erkannt.map((e) => e.id)).toEqual(["custom:l1"]);
  });
  it("jeder Schlüssel der Stichwort-Tabelle gehört zu einem vorhandenen Anlass", () => {
    const vorhanden = new Set(ALLE_SPECIALTIES.flatMap((s) => s.anlaesse.flatMap((a) => [a.id, `${s.id}:${a.id}`])));
    for (const k of Object.keys(SYNONYME)) expect(vorhanden.has(k), k).toBe(true);
  });
  it("sehr lange Texte werden begrenzt und bringen nichts zum Absturz", () => {
    expect(() => fuer("hno", "Hörtest ".repeat(5000))).not.toThrow();
  });
});
