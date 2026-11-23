import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDental, istZahnVorschlag } from "@/lib/specialties";
import { resolveMed } from "@/lib/practiceMed";
import { hauptModell, modelleFuerFach } from "@/lib/modelle/fach";
import { abrechnungsStelle, rechnetUeberKv } from "@/lib/abrechnungsarten";
import { importVorgaben } from "@/lib/importVerzeichnisse";
import { hatEbm, hatKvZiffern, quellenFuer } from "@/lib/amtlich/gliederung";
import { terminDokuGeprueft } from "@/lib/billingCheckLoad";
import {
  aufVerordnung, diagnoseHinweis, dokumentBeispiele, fachWoerter, leistungsBeispiel, leistungsBeispielFuer, preisRahmen, systemGruppe,
} from "@/lib/fachprofile";
import { sichtbareSeiten, type SeitenKontext } from "@/lib/suche";
import { menueRechte } from "@/lib/rollen";
import { demoRechnungen } from "@/lib/demoPatient";
import { appStationen } from "@/lib/rundgang";
import { mitGespeichertemFach, mitPraxisFach } from "@/lib/proposalSchema";
import type { ProposalInput } from "@/lib/proposals";
import { entlastungKarten } from "@/components/Entlastung";

// Zahn ist kein stiller Standard: Ohne Fach ist alles neutral, Zahninhalte nur bei fach === "zahn".
// Jede Steuerung wird für zahn und mindestens zwei andere Fächer geprüft (ortho, physio; dazu apotheke, pflege, hebamme).

const lies = (datei: string) => readFileSync(join(process.cwd(), datei), "utf8");

describe("Zahn nur bei fach === „zahn“", () => {
  it("isDental ist streng, istZahnVorschlag kennt den Altbestand ohne fach", () => {
    expect(isDental("zahn")).toBe(true);
    for (const f of ["ortho", "physio", "apotheke", "andere", "", null, undefined]) expect(isDental(f), String(f)).toBe(false);
    // Vorschläge der Zahnmedizin speichern seit jeher kein fach.
    expect(istZahnVorschlag(undefined)).toBe(true);
    expect(istZahnVorschlag("zahn")).toBe(true);
    expect(istZahnVorschlag("ortho")).toBe(false);
    expect(istZahnVorschlag("physio")).toBe(false);
  });

  it("Practice.specialty hat den neutralen Standard „andere“, die Migration ändert nur den Standardwert", () => {
    expect(lies("prisma/schema.prisma")).toMatch(/specialty\s+String\s+@default\("andere"\)/);
    const sql = lies("prisma/migrations/20261118600000_fach_neutral/migration.sql");
    expect(sql).toContain(`ALTER COLUMN "specialty" SET DEFAULT 'andere'`);
    expect(sql).not.toMatch(/\bUPDATE\b/i);
  });

  it("resolveMed ohne Fach gibt „andere“, sonst das Fach", () => {
    expect(resolveMed({}).fach).toBe("andere");
    expect(resolveMed({ specialty: null }).fach).toBe("andere");
    expect(resolveMed({ specialty: "zahn" }).fach).toBe("zahn");
    expect(resolveMed({ specialty: "ortho" }).fach).toBe("ortho");
    expect(resolveMed({ specialty: "physio" }).fach).toBe("physio");
  });

  it("Modelle: Gebiss nur für zahn, ohne Fach der Körper", () => {
    expect(hauptModell("zahn")).toBe("gebiss");
    expect(hauptModell(null)).not.toBe("gebiss");
    expect(modelleFuerFach(undefined).modelle).not.toContain("gebiss");
    expect(modelleFuerFach("ortho").modelle).not.toContain("gebiss");
    expect(modelleFuerFach("physio").modelle).not.toContain("gebiss");
  });

  it("systemGruppe ohne Fach ist ärztlich, nicht zahn", () => {
    expect(systemGruppe(null)).toBe("arzt");
    expect(systemGruppe("zahn")).toBe("zahn");
    expect(systemGruppe("ortho")).toBe("arzt");
    expect(systemGruppe("physio")).toBe("therapie");
  });
});

