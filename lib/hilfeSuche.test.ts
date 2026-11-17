import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BEDIENUNG, FEHLER, HILFE_HINWEIS, HILFE_WISSEN, PRAXISMANAGER, WEBSITE_HINWEIS, WEBSITE_WISSEN, type HilfeEintrag } from "@/lib/hilfeWissen";
import { fragenZurSeite, hilfeText, meldungenErkennen, seitePasst, sichtbareHilfe, sucheHilfe } from "@/lib/hilfeSuche";
import { ankerInfo, PM_THEMEN } from "@/lib/hilfeAnker";
import { menueRechte } from "@/lib/rollen";

const erster = (frage: string, fach?: "zahn" | "andere") => sucheHilfe(frage, HILFE_WISSEN, { fach })[0]?.eintrag.id;
const ids = (frage: string, anzahl = 3) => sucheHilfe(frage, HILFE_WISSEN, { anzahl }).map((t) => t.eintrag.id);
const ALLES = [...HILFE_WISSEN, ...WEBSITE_WISSEN];

// Quelltext der App (ohne die Wissenssammlung selbst), um Meldungen wörtlich wiederzufinden.
const lauf = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? lauf(join(ordner, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(ordner, e.name)] : [],
  );
const QUELLTEXT = [...lauf("app"), ...lauf("components"), ...lauf("lib").filter((d) => !d.startsWith(join("lib", "hilfeWissen"))), "proxy.ts"]
  .map((d) => readFileSync(d, "utf8"))
  .join("\n");

