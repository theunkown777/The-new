import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, type ProposalInput } from "./proposals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nachfassListe, nachfassSumme, nachfassText, ungeoeffnetTun, type NachfassQuelle } from "./nachfassen";

const JETZT = new Date("2026-11-13T10:00:00Z");
const vor = (tage: number) => new Date(JETZT.getTime() - tage * 864e5);
const patient = { id: "p1", firstName: "Thomas", lastName: "Beispielmann", phone: null, whatsappConsentAt: null };
const eingabe = (teeth: ProposalInput["teeth"], extra: Partial<ProposalInput["patient"]> = {}): ProposalInput => ({
  teeth,
  globals: {},
  patient: { age: 58, insurance: "GKV", bonusYears: 10, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026, ...extra },
});
const q = (id: string, input: ProposalInput, extra: Partial<NachfassQuelle> = {}): NachfassQuelle => ({
  id, status: "ENTWURF", input, choices: {}, createdAt: vor(10), shareCreatedAt: null, shareExpiresAt: null, patientViewedAt: null,
  patientResponse: null, patientRespondedAt: null, agreedAt: null, nachgefasstAt: null, hkpEingereichtAt: null, patient, ...extra,
});

describe("Nachfass-Liste", () => {
  const krone = eingabe({ "36": "zerstoert" });
  const fuellung = eingabe({ "25": "karies_klein" });

  it("zeigt bei Zahnersatz vor dem Stichtag den Unterschied 2026/2027", () => {
    const [z] = nachfassListe([q("a", krone, { choices: { t36: "krvk" } })], DEFAULT_PRICES, JETZT);
    expect(z.eigenanteil).toBeCloseTo(1050 - 298.79);
    expect(z.stichtag?.mehr).toBeCloseTo(398.39 * 0.1, 1);
    expect(z.stand).toBe("ohne-link");
  });
  it("kennt keinen Stichtag bei Füllungen, Härtefällen und nach dem Jahreswechsel", () => {
    expect(nachfassListe([q("a", fuellung)], DEFAULT_PRICES, JETZT)[0].stichtag).toBeNull();
    expect(nachfassListe([q("a", eingabe({ "36": "zerstoert" }, { haertefall: true }))], DEFAULT_PRICES, JETZT)[0].stichtag).toBeNull();
    expect(nachfassListe([q("a", krone)], DEFAULT_PRICES, new Date("2027-01-02T10:00:00Z"))[0].stichtag).toBeNull();
  });
  it("lässt entschiedene Vorschläge weg", () => {
    expect(nachfassListe([q("a", krone, { status: "ANGENOMMEN" }), q("b", krone, { status: "ABGELEHNT" })], DEFAULT_PRICES, JETZT)).toEqual([]);
  });
  it("sortiert: erst Stichtag ohne eingereichten Plan, dann nach Stand", () => {
    const liste = nachfassListe(
      [
        q("fuellung", fuellung, { patientRespondedAt: vor(1), patientResponse: "RUECKRUF" }),
        q("krone-eingereicht", krone, { hkpEingereichtAt: vor(1) }),
        q("krone-offen", krone, { shareCreatedAt: vor(5), shareExpiresAt: vor(-20) }),
        q("krone-unterschrieben", krone, { agreedAt: vor(2), shareCreatedAt: vor(5) }),
      ],
      DEFAULT_PRICES,
      JETZT,
    );
    expect(liste.map((z) => z.id)).toEqual(["krone-unterschrieben", "krone-offen", "fuellung", "krone-eingereicht"]);
    expect(liste[0].tun).toMatch(/Heil- und Kostenplan einreichen/);
    expect(liste[2].tun).toBe("Anrufen.");
    const s = nachfassSumme(liste, JETZT);
    expect(s).toMatchObject({ offen: 4, stichtagOffen: 2, tage: 48 });
  });
  it("schreibt eine Erinnerung ohne Befund, Betrag und Druck", () => {
    const t = nachfassText({ firstName: "Thomas", practiceName: "Praxis Test", url: "https://x.test/portal/abc", zahnersatz: true });
    expect(t).toBe("Hallo Thomas, hier ist noch einmal Ihr persönlicher Link von Praxis Test: https://x.test/portal/abc Wenn Sie Fragen haben, rufen Sie uns an. Wenn Sie keine Erinnerung mehr möchten, sagen Sie es uns.");
    expect(t).not.toMatch(/€|Krone|Zahn \d|nur noch|letzte Chance|Tage|noch offen|2027/);
  });
  it("nennt den Stichtag 2027 nur mit dokumentierter Einwilligung in Erinnerungen, und nur bei Zahnersatz", () => {
    const basis = { firstName: "Thomas", practiceName: "Praxis Test", url: "https://x.test/portal/abc" };
    expect(nachfassText({ ...basis, zahnersatz: true, einwilligung: false })).not.toMatch(/2027/);
    expect(nachfassText({ ...basis, zahnersatz: false, einwilligung: true })).not.toMatch(/2027/);
    const mit = nachfassText({ ...basis, zahnersatz: true, einwilligung: true });
    expect(mit).toMatch(/1\. Januar 2027/);
    expect(mit).toMatch(/Wenn Sie keine Erinnerung mehr möchten, sagen Sie es uns\.$/);
    expect(mit).not.toMatch(/€|nur noch|letzte Chance/);
  });

  // § 7 Abs. 2 UWG: Erinnern (Nachricht oder Anruf) nur mit dokumentierter Einwilligung in Erinnerungen.
  it("rät zum Erinnern nur mit dokumentierter Einwilligung, sonst zum Gespräch beim nächsten Termin", () => {
    const ungeoeffnet = { shareCreatedAt: vor(5), shareExpiresAt: vor(-20) };
    const geoeffnet = { ...ungeoeffnet, patientViewedAt: vor(2) };
    const mit = { ...patient, nachfassConsentAt: vor(30) };
    const tun = (extra: Partial<NachfassQuelle>) => nachfassListe([q("a", fuellung, extra)], DEFAULT_PRICES, JETZT)[0].tun;
    expect(tun(ungeoeffnet)).toBe("Beim nächsten Termin ansprechen.");
    expect(tun({ ...ungeoeffnet, patient: mit })).toBe("Erinnern oder beim nächsten Termin ansprechen.");
    expect(tun(geoeffnet)).toBe("Beim nächsten Termin fragen, ob noch Fragen offen sind.");
    expect(tun({ ...geoeffnet, patient: mit })).toBe("Freundlich nachfragen, ob noch Fragen offen sind.");
    for (const t of [tun(ungeoeffnet), tun(geoeffnet), ungeoeffnetTun(false)]) expect(t).not.toMatch(/anruf|erinner|nachfragen|schicken/i);
    expect(ungeoeffnetTun(true)).toBe("erinnern oder beim nächsten Termin ansprechen");
    // Hat der Patient selbst um Rückruf gebeten, bleibt „Anrufen.“
    expect(tun({ ...ungeoeffnet, patientRespondedAt: vor(1), patientResponse: "RUECKRUF" })).toBe("Anrufen.");
  });

  it("zeigt den Knopf „Erinnern“ nur mit Einwilligung, und die Übersicht fordert nicht pauschal zum Anruf auf", () => {
    const knoepfe = readFileSync(join(process.cwd(), "components/NachfassAktionen.tsx"), "utf8");
    // Der Knopf steht in einem Block, der an `einwilligung` hängt.
    expect(knoepfe).toMatch(/\{einwilligung && \(\s*<span data-testid="nachfass-erinnern">\s*<PortalLinkButton/);
    expect(knoepfe.match(/<PortalLinkButton/g)?.length).toBe(1);
    expect(knoepfe).toMatch(/\{!einwilligung && \(\s*<span[^>]*data-testid="nachfass-ohne-einwilligung"/);
    // Der Hinweis nennt den Abschnitt so, wie er auf der Patientenseite heißt, und führt dorthin.
    expect(knoepfe).toMatch(/href=\{`\/patients\/\$\{patientId\}#kontakt`\}[^>]*>„Kontakt und Stammdaten“<\/a>/);
    expect(knoepfe).not.toMatch(/unter „Kontakt“/);
    expect(readFileSync(join(process.cwd(), "components/PatientKontakt.tsx"), "utf8")).toContain(">Kontakt und Stammdaten</h2>");
    expect(readFileSync(join(process.cwd(), "app/(app)/patients/[id]/page.tsx"), "utf8")).toMatch(/id="kontakt"/);
    const uebersicht = readFileSync(join(process.cwd(), "app/(app)/dashboard/page.tsx"), "utf8");
    expect(uebersicht).not.toMatch(/kurz anrufen/);
    expect(uebersicht).toMatch(/ungeoeffnetTun\(!!u\.patient\.nachfassConsentAt\)/);
  });
});