describe("Abrechnung je Fach", () => {
  it("KV-Bezirk und KV-Ziffern nur bei Vertragsärzten (EBM)", () => {
    expect(rechnetUeberKv("ortho")).toBe(true);
    expect(rechnetUeberKv("hausarzt")).toBe(true);
    expect(rechnetUeberKv("zahn")).toBe(false);
    expect(rechnetUeberKv("physio")).toBe(false);
    expect(rechnetUeberKv("apotheke")).toBe(false);
  });

  it("abrechnungsStelle: KZV, KV, Krankenkasse, Apothekenrechenzentrum, Pflegekasse oder keine", () => {
    expect(abrechnungsStelle("zahn")?.wer).toBe("Ihre KZV");
    expect(abrechnungsStelle("ortho")?.wer).toBe("Ihre KV");
    expect(abrechnungsStelle("physio")?.wer).toMatch(/Krankenkasse/);
    expect(abrechnungsStelle("apotheke")?.wer).toMatch(/Apothekenrechenzentrum/);
    expect(abrechnungsStelle("pflege")?.wer).toMatch(/Pflegekasse/);
    expect(abrechnungsStelle("heilpraktiker")).toBeNull();
    for (const f of ["ortho", "physio", "apotheke", "pflege"]) expect(JSON.stringify(abrechnungsStelle(f)), f).not.toMatch(/KZV/);
    for (const f of ["zahn", "physio", "pflege"]) expect(JSON.stringify(abrechnungsStelle(f)), f).not.toMatch(/\bKV\b/);
  });

  it("Termine ohne Dokumentation prüft nur die Zahnmedizin", () => {
    expect(terminDokuGeprueft("zahn")).toBe(true);
    expect(terminDokuGeprueft("ortho")).toBe(false);
    expect(terminDokuGeprueft("physio")).toBe(false);
    expect(terminDokuGeprueft(null)).toBe(false);
  });

  it("Import bietet nur die Verzeichnisse des Fachs an", () => {
    const ids = (f: string) => importVorgaben(f).verzeichnisse.map(([id]) => id);
    expect(ids("zahn")[0]).toBe("BEMA");
    expect(ids("zahn")).not.toContain("EBM");
    expect(importVorgaben("zahn").kv).toBe(false);
    expect(ids("ortho")[0]).toBe("EBM");
    expect(ids("ortho")).not.toContain("BEMA");
    expect(importVorgaben("ortho").kategorie).toBe("Regionale KV-Ziffern");
    expect(ids("physio")[0]).toBe("HEILMITTEL");
    expect(ids("physio")).not.toContain("EBM");
    expect(ids("physio")).not.toContain("GOZ");
    expect(importVorgaben("physio").kategorie).toBe("Eigene Liste");
    expect(ids("apotheke")[0]).toBe("APO");
  });

  it("Import: Zahn mit GOÄ und BEL II wie im eigenen Katalog, nie EBM", () => {
    const ids = importVorgaben("zahn").verzeichnisse.map(([id]) => id);
    expect(ids).toEqual(["BEMA", "GOZ", "GOAE", "BEL_II", "SONSTIGES"]);
    expect(Object.fromEntries(importVorgaben("zahn").verzeichnisse).GOAE).toBe("GOÄ (privat)");
  });

  it("Import: HZV, DMP und Impfleistung nur hausärztlich; ohne Kassenvertrag „Eigene Liste“", () => {
    const name = (f: string) => Object.fromEntries(importVorgaben(f).verzeichnisse).SONSTIGES;
    expect(name("hausarzt")).toBe("Sonder- und Selektivverträge (HZV, DMP …)");
    expect(name("kardio")).toBe("Sonder- und Selektivverträge");
    expect(name("psych")).toBe("Sonder- und Selektivverträge");
    expect(name("zahn")).toBe("Sonder- und Selektivverträge");
    expect(name("heilpraktiker")).toBe("Eigene Liste");
    expect(name("optik")).toBe("Eigene Liste");
    expect(name("aesthetik")).toBe("Eigene Liste");
    expect(importVorgaben("hausarzt").beispiel).toContain("Impfleistung");
    expect(importVorgaben("kardio").beispiel).not.toContain("Impf");
    expect(importVorgaben("heilpraktiker").vertraege).toBe(false);
    expect(importVorgaben("physio").vertraege).toBe(true);
  });

  it("KV-Ziffern und EBM nach den Verzeichnissen des Fachs: Klinik ja, Zahn, Physio und Ästhetik nein", () => {
    for (const f of ["klinik", "hausarzt"]) {
      expect(hatKvZiffern(f), f).toBe(true);
      expect(hatEbm(f), f).toBe(true);
      expect(importVorgaben(f).kv, f).toBe(true);
      expect(importVorgaben(f).verzeichnisse.map(([id]) => id), f).toContain("EBM");
    }
    for (const f of ["zahn", "physio", "aesthetik"]) {
      expect(hatKvZiffern(f), f).toBe(false);
      expect(hatEbm(f), f).toBe(false);
      expect(importVorgaben(f).verzeichnisse.map(([id]) => id), f).not.toContain("EBM");
    }
  });

  it("Quellenzeile nennt nur die Verzeichnisse, die das Fach sieht", () => {
    const zahn = quellenFuer(["BEMA", "GOZ"], 12.7404).join(" ");
    expect(zahn).toContain("BEMA (KZBV)");
    expect(zahn).toContain("Punktwert Ihrer KZV");
    expect(zahn).not.toContain("EBM");
    const physio = quellenFuer(["HEILMITTEL"], 12.7404).join(" ");
    expect(physio).toContain("Heilmittel");
    expect(physio).not.toMatch(/BEMA|KZV|KZBV|EBM/);
    const ortho = quellenFuer(["EBM", "GOAE", "UVGOAE"], 12.7404).join(" ");
    expect(ortho).toContain("EBM");
    expect(ortho).not.toMatch(/BEMA|KZV|GOZ/);
  });

  it("Beispielpreise: GOÄ nur bei Ärzten", () => {
    expect(preisRahmen("ortho")).toContain("GOÄ");
    expect(preisRahmen("physio")).not.toContain("GOÄ");
    expect(preisRahmen("apotheke")).not.toContain("GOÄ");
    expect(preisRahmen("heilpraktiker")).toContain("GebüH");
  });
});

