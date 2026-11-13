import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, type ProposalInput } from "./proposals";
import { nachfassListe, nachfassSumme, nachfassText, type NachfassQuelle } from "./nachfassen";

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
    expect(t).toContain("https://x.test/portal/abc");
    expect(t).not.toMatch(/€|Krone|Zahn \d|nur noch|letzte Chance|Tage/);
  });
});
