import { describe, expect, it } from "vitest";
import {
  STANDORT_HINWEIS, darfStandort, gewaehlterStandort, istEingeschraenkt, sichtbareStandorte, standortFuerNeu, standortRecht, standortZuordnungSchema, terminFilter, verliertEinschraenkung, zuordnungPruefen,
} from "@/lib/standortRechte";

const PRAXIS = ["haupt", "nord", "sued"];
const ORTE = PRAXIS.map((id) => ({ id, name: id }));

describe("standortRecht", () => {
  it("leer = alle Standorte", () => {
    expect(standortRecht("staff", [])).toBeNull();
    expect(standortRecht("behandler", [])).toBeNull();
    expect(istEingeschraenkt(standortRecht("staff", []))).toBe(false);
  });
  it("mit Zuordnung nur diese Standorte, ohne Doppelte", () => {
    expect(standortRecht("staff", ["nord"])).toEqual(["nord"]);
    expect(standortRecht("behandler", ["nord", "sued", "nord"])).toEqual(["nord", "sued"]);
  });
  it("die Geschäftsführung ist nie eingeschränkt", () => {
    expect(standortRecht("admin", ["nord"])).toBeNull();
  });
  it("Zuordnungen zu fremden oder entfernten Standorten zählen nicht", () => {
    expect(standortRecht("staff", ["nord", "fremd"], PRAXIS)).toEqual(["nord"]);
    expect(standortRecht("staff", ["fremd"], PRAXIS)).toBeNull();
  });
  it("unbekannte Rolle wird wie eine eingeschränkte Rolle behandelt", () => {
    expect(standortRecht("irgendwas", ["nord"])).toEqual(["nord"]);
    expect(standortRecht(undefined, ["nord"])).toEqual(["nord"]);
  });
});

describe("Standort-Filter für Termine", () => {
  it("ohne Einschränkung: kein Filter, auch Termine ohne Standort", () => {
    expect(terminFilter(null)).toEqual({});
    expect(darfStandort(null, "nord")).toBe(true);
    expect(darfStandort(null, null)).toBe(true);
  });
  it("mit Einschränkung: nur die eigenen Standorte", () => {
    expect(terminFilter(["nord", "sued"])).toEqual({ locationId: { in: ["nord", "sued"] } });
    expect(darfStandort(["nord"], "nord")).toBe(true);
    expect(darfStandort(["nord"], "sued")).toBe(false);
  });
  it("mit Einschränkung: Termine ohne Standort sind nicht sichtbar", () => {
    expect(darfStandort(["nord"], null)).toBe(false);
    expect(darfStandort(["nord"], undefined)).toBe(false);
    expect(darfStandort(["nord"], "")).toBe(false);
  });
  it("leere Liste (unbekanntes Konto) sieht nichts", () => {
    expect(terminFilter([])).toEqual({ locationId: { in: [] } });
    expect(darfStandort([], "nord")).toBe(false);
  });
  it("gewählter Standort der Seite schränkt weiter ein – aber nie über das Recht hinaus", () => {
    expect(terminFilter(null, "nord")).toEqual({ locationId: "nord" });
    expect(terminFilter(["nord", "sued"], "nord")).toEqual({ locationId: "nord" });
    expect(terminFilter(["nord"], "sued")).toEqual({ locationId: { in: [] } });
    expect(terminFilter(["nord"], null)).toEqual({ locationId: { in: ["nord"] } });
  });
});

