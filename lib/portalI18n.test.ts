import { describe, expect, it } from "vitest";
import { PORTAL_LANGS, PORTAL_UI, pickPortalLang, portalStatus, reminderLabel } from "@/lib/portalI18n";
import { journey } from "@/lib/journey";

const now = new Date(2026, 10, 1);
const d = (n: number) => new Date(now.getTime() + n * 86400000);
// Alle Texte, die der Behandlungsweg dem Patienten zeigen kann.
const steps = [
  journey({}, now),
  journey({ proposal: { status: "ABGELEHNT" } }, now),
  journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 0 } }, now),
  journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 } }, now),
  journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 }, invoices: [{ status: "GEMELDET", dueDate: d(3) }] }, now),
  journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 }, invoices: [{ status: "OFFEN", dueDate: d(-9) }] }, now),
  journey({ proposal: { status: "ANGENOMMEN", eigenanteilCent: 100 }, invoices: [{ status: "OFFEN", dueDate: d(9) }] }, now),
  journey({ proposal: { status: "BESPROCHEN", agreedAt: d(-1) } }, now),
  journey({ proposal: { status: "BESPROCHEN", patientResponse: "INTERESSE", patientRespondedAt: d(-1) } }, now),
  journey({ proposal: { status: "BESPROCHEN", shareCreatedAt: d(-1) } }, now),
  journey({ proposal: { status: "ENTWURF" } }, now),
].map((j) => j.patient);

describe("Portal-Sprachen", () => {
  it("jede Sprache übersetzt jeden nächsten Schritt", () => {
    for (const l of PORTAL_LANGS.filter((x) => x !== "de")) {
      for (const s of new Set(steps)) expect(PORTAL_UI[l].step(s), `${l}: ${s}`).not.toBe(s);
    }
  });
  it("hat fünf Stationen und alle Texte", () => {
    for (const l of PORTAL_LANGS) {
      expect(PORTAL_UI[l].stations.split("|")).toHaveLength(5);
      expect(PORTAL_UI[l].hello("Anna")).toContain("Anna");
      if (l !== "de") expect(PORTAL_UI[l].invoices).not.toBe(PORTAL_UI.de.invoices);
    }
  });
  it("wählt die Sprache aus Parameter oder Browser", () => {
    expect(pickPortalLang("tr", null)).toBe("tr");
    expect(pickPortalLang(undefined, "uk-UA,uk;q=0.9")).toBe("uk");
    expect(pickPortalLang("xx", "fr-FR")).toBe("de");
  });
  it("Status und Mahnstufen übersetzt", () => {
    expect(portalStatus("ueberfaellig", -3, "pl")).toContain("3");
    expect(reminderLabel(3, "ru")).toBe("Последнее требование");
    expect(reminderLabel(1, "tr")).toBe("Ödeme hatırlatması");
  });
});
