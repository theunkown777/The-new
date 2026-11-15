import { describe, expect, it } from "vitest";
import { PORTAL_LANGS, PORTAL_LANG_NAMES, PORTAL_LOCALE, PORTAL_UI, pickPortalLang, portalDir, portalStatus, reminderLabel } from "@/lib/portalI18n";
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
  it("kennt sieben Sprachen, Arabisch von rechts nach links", () => {
    expect([...PORTAL_LANGS]).toEqual(["de", "en", "tr", "pl", "ru", "uk", "ar"]);
    expect(PORTAL_LANG_NAMES.ar).toBe("العربية");
    expect(portalDir("ar")).toBe("rtl");
    for (const l of PORTAL_LANGS.filter((x) => x !== "ar")) expect(portalDir(l)).toBe("ltr");
    expect(pickPortalLang("ar", null)).toBe("ar");
    expect(pickPortalLang(undefined, "ar-SY,ar;q=0.9,en;q=0.8")).toBe("ar");
    // Datum mit lateinischen Ziffern, wie in der Patientenansicht des Vorschlags.
    expect(new Date("2026-11-24T10:00:00Z").toLocaleDateString(PORTAL_LOCALE.ar, { day: "2-digit", month: "2-digit", year: "numeric" })).toBe("24/11/2026");
  });
  it("übersetzt in jeder Fremdsprache jeden Text der Startseite (nur IBAN bleibt)", () => {
    const ARGS: Record<string, unknown[]> = { hello: ["Anna"], step: ["Ihren Vorschlag ansehen und wählen."], summary: [2, 3], nextDue: ["24.11.2026"], proposalDoc: ["24.11.2026"], valid: ["24.11.2026"], feedbackVisit: ["24.11.2026"] };
    const text = (l: (typeof PORTAL_LANGS)[number], k: string) => {
      const v = (PORTAL_UI[l] as Record<string, unknown>)[k];
      return typeof v === "function" ? (v as (...a: unknown[]) => string)(...ARGS[k]) : (v as string);
    };
    for (const k of Object.keys(PORTAL_UI.de)) if (typeof (PORTAL_UI.de as Record<string, unknown>)[k] === "function") expect(ARGS[k], `Beispielwerte für ${k}`).toBeDefined();
    for (const l of PORTAL_LANGS.filter((x) => x !== "de")) {
      expect(Object.keys(PORTAL_UI[l]).sort()).toEqual(Object.keys(PORTAL_UI.de).sort());
      for (const k of Object.keys(PORTAL_UI.de)) {
        const t = text(l, k);
        expect(t.trim(), `${l}.${k}`).not.toBe("");
        if (k !== "iban") expect(t, `${l}.${k}`).not.toBe(text("de", k));
        for (const a of ARGS[k] ?? []) if (k !== "step") expect(t, `${l}.${k}`).toContain(String(a));
      }
      expect(PORTAL_UI[l].feedbackScale.split("|")).toHaveLength(5);
    }
    expect(PORTAL_UI.de.feedbackScale.split("|")).toHaveLength(5);
  });
  it("schreibt Arabisch in arabischer Schrift, ohne deutsche Reste", () => {
    const erlaubt = new Set(["PayPal", "Klarna", "Stripe", "GiroCode", "IBAN", "Google", "Anna"]);
    for (const [k, v] of Object.entries(PORTAL_UI.ar)) {
      const t = typeof v === "function" ? (k === "summary" ? PORTAL_UI.ar.summary(2, 3) : k === "step" ? PORTAL_UI.ar.step("Ihren Vorschlag ansehen und wählen.") : (v as (x: string) => string)("Anna")) : v;
      if (k !== "iban") expect(t, k).toMatch(/[\u0600-\u06FF]/);
      for (const w of t.match(/[A-Za-zÄÖÜäöüß]{2,}/g) ?? []) expect(erlaubt.has(w), `ar.${k}: „${w}“`).toBe(true);
    }
    expect(portalStatus("ueberfaellig", -3, "ar")).toContain("3");
    expect(reminderLabel(3, "ar")).toBe("الإنذار الأخير");
  });
  it("lässt den Hinweis auf die öffentliche Bewertung neutral: keine Belohnung, keine Bedingung", () => {
    expect(PORTAL_UI.de.feedbackPublic).toBe("Wenn Sie mögen, können Sie Ihre Praxis auch öffentlich bewerten.");
    for (const l of PORTAL_LANGS) expect(`${PORTAL_UI[l].feedbackPublic} ${PORTAL_UI[l].feedbackThanks}`).not.toMatch(/Gutschein|Rabatt|Geschenk|Dankeschön|5 Sterne|fünf Sterne|voucher|discount|gift|five stars/i);
  });
  it("Status und Mahnstufen übersetzt", () => {
    expect(portalStatus("ueberfaellig", -3, "pl")).toContain("3");
    expect(reminderLabel(3, "ru")).toBe("Последнее требование");
    expect(reminderLabel(1, "tr")).toBe("Ödeme hatırlatması");
  });
});