describe("Wörter und Beispiele je Fach", () => {
  it("fachWoerter: Person und Abschluss des Fachs", () => {
    expect(fachWoerter("zahn").person).toBe("Patient");
    expect(fachWoerter("ortho").vorschlaege).toBe("Behandlungsvorschläge");
    expect(fachWoerter("physio").zurPerson).toBe("zum Patienten");
    expect(fachWoerter("apotheke").person).toBe("Kunde");
    expect(fachWoerter("apotheke").vorschlag).toBe("Beratungsvorschlag");
    expect(fachWoerter("apotheke").schreiben).toBe("Schreiben");
    expect(fachWoerter("hebamme").derPerson).toBe("Die Frau");
    expect(fachWoerter("hebamme").vonPerson).toBe("von der Frau");
    expect(fachWoerter("pflege").naechsterAbschluss).toBe("Nächsten Einsatz");
    expect(fachWoerter("gyn").mitPerson).toBe("mit der Patientin");
  });

  it("Beispiel für eine eigene Leistung: Bleaching nur bei zahn", () => {
    expect(leistungsBeispiel(systemGruppe("zahn"))).toBe("Bleaching");
    expect(leistungsBeispiel(systemGruppe("ortho"))).not.toBe("Bleaching");
    expect(leistungsBeispiel(systemGruppe("physio"))).not.toBe("Bleaching");
    expect(leistungsBeispiel(systemGruppe("apotheke"))).not.toBe("Bleaching");
    // Reiseimpfberatung nur hausärztlich; andere Ärzte ein Beispiel ihres Fachs oder „Beratungsgespräch“.
    expect(leistungsBeispielFuer("hausarzt")).toBe("Reiseimpfberatung");
    for (const f of ["kardio", "psych", "aesthetik", "klinik", "zahn"]) expect(leistungsBeispielFuer(f), f).not.toBe("Reiseimpfberatung");
    expect(leistungsBeispielFuer("zahn")).toBe("Bleaching");
    expect(leistungsBeispielFuer("psych")).toBe("Beratungsgespräch");
    expect(leistungsBeispielFuer("klinik")).toBe("Wahlleistung Ein- oder Zweibettzimmer");
    expect(leistungsBeispielFuer(null)).toBe("Beratungsgespräch");
  });

  it("Dokumente in der Akte: keine Röntgenbilder und Überweisungen bei Apotheke und Optik", () => {
    expect(dokumentBeispiele("zahn")).toContain("Röntgenbilder");
    expect(dokumentBeispiele("ortho")).toContain("Überweisungen");
    expect(dokumentBeispiele("physio")).toContain("Verordnungen");
    expect(dokumentBeispiele("psych")).not.toMatch(/Röntgen|Überweisung/);
    for (const f of ["apotheke", "optik"]) expect(dokumentBeispiele(f), f).not.toMatch(/Röntgen|Überweisung/);
  });

  it("Diagnose-Hinweis: Ärzte, Verordnung bei Heilmitteln, nichts bei Apotheke", () => {
    expect(diagnoseHinweis("zahn")).toContain("Zahnärztin");
    expect(diagnoseHinweis("ortho")).toBe("Die Diagnose stellt die Ärztin oder der Arzt.");
    expect(diagnoseHinweis("physio")).toContain("Verordnung");
    expect(diagnoseHinweis("heilpraktiker")).toBe("Die Diagnose stellen Sie selbst.");
    expect(diagnoseHinweis("apotheke")).toBe("");
  });

  it("Bericht an die verordnende Praxis bei Heilmitteln, Pflege und Apotheke, sonst an die überweisende", () => {
    expect(aufVerordnung("zahn")).toBe(false);
    expect(aufVerordnung("ortho")).toBe(false);
    expect(aufVerordnung("physio")).toBe(true);
    expect(aufVerordnung("pflege")).toBe(true);
    expect(aufVerordnung("apotheke")).toBe(true);
  });
});

