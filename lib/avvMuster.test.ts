// Das AVV-Muster sagt nur zu, was gebaut ist oder was der Betreiber von Hand leistet (docs/BETRIEB.md, Abschnitt 11).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLLEN, ROLLEN_LABEL } from "./rollen";

const seite = readFileSync(join(process.cwd(), "app/avv/page.tsx"), "utf8").replace(/\s+/g, " ");

describe("AVV-Muster", () => {
  it("§ 8: Zugriffe werden schriftlich festgehalten und auf Anfrage bereitgestellt (keine Ansicht in der Anwendung)", () => {
    expect(seite).toMatch(/schriftlich fest und stellt der Praxis die Aufzeichnung auf Anfrage bereit/);
    expect(seite).not.toMatch(/die Praxis kann diese Aufzeichnung einsehen/);
  });

  it("Anlage 1 nennt die Rollen, die es gibt, und die Rechte je Standort", () => {
    for (const r of ROLLEN) expect(seite, r).toContain(ROLLEN_LABEL[r]);
    expect(seite).toMatch(/Rechte je Standort/);
    expect(seite).not.toMatch(/Rollen Praxisleitung und Team/);
  });

  it("Kalender: beide Richtungen stehen im Text", () => {
    expect(seite).toMatch(/ruft ihr Kalenderanbieter die Termine ohne Patientennamen ab/);
    expect(seite).toMatch(/ruft Sorrida ihn regelmäßig ab und speichert nur die belegten Zeiten, keine Bezeichnungen/);
  });

  it("das Betriebshandbuch beschreibt, was davon Handarbeit ist", () => {
    const betrieb = readFileSync(join(process.cwd(), "docs/BETRIEB.md"), "utf8");
    expect(betrieb).toMatch(/Zugriffe auf Daten einer Praxis \(§ 8\)/);
    expect(betrieb).toMatch(/Vertragsende: Export und Löschung \(§ 10\)/);
  });
});
