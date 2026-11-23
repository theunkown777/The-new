import { describe, expect, it } from "vitest";
import { journey } from "@/lib/journey";

const now = new Date(2026, 10, 1, 12);
const d = (days: number) => new Date(now.getTime() + days * 86400000);

describe("journey", () => {
  it("ohne Vorschlag: Station Gespräch", () => {
    expect(journey({}, now)).toMatchObject({ erreicht: 0, aktuell: 0 });
    expect(journey({ anamnesisSubmitted: true }, now).praxis.tone).toBe("aktiv");
  });
  it("Vorschlag ohne Link → Link senden", () => {
    expect(journey({ proposal: { status: "ENTWURF" } }, now)).toMatchObject({ erreicht: 1, praxis: { text: expect.stringContaining("Link senden") } });
  });
  it("Link lange ungeöffnet → Achtung", () => {
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-5) } }, now).praxis.tone).toBe("achtung");
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-1) } }, now).praxis.tone).toBe("warten");
  });
  it("Rückmeldung → Entscheidung, nach 2 Tagen Achtung", () => {
    const j = journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-5), patientResponse: "RUECKRUF", patientRespondedAt: d(-3) } }, now);
    expect(j).toMatchObject({ erreicht: 3, aktuell: 3, praxis: { tone: "achtung" } });
  });
  it("angenommen: Rechnung erstellen, offen, überfällig, bezahlt", () => {
    const p = { status: "ANGENOMMEN", eigenanteilCent: 5000 };
    expect(journey({ proposal: p }, now).praxis.text).toContain("Rechnung");
    expect(journey({ proposal: p, invoices: [{ status: "OFFEN", dueDate: d(5) }] }, now).praxis.tone).toBe("warten");
    expect(journey({ proposal: p, invoices: [{ status: "OFFEN", dueDate: d(-5) }] }, now).praxis.tone).toBe("achtung");
    expect(journey({ proposal: p, invoices: [{ status: "BEZAHLT", dueDate: d(-5) }] }, now)).toMatchObject({ erreicht: 5, aktuell: null });
    expect(journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 0 } }, now).erreicht).toBe(5);
  });
  it("digitales Einverständnis → Vereinbart erreicht", () => {
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-2), patientResponse: "INTERESSE", agreedAt: d(-1) } }, now)).toMatchObject({ erreicht: 4, aktuell: 4 });
  });
  it("abgelehnt", () => {
    expect(journey({ proposal: { status: "ABGELEHNT" } }, now)).toMatchObject({ abgelehnt: true, aktuell: null });
  });
});

// Was der Patient im Portal zum Stand liest, beschreibt den Stand. Es verspricht kein Handeln der Praxis:
// Gebaut ist nur ein Eintrag bzw. eine Aufgabe für die Praxis („Die Praxis plant Ihren Termin“ wäre eine Zusage).
describe("Patiententexte des Behandlungswegs versprechen kein Handeln der Praxis", () => {
  const lies = async (datei: string) => (await import("node:fs")).readFileSync((await import("node:path")).join(process.cwd(), datei), "utf8");
  const ZUSAGE_DE = /Praxis (plant|meldet|ruft|schickt|sendet|erstellt|prüft|kümmert|bestätigt)|meldet sich|\bfolgt\b|wird geprüft|ruft Sie/i;
  const ZUSAGE_FREMD = /will (schedule|follow|get back|contact|call|send)|get in touch|contact you|iletişime geç|gönderilecek|planlıyor|skontaktuje|zaplanuje|zostanie przesłan|свяжутся|свяжется|планирует|будет выслан|зв.яжуться|зв.яжеться|планує|буде надіслано|ستتواصل|تحدّد موعدكم|ستصلكم/i;

  it("jeder Satz für Patienten in lib/journey.ts", async () => {
    const quelle = await lies("lib/journey.ts");
    const saetze = [...quelle.matchAll(/patient: "([^"]+)"/g)].map((m) => m[1]);
    expect(saetze.length).toBeGreaterThanOrEqual(10);
    for (const s of saetze) expect(s, s).not.toMatch(ZUSAGE_DE);
    expect(saetze).toContain("Danke für Ihr Einverständnis. Es ist bei der Praxis angekommen.");
  });

  it("jeder dieser Sätze hat seine Übersetzung in allen sechs Sprachen, ebenfalls ohne Zusage", async () => {
    const quelle = await lies("lib/journey.ts");
    const portal = await lies("lib/portalI18n.ts");
    const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const s of new Set([...quelle.matchAll(/patient: "([^"]+)"/g)].map((m) => m[1]))) {
      const stellen = [...portal.matchAll(new RegExp(`"${esc(s)}": "([^"]+)"`, "g"))].map((m) => m[1]);
      expect(stellen.length, s).toBe(6);
      for (const t of stellen) expect(t, `${s} → ${t}`).not.toMatch(ZUSAGE_FREMD);
    }
    // Bestätigung der Ratenanfrage (zurzeit unsichtbar, lib/installments.ts): ebenfalls ohne „meldet sich“.
    for (const m of portal.matchAll(/installmentsDone: "([^"]+)"/g)) {
      expect(m[1]).not.toMatch(ZUSAGE_DE);
      expect(m[1]).not.toMatch(ZUSAGE_FREMD);
    }
  });

  it("Buchungsseite für neue Patienten: keine Zusage, dass die Praxis sich meldet", async () => {
    const text = (await lies("components/NeupatientTermin.tsx")).replace("Es meldet sich niemand bei Ihnen.", "");
    expect(text).not.toMatch(/meldet sich|Sie meldet/);
  });
});

describe("journey: Ziel von „Als Nächstes“", () => {
  const now = new Date(2026, 10, 1);
  it("führt nur dorthin, wovon der Text spricht", () => {
    expect(journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: now } }, now).ziel).toBe("vorschlag");
    expect(journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 }, invoices: [{ status: "OFFEN", dueDate: now }] }, now).ziel).toBe("rechnungen");
    expect(journey({ proposal: { status: "ABGELEHNT" } }, now).ziel).toBeNull();
    expect(journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 } }, now).ziel).toBeNull();
    expect(journey({}, now).ziel).toBeNull();
    expect(journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 0 } }, now).ziel).toBeNull();
  });
});