describe("Leistungslexikon und Suche nur in der Zahnmedizin", () => {
  const kontext = (zahn: boolean, personPl = "Patienten"): SeitenKontext => ({ rechte: menueRechte("admin"), zahn, personPl, abschluss: "Behandlung" });

  it("Lexikon und Zahn-Stichwörter erscheinen nur bei zahn", () => {
    const zahn = sichtbareSeiten(kontext(true));
    expect(zahn.some((s) => s.href === "/settings/lexikon")).toBe(true);
    expect(zahn.find((s) => s.href === "/modelle")?.stichworte).toContain("gebiss");
    for (const [name, k] of [["ortho", kontext(false)], ["physio", kontext(false)], ["apotheke", kontext(false, "Kunden")]] as const) {
      const seiten = sichtbareSeiten(k);
      expect(seiten.some((s) => s.href === "/settings/lexikon"), name).toBe(false);
      expect(seiten.some((s) => s.href === "/settings/billing"), name).toBe(false);
      expect(seiten.find((s) => s.href === "/modelle")?.stichworte, name).not.toContain("gebiss");
    }
  });

  it("„Gebiss“ findet die Modelle nur in Fächern mit Gebiss-Modell", () => {
    const gebiss = (fach: string) => modelleFuerFach(fach).modelle.includes("gebiss");
    const stich = (fach: string) => sichtbareSeiten({ ...kontext(fach === "zahn"), gebiss: gebiss(fach) }).find((s) => s.href === "/modelle")?.stichworte;
    expect(stich("zahn")).toContain("gebiss");
    // Kinder- und Jugendmedizin zeigt das Gebiss (U-Untersuchungen), ohne Lexikon und Punktwerte
    expect(stich("kinder")).toContain("gebiss");
    expect(sichtbareSeiten({ ...kontext(false), gebiss: true }).some((s) => s.href === "/settings/lexikon")).toBe(false);
    for (const fach of ["ortho", "physio", "hausarzt", "apotheke", "hebamme"]) expect(stich(fach), fach).not.toContain("gebiss");
  });

  it("der Rundgang nennt das Lexikon nur bei zahn", () => {
    // Der Lexikon-Hinweis steht im Rundgang für Mitarbeitende ohne Einstellungsrecht.
    const rechte = { zahlungen: true, analyse: true, einstellungen: false };
    const text = (zahn: boolean, personPl: string, abschluss: string) => appStationen({ rechte, personPl, abschluss, zahn }).flatMap((s) => s.text).join(" ");
    expect(text(true, "Patienten", "Behandlung")).toContain("Leistungslexikon");
    expect(text(false, "Patienten", "Behandlung")).not.toContain("Leistungslexikon");
    expect(text(false, "Kunden", "Beratung")).not.toContain("Leistungslexikon");
    expect(text(false, "Klienten", "Einsatz")).not.toContain("{lexikon}");
  });

  it("Lexikon-, Punktwert- und Vorschlagspreis-Seite leiten außerhalb der Zahnmedizin weiter", () => {
    for (const datei of ["app/(app)/settings/lexikon/page.tsx", "app/(app)/settings/billing/page.tsx", "app/(app)/settings/proposals/page.tsx"]) {
      const text = lies(datei);
      expect(text, datei).toMatch(/isDental\(/);
      expect(text, datei).toMatch(/redirect\(/);
    }
  });
});

describe("Vorschläge: das Fach kommt vom Server", () => {
  // Die Funktionen prüfen nur das Fach; der Rest des Vorschlags bleibt unverändert.
  const roh = { befunde: [], fach: "zahn" } as unknown as ProposalInput;

  it("Neuer Vorschlag: Fach der Praxis, zahn ohne fach wie bisher", () => {
    expect(mitPraxisFach(roh, "zahn").fach).toBeUndefined();
    expect(mitPraxisFach(roh, "ortho").fach).toBe("ortho");
    expect(mitPraxisFach(roh, "physio").fach).toBe("physio");
    // Ohne gültiges Fach kein stiller Zahnvorschlag
    expect(mitPraxisFach({ ...roh, fach: undefined }, null).fach).toBe("andere");
    expect(mitPraxisFach(roh, "unbekannt").fach).toBe("andere");
  });

  it("Bearbeiten: gespeichertes Fach bleibt, der Browser ändert es nicht", () => {
    expect(mitGespeichertemFach(roh, { fach: "ortho" }).fach).toBe("ortho");
    expect(mitGespeichertemFach(roh, { fach: "physio" }).fach).toBe("physio");
    expect(mitGespeichertemFach({ ...roh, fach: "ortho" }, {}).fach).toBeUndefined(); // Zahn-Altbestand bleibt Zahn
    expect(mitGespeichertemFach(roh, { fach: "erfunden" }).fach).toBeUndefined();
  });
});

describe("Website: Karten je Fachgruppe", () => {
  const text = (g?: Parameters<typeof entlastungKarten>[0]) => JSON.stringify(entlastungKarten(g));

  it("IGeL nur bei Ärzten, VDDS-media nur bei Zahnärzten, GDT bei Ärzten", () => {
    expect(text("zahn")).not.toContain("IGeL");
    expect(text("zahn")).toContain("VDDS-media");
    expect(text("zahn")).not.toContain("GDT");
    expect(text("arzt")).toContain("IGeL");
    expect(text("arzt")).toContain("GDT");
    expect(text("arzt")).not.toContain("VDDS");
    expect(text("therapie")).not.toMatch(/IGeL|VDDS|GDT|Ärztinnen und Ärzte|KBV/);
    expect(text("andere")).not.toMatch(/IGeL|VDDS|GDT|Ärztinnen und Ärzte|KBV/);
  });

  it("Startseite ohne IGeL-Karte, aber mit beiden Schnittstellen", () => {
    expect(text()).not.toContain("IGeL");
    expect(text()).toContain("GDT oder VDDS-media");
  });

  it("Häufige Fragen: Zahnmedizin bekommt die Regelversorgung statt des IGeL-Monitors", () => {
    const faq = lies("components/PraxisFaq.tsx");
    const zahnTeil = faq.slice(faq.indexOf(": dental\n          ?"), faq.indexOf("IGeL-Monitors"));
    expect(zahnTeil).toContain("Regelversorgung");
  });
});

describe("Beispielrechnungen der Patienten-Demo je Fach", () => {
  it("Zahn mit Zahnleistungen, Ärzte mit GOÄ, sonst ohne GOÄ", () => {
    expect(demoRechnungen("zahn")).toEqual({ offen: "Mehrkosten Füllung (frühere Behandlung)", bezahlt: "Professionelle Zahnreinigung" });
    expect(demoRechnungen("ortho").offen).toBe("Privatleistung nach GOÄ (frühere Behandlung)");
    expect(demoRechnungen("hausarzt").bezahlt).toBe("Vorsorgeuntersuchung (Privatleistung)");
    expect(demoRechnungen("physio")).toEqual({ offen: "Selbstzahlerleistung (früherer Termin)", bezahlt: "Behandlung (Privatleistung)" });
    expect(demoRechnungen("apotheke").bezahlt).toBe("Beratung (Privatleistung)");
    expect(demoRechnungen("pflege").bezahlt).toBe("Einsatz (Privatleistung)");
    for (const fach of ["physio", "apotheke", "pflege", "hebamme", "optik", "heilpraktiker"]) {
      const t = demoRechnungen(fach);
      expect(`${t.offen} ${t.bezahlt}`, fach).not.toMatch(/GOÄ|Zahn|Füllung/);
      // preparePatientDemo erkennt die vorbereitete Demo an „(frühere“
      expect(t.offen, fach).toContain("(frühere");
    }
  });
});