/** Gibt es zu einem Pfad eine Seite? App-Seiten liegen unter app/(app), öffentliche direkt unter app/. */
function seiteExistiert(href: string): boolean {
  const pfad = href.split(/[?#]/)[0].replace(/\/+$/, "");
  if (pfad === "") return existsSync("app/page.tsx");
  return [join("app", "(app)", pfad, "page.tsx"), join("app", pfad, "page.tsx")].some((d) => existsSync(d));
}

describe("Wissenssammlung", () => {
  it("hat 140 bis 180 Einträge mit eindeutigen Kennungen, die Website eigene", () => {
    expect(HILFE_WISSEN.length).toBeGreaterThanOrEqual(140);
    expect(HILFE_WISSEN.length).toBeLessThanOrEqual(180);
    expect(HILFE_WISSEN.length).toBe(BEDIENUNG.length + FEHLER.length + PRAXISMANAGER.length);
    expect(WEBSITE_WISSEN.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ALLES.map((e) => e.id)).size).toBe(ALLES.length);
  });
  it("jeder Eintrag: Frage, Antwort in zwei bis vier Sätzen, Menüpfad, Seite, Stichwörter", () => {
    for (const e of ALLES) {
      expect(e.frage.length, e.id).toBeGreaterThan(10);
      const saetze = e.antwort.split(/(?<=[.!?])\s+(?=[„A-ZÄÖÜ])/).length;
      expect(saetze, `${e.id}: ${saetze} Sätze`).toBeGreaterThanOrEqual(2);
      expect(saetze, `${e.id}: ${saetze} Sätze`).toBeLessThanOrEqual(4);
      expect(e.pfad.length, e.id).toBeGreaterThan(3);
      expect(e.href, e.id).toMatch(/^\/[a-z0-9/#-]*(\?[a-z]+=[a-z]+)?$/);
      expect(e.stichwoerter.length, e.id).toBeGreaterThanOrEqual(3);
    }
  });
  it("die Arten sind getrennt: Fehler mit Meldungen, Praxismanager-Einträge, Website nur im Website-Wissen", () => {
    for (const e of FEHLER) {
      expect(e.art, e.id).toBe("fehler");
      expect(e.meldungen?.length ?? 0, e.id).toBeGreaterThan(0);
    }
    for (const e of PRAXISMANAGER) expect(e.art, e.id).toBe("praxismanager");
    for (const e of WEBSITE_WISSEN) expect(e.art, e.id).toBe("website");
    for (const e of HILFE_WISSEN) expect(e.art, e.id).not.toBe("website");
  });
  it("keine Werbewörter, keine Zusagen, keine Gedankenstrich-Einschübe", () => {
    for (const e of ALLES) {
      const t = `${e.frage} ${e.antwort}`;
      expect(t, e.id).not.toMatch(/DSGVO-konform|rechtssicher|garantiert|optimal|\bbeste[nrs]?\b|sinnvoll|empfehlen wir| – | — /i);
      expect(t, e.id).not.toMatch(/Ratenzahlung|Teilzahlung|3D-Modell/i);
    }
  });
  it("der feste Hinweis schließt Abrechnung im Einzelfall, Recht und Medizin aus", () => {
    for (const h of [HILFE_HINWEIS, WEBSITE_HINWEIS]) {
      expect(h).toMatch(/Abrechnung im Einzelfall/);
      expect(h).toMatch(/Recht/);
      expect(h).toMatch(/Medizin/);
    }
  });
  it("jede Seite eines Eintrags gibt es, auch die Seiten-Muster und Sprungmarken", () => {
    for (const e of ALLES) {
      expect(seiteExistiert(e.href), `${e.id}: ${e.href}`).toBe(true);
      for (const s of e.seiten ?? []) expect(seiteExistiert(s), `${e.id}: ${s}`).toBe(true);
      const marke = e.href.split("#")[1];
      if (marke) expect(QUELLTEXT.includes(`id="${marke}"`), `${e.id}: id="${marke}" fehlt`).toBe(true);
    }
  });
  it("jeder Anker eines Eintrags ist bekannt; die Website nutzt nur ihre Abschnitte", () => {
    for (const e of HILFE_WISSEN) if (e.anker) {
      expect(ankerInfo(e.anker), `${e.id}: ${e.anker}`).not.toBeNull();
      expect(e.anker.startsWith("website:"), e.id).toBe(false);
    }
    for (const e of WEBSITE_WISSEN) if (e.anker) expect(e.anker.startsWith("website:") && ankerInfo(e.anker) !== null, `${e.id}: ${e.anker}`).toBe(true);
  });
  it("jede Meldung steht wörtlich im Code der App (Schutz gegen Abweichung)", () => {
    for (const e of ALLES) for (const m of e.meldungen ?? []) expect(QUELLTEXT.includes(m), `${e.id}: „${m}“ steht nicht im Code`).toBe(true);
  });
  it("alle Seiten der Praxis-App sind abgedeckt (Seite oder Seiten-Muster eines Eintrags)", () => {
    const seiten = lauf(join("app", "(app)")).filter((d) => d.endsWith("page.tsx")).map((d) => `/${d.split(/[\\/]/).slice(2, -1).join("/")}`);
    // /modelle wird nicht beworben und nicht neu verlinkt (docs/GESTALTUNG.md); /anfragen und /betrieb sind nur für das Sorrida-Team.
    const ausgenommen = new Set(["/modelle", "/anfragen", "/betrieb"]);
    const abgedeckt = (s: string) => HILFE_WISSEN.some((e) => e.href.split(/[?#]/)[0] === s || (e.seiten ?? []).includes(s));
    const fehlt = seiten.filter((s) => !ausgenommen.has(s) && !abgedeckt(s));
    expect(seiten.length).toBeGreaterThan(40);
    expect(fehlt, `ohne Eintrag: ${fehlt.join(", ")}`).toEqual([]);
  });
  it("jedes Thema des Praxismanagers hat einen Eintrag mit „Was bedeutet das, was kann ich tun“ und Anker", () => {
    for (const t of PM_THEMEN) {
      const e = PRAXISMANAGER.find((x) => x.anker === `praxismanager:${t}` && x.href === `/praxismanager?thema=${t}`);
      expect(e, t).toBeTruthy();
    }
  });
  it("jeder Eintrag wird mit seiner eigenen Frage als erster gefunden", () => {
    for (const e of HILFE_WISSEN) expect(erster(e.frage, e.nur), e.id).toBe(e.id);
    for (const e of WEBSITE_WISSEN) expect(sucheHilfe(e.frage, WEBSITE_WISSEN)[0]?.eintrag.id, e.id).toBe(e.id);
  });
});

describe("sucheHilfe", () => {
  it.each([
    ["Wie mache ich einen neuen Vorschlag?", "vorschlag-neu"],
    ["Patient neu anlegen", "patient-anlegen"],
    ["Wo kann ich die IBAN eintragen", "bankverbindung"],
    ["Kollegin einladen", "team-einladen"],
    ["zwei faktor einrichten", "zwei-faktor"],
    ["Preisliste importieren", "preisliste"],
    ["Mikrofon geht nicht", "diktat"],
    ["DATEV Export für den Steuerberater", "datev"],
    ["Wer hat das geändert?", "protokoll"],
    ["Kalender von Google verbinden", "kalender"],
    ["Warteliste", "warteliste-eintragen"],
    ["PIN für das Tablet ändern", "empfang-pin"],
    ["KI einschalten", "ki-hilfen"],
    ["Zweigpraxis anlegen", "standorte"],
    ["Patientenliste aus alter Software übernehmen", "patient-import"],
    ["Termin eintragen", "termin-eintragen"],
    ["Rechnung stornieren", "rechnung-stornieren"],
    ["Kontoauszug abgleichen", "bankabgleich"],
    ["Bericht freigeben", "bericht-freigeben"],
    ["Allergie eintragen", "patient-akte"],
    ["Backup-Codes", "backup-codes"],
    ["dunkle Ansicht", "dunkle-ansicht"],
    ["Ausfallquote Praxismanager", "pm-termine"],
  ])("%s → %s", (frage, id) => expect(erster(frage)).toBe(id));

  it("Umlaute ausgeschrieben, Großschreibung, Endungen", () => {
    expect(erster("VORSCHLAEGE NACHFASSEN")).toBe("vorschlag-nachfassen");
    expect(erster("einwilligungen whatsapp")).toBe("patient-einwilligung");
  });
  it("Klienten und Kunden zählen wie Patienten (Wörter der Fächer)", () => {
    expect(erster("Klienten neu anlegen")).toBe("patient-anlegen");
    expect(erster("Kundenliste importieren")).toBe("patient-import");
  });
  it("findet den Import der Patientenliste auch mit dem Wort „importieren“", () => {
    expect(erster("Patienten aus einer Datei importieren")).toBe("patient-import");
    expect(erster("Patientenliste importieren")).toBe("patient-import");
    expect(erster("Preisliste importieren")).toBe("preisliste");
  });
  it("eingefügte Meldungen finden ihren Eintrag", () => {
    for (const e of FEHLER) for (const m of e.meldungen ?? []) {
      if (m.length < 25) continue;
      expect(sucheHilfe(m, HILFE_WISSEN, { anzahl: 3 }).map((t) => t.eintrag.id), `${e.id}: „${m}“`).toContain(e.id);
    }
    expect(erster("Zahlungen und Rechnungen sind für Ihr Konto nicht freigegeben.")).toBe("meldung-zahlungen-nicht-freigegeben");
    expect(erster("Mailversand ist noch nicht eingerichtet (Testmodus). Es wurde nichts verschickt; bitte den Text kopieren.")).toBe("meldung-mail-testmodus");
    expect(erster("angenommen: 1 Platz, 8 Std.; Standorte pflegen für genaue Werte")).toBe("pm-angenommen");
  });
  it("zeigt höchstens drei Einträge, beste zuerst", () => {
    const t = sucheHilfe("Preise ändern", HILFE_WISSEN);
    expect(t.length).toBeGreaterThan(0);
    expect(t.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].punkte).toBeGreaterThanOrEqual(t[i].punkte);
    expect(ids("Preise ändern", 5).length).toBeLessThanOrEqual(5);
  });
  it("blendet Einträge anderer Fächer aus", () => {
    expect(sucheHilfe("Befund diktieren Zahnschema", HILFE_WISSEN, { fach: "andere" }).map((t) => t.eintrag.id)).not.toContain("vorschlag-befund-diktat");
    expect(erster("Befund diktieren Zahnschema", "zahn")).toBe("vorschlag-befund-diktat");
    expect(erster("Preise ändern", "zahn")).toBe("vorschlagspreise");
    expect(erster("Preise ändern", "andere")).toBe("preise");
  });
  it("blendet Einträge aus, für die das Konto kein Recht hat (Behandler ohne Freigabe)", () => {
    const behandler = menueRechte("behandler", false);
    const t = sucheHilfe("DATEV Export für den Steuerberater", HILFE_WISSEN, { rechte: behandler }).map((x) => x.eintrag.id);
    expect(t).not.toContain("datev");
    expect(sucheHilfe("Wer hat das geändert? Protokoll", HILFE_WISSEN, { rechte: behandler }).map((x) => x.eintrag.id)).not.toContain("protokoll");
    expect(sucheHilfe("Kollegin einladen", HILFE_WISSEN, { rechte: behandler }).map((x) => x.eintrag.id)).not.toContain("team-einladen");
    // Warum etwas fehlt, erfährt auch, wer es nicht sehen darf.
    expect(erster("Warum sehe ich die Analyse nicht?")).toBe("analyse");
    expect(sucheHilfe("Zahlungen nicht freigegeben", HILFE_WISSEN, { rechte: behandler })[0]?.eintrag.id).toBe("meldung-zahlungen-nicht-freigegeben");
    const admin = menueRechte("admin");
    expect(sichtbareHilfe(HILFE_WISSEN, { rechte: admin }).length).toBe(HILFE_WISSEN.length);
    expect(sichtbareHilfe(HILFE_WISSEN, { rechte: behandler }).length).toBeLessThan(HILFE_WISSEN.length);
  });
  it("Einträge der geöffneten Seite bekommen einen Aufschlag", () => {
    const ohne = sucheHilfe("Link senden", HILFE_WISSEN, { anzahl: 5 });
    const mit = sucheHilfe("Link senden", HILFE_WISSEN, { anzahl: 5, seite: "/proposals/clx123abc" });
    const p = (l: typeof ohne, id: string) => l.find((t) => t.eintrag.id === id)?.punkte ?? 0;
    expect(p(mit, "vorschlag-link")).toBeGreaterThan(p(ohne, "vorschlag-link"));
  });
  it("findet nichts zu Fragen außerhalb der Bedienung und zu leeren Fragen", () => {
    expect(sucheHilfe("", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("wie ist das?", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("Wetter morgen in Hamburg", HILFE_WISSEN)).toEqual([]);
    expect(sucheHilfe("Xylophon Quantenphysik", HILFE_WISSEN)).toEqual([]);
  });
});

describe("Seite, Platzhalter und Meldungen", () => {
  it("seitePasst: dynamische Teile passen auf jede Kennung, feste nicht", () => {
    expect(seitePasst("/patients/clx9", "/patients/[id]")).toBe(true);
    expect(seitePasst("/patients/clx9?sel=1", "/patients/[id]")).toBe(true);
    expect(seitePasst("/patients", "/patients/[id]")).toBe(false);
    expect(seitePasst("/patients/new/x", "/patients/[id]")).toBe(false);
    expect(seitePasst("/zahlungen/", "/zahlungen")).toBe(true);
  });
  it("Fragen zu dieser Seite: Einträge der Seite, Bedienung zuerst, höchstens vier", () => {
    const z = fragenZurSeite("/zahlungen", HILFE_WISSEN, { rechte: menueRechte("admin") });
    expect(z.length).toBeGreaterThan(0);
    expect(z.length).toBeLessThanOrEqual(4);
    expect(z.every((e) => (e.seiten ?? []).includes("/zahlungen"))).toBe(true);
    expect(z[0].art ?? "bedienung").toBe("bedienung");
    expect(fragenZurSeite("/patients/abc", HILFE_WISSEN).map((e) => e.id)).toContain("patient-einwilligung");
    expect(fragenZurSeite("/zahlungen", HILFE_WISSEN, { rechte: menueRechte("behandler", false) })).toEqual([]);
  });
  it("{P} und {A} werden mit den Wörtern des Fachs aufgelöst", () => {
    const e = HILFE_WISSEN.find((x) => x.id === "behandlung-abschliessen") as HilfeEintrag;
    expect(e.pfad).toContain("{P}");
    const t = hilfeText(e, { personPl: "Klienten", abschluss: "Sitzung" });
    expect(t.pfad).toBe("Klienten → Sitzung abschließen");
    expect(t.antwort).toContain("„Sitzung abschließen“");
    expect(hilfeText(e).pfad).toBe("Patienten → Behandlung abschließen");
    for (const x of ALLES) expect(`${hilfeText(x).frage} ${hilfeText(x).antwort} ${hilfeText(x).pfad}`, x.id).not.toMatch(/\{[A-Z]\}/);
  });
  it("erkennt Meldungen in Meldungsfeldern und im Text der Seite, gibt nur Texte der Sammlung zurück", () => {
    const r = meldungenErkennen({ alarme: ["Fehler: Zahlungen und Rechnungen sind für Ihr Konto nicht freigegeben. Frau Müller"], seite: "" }, HILFE_WISSEN);
    expect(r.map((m) => m.eintrag.id)).toEqual(["meldung-zahlungen-nicht-freigegeben"]);
    expect(r[0].meldung).toBe("Zahlungen und Rechnungen sind für Ihr Konto nicht freigegeben.");
    expect(JSON.stringify(r)).not.toContain("Müller");
    const seite = meldungenErkennen({ alarme: [], seite: "Übersicht Für heute ist in Sorrida kein Termin eingetragen. Termin eintragen" }, HILFE_WISSEN);
    expect(seite.map((m) => m.eintrag.id)).toContain("pm-keine-termine");
    // Kurze Meldungen zählen nur in Meldungsfeldern, nicht im übrigen Text.
    expect(meldungenErkennen({ alarme: [], seite: "Nicht angemeldet" }, HILFE_WISSEN)).toEqual([]);
    expect(meldungenErkennen({ alarme: ["Nicht angemeldet"] }, HILFE_WISSEN).map((m) => m.eintrag.id)).toEqual(["meldung-nicht-angemeldet"]);
    expect(meldungenErkennen({ alarme: [] }, HILFE_WISSEN)).toEqual([]);
  });
});
