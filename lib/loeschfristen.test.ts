import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOESCHFRISTEN, anfragenFaellig, stichtag, zugesagteTage, type FristId } from "./loeschfristen";
describe("Löschfristen", () => {
  it("rechnet Stichtage", () => {
    const now = new Date("2026-11-02T00:00:00Z");
    // Zusage 30 Tage, gerechnet wird mit 29 (der Lauf kommt nur einmal in der Nacht).
    expect(stichtag("token", now).toISOString().slice(0, 10)).toBe("2026-10-04");
    expect(stichtag("protokoll", now).getUTCFullYear()).toBe(2023);
  });
  it("Anfragen der Website: höchstens 12 Monate nach Eingang, auch wenn sie nie erledigt wurden", () => {
    const f = LOESCHFRISTEN.find((x) => x.id === "anfragen")!;
    expect(f.tage).toBeLessThanOrEqual(364); // der Lauf kommt nur einmal in der Nacht
    expect(f.frist).toMatch(/12 Monate nach Eingang/);
    expect(f.daten).not.toMatch(/, erledigt$/);
    const now = new Date("2026-11-15T03:17:00Z");
    const eingang = new Date("2025-11-16T12:00:00Z");
    expect(eingang < stichtag("anfragen", now)).toBe(true);
    expect(new Date("2026-06-01T00:00:00Z") < stichtag("anfragen", now)).toBe(false);
    // Der Filter fragt nur nach dem Eingang, nicht nach "erledigt"
    expect(anfragenFaellig(now)).toEqual({ createdAt: { lt: stichtag("anfragen", now) } });
    expect(JSON.stringify(anfragenFaellig(now))).not.toContain("handledAt");
  });
  // Der Löschlauf kommt einmal in 24 Stunden. Was zum Zeitpunkt T entsteht, ist spätestens beim ersten Lauf nach
  // T + tage weg, also spätestens nach tage + 1 Tagen. Das muss innerhalb der zugesagten Tage liegen.
  it("Zusage in Tagen: der nächtliche Lauf hält sie sicher ein (ein Tag Abstand)", () => {
    const TAG = 864e5;
    const inTagen = LOESCHFRISTEN.filter((f) => zugesagteTage(f.id) != null);
    expect(inTagen.map((f) => f.id).sort()).toEqual(["anamnese", "fehlerlog", "leselink", "portal", "terminanfrage", "token", "warteliste"]);
    for (const f of inTagen) {
      const zusage = zugesagteTage(f.id)!;
      expect(f.tage, f.id).toBe(zusage - 1);
      // Schlechtester Fall: Der Lauf war eine Millisekunde vor der Fälligkeit da und kommt erst 24 Stunden später wieder.
      const entstanden = new Date("2026-11-01T03:17:00.000Z");
      const knappDavor = new Date(entstanden.getTime() + f.tage * TAG);
      expect(entstanden < stichtag(f.id, knappDavor), `${f.id}: zu früh gelöscht`).toBe(false);
      const naechsterLauf = new Date(knappDavor.getTime() + TAG);
      expect(entstanden < stichtag(f.id, naechsterLauf), `${f.id}: nicht gelöscht`).toBe(true);
      expect(naechsterLauf.getTime() - entstanden.getTime(), `${f.id}: später als zugesagt`).toBeLessThanOrEqual(zusage * TAG);
    }
  });

  it("die vier Fristen, die Patienten und Besuchern zugesagt sind, rechnen mit 29 Tagen und zeigen 30", () => {
    for (const id of ["terminanfrage", "fehlerlog", "warteliste", "leselink"] as FristId[]) {
      const f = LOESCHFRISTEN.find((x) => x.id === id)!;
      expect(f.tage, id).toBe(29);
      expect(f.frist, id).toMatch(/^30 Tage /);
      expect(zugesagteTage(id), id).toBe(30);
    }
    expect(zugesagteTage("protokoll")).toBeNull();
    expect(zugesagteTage("anfragen")).toBeNull();
  });

  it("die Datenschutzerklärung zeigt die zugesagte Zahl, nicht den Rechenwert", () => {
    const seite = readFileSync(join(process.cwd(), "app/datenschutz/page.tsx"), "utf8");
    expect(seite).toMatch(/const terminanfrageTage = zugesagteTage\("terminanfrage"\)/);
    expect(seite).toMatch(/const fehlerTage = zugesagteTage\("fehlerlog"\)/);
    expect(seite).not.toMatch(/id === "(terminanfrage|fehlerlog|warteliste|leselink)"\)!\.tage/);
  });

  it("Empfangsmodus: Die geparkte Sitzung steht im Katalog, mit der Dauer aus lib/empfang.ts, und der Lauf löscht sie", async () => {
    const { PARKEN_STUNDEN } = await import("./empfang");
    const f = LOESCHFRISTEN.find((x) => x.id === "empfangParkung")!;
    expect(f.frist).toContain(`${PARKEN_STUNDEN} Stunden`);
    expect(f.daten).toMatch(/nur Hashwert/);
    expect(zugesagteTage("empfangParkung")).toBeNull();
    expect(readFileSync(join(process.cwd(), "lib/aufraeumen.ts"), "utf8")).toMatch(/empfangParkung\.deleteMany\(\{ where: \{ expiresAt: \{ lt: now \} \} \}\)/);
  });

  it("jede Frist hat Grund und Dauer", () => {
    for (const f of LOESCHFRISTEN) { expect(f.tage).toBeGreaterThan(0); expect(f.grund.length).toBeGreaterThan(5); }
  });
});