describe("Standorte in Filtern und Auswertung", () => {
  it("zeigt ohne Einschränkung alle, sonst nur die eigenen", () => {
    expect(sichtbareStandorte(null, ORTE).map((s) => s.id)).toEqual(PRAXIS);
    expect(sichtbareStandorte(["sued"], ORTE).map((s) => s.id)).toEqual(["sued"]);
    expect(sichtbareStandorte([], ORTE)).toEqual([]);
  });
  it("nimmt den Filter aus der Adresse nur an, wenn er erlaubt ist", () => {
    expect(gewaehlterStandort(null, "nord", ORTE)).toBe("nord");
    expect(gewaehlterStandort(["nord"], "nord", ORTE)).toBe("nord");
    expect(gewaehlterStandort(["nord"], "sued", ORTE)).toBeNull();
    expect(gewaehlterStandort(null, "gibtsnicht", ORTE)).toBeNull();
    expect(gewaehlterStandort(null, undefined, ORTE)).toBeNull();
    expect(gewaehlterStandort(null, "", ORTE)).toBeNull();
  });
  it("ein fremder Standort in der Adresse zeigt nicht mehr als erlaubt", () => {
    const recht = ["nord"];
    const ort = gewaehlterStandort(recht, "sued", ORTE);
    expect(terminFilter(recht, ort)).toEqual({ locationId: { in: ["nord"] } });
  });
});

describe("Termin eintragen", () => {
  it("ohne Einschränkung wie angegeben, auch ohne Standort", () => {
    expect(standortFuerNeu(null, "nord")).toEqual({ ok: true, locationId: "nord" });
    expect(standortFuerNeu(null, null)).toEqual({ ok: true, locationId: null });
    expect(standortFuerNeu(null, "")).toEqual({ ok: true, locationId: null });
  });
  it("mit Einschränkung nur an eigenen Standorten", () => {
    expect(standortFuerNeu(["nord", "sued"], "sued")).toEqual({ ok: true, locationId: "sued" });
    expect(standortFuerNeu(["nord"], "sued")).toMatchObject({ ok: false });
  });
  it("setzt den einzigen eigenen Standort ein, wenn keiner gewählt ist", () => {
    expect(standortFuerNeu(["nord"], null)).toEqual({ ok: true, locationId: "nord" });
  });
  it("verlangt bei mehreren eigenen Standorten eine Auswahl", () => {
    const r = standortFuerNeu(["nord", "sued"], undefined);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.grund).toMatch(/Standorte/);
  });
});

describe("Zuordnung in den Team-Einstellungen", () => {
  it("nimmt nur Standorte der eigenen Praxis an", () => {
    expect(zuordnungPruefen(["nord", "nord", "sued"], PRAXIS)).toEqual({ ok: true, ids: ["nord", "sued"] });
    expect(zuordnungPruefen([], PRAXIS)).toEqual({ ok: true, ids: [] });
    expect(zuordnungPruefen(["nord", "fremd"], PRAXIS)).toEqual({ ok: false, grund: "Standort nicht gefunden" });
  });
  it("prüft die Eingabe", () => {
    expect(standortZuordnungSchema.safeParse({ standorte: ["a", "b"] }).success).toBe(true);
    expect(standortZuordnungSchema.safeParse({ standorte: [] }).success).toBe(true);
    expect(standortZuordnungSchema.safeParse({ standorte: "a" }).success).toBe(false);
    expect(standortZuordnungSchema.safeParse({ standorte: [""] }).success).toBe(false);
    expect(standortZuordnungSchema.safeParse({}).success).toBe(false);
  });
  it("erkennt Konten, die beim Entfernen eines Standorts alle Standorte sähen", () => {
    const konten = [
      { name: "A", standortIds: ["nord"] },
      { name: "B", standortIds: ["nord", "sued"] },
      { name: "C", standortIds: [] },
      { name: "D", standortIds: ["sued"] },
    ];
    expect(verliertEinschraenkung(konten, "nord").map((k) => k.name)).toEqual(["A"]);
    expect(verliertEinschraenkung(konten, "haupt")).toEqual([]);
  });
  it("sagt im Einstellungstext ehrlich, dass Patienten praxisweit sichtbar bleiben", () => {
    expect(STANDORT_HINWEIS).toMatch(/Patienten, Vorschläge und Berichte bleiben für alle in der Praxis sichtbar/);
    expect(STANDORT_HINWEIS).toMatch(/Ohne Zuordnung gelten alle Standorte/);
  });
});
