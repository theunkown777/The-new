import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { abschlussText, fachText, mitFachWoertern } from "@/lib/fachText";
import { UI, kostenHinweis, uiFuer, type Ui } from "@/lib/patientI18n";
import { uiEinfach } from "@/lib/i18n/de-einfach";
import { PORTAL_UI } from "@/lib/portalI18n";
import { hinweisText, kostenuebersicht } from "@/lib/kostenuebersicht";
import { vergleichsFragen, zweitmeinungHinweis } from "@/lib/zweitmeinung";
import { fragtNachAngst } from "@/lib/anamneseProfile";
import { PraxisFuss } from "@/components/PraxisFuss";
import { agreementText } from "@/lib/agreement";
import { FACHPROFILE, fachprofil, fachWoerter as fachWoerterAusProfil } from "@/lib/fachprofile";
import { EINRICHTUNG_JE_FACH, PERSON_JE_FACH, einrichtungFuer, einrichtungWoerter, fachWoerter, fuerNeue, personFuer } from "@/lib/fachWoerter";
import { buildLetter, type PatientFactors, type ProposalItem } from "@/lib/proposals";
import { KURZ_UI, kurzPaket, kurzUebersetzer } from "@/lib/kurzcheckTexte";
import { SPECIALTIES } from "@/lib/specialties";

// Beispielwerte für die Funktionen der Textpakete.
const BEISPIEL: unknown[] = ["Zofia", true, "24.11.2026"];
const alleTexte = (o: object): string[] =>
  Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "function" ? [String((v as (...a: unknown[]) => unknown)(...BEISPIEL))] : []));

/** Fächer, die nicht in einer Praxis behandeln oder keine Patienten haben. */
const ANDERE_WOERTER = ["apotheke", "optik", "hoerakustik", "sanitaetshaus", "pflege", "hebamme"];
const saetze = (s: string) => s.replace(/(\d)\.(\d)/g, "$1·$2").split(/(?<=[.!?:])\s+/).filter(Boolean);
const woerter = (s: string) => s.split(/\s+/).filter((w) => /\p{L}|\d/u.test(w)).length;

describe("Patientenseiten in den Wörtern des Fachs", () => {
  it("lässt Zahnmedizin, Ärzte und Therapie Zeichen für Zeichen, wie sie sind", () => {
    for (const fach of ["zahn", "hausarzt", "ortho", "physio", "gyn", "andere", null, undefined]) {
      expect(uiFuer("de", false, fach)).toBe(UI.de);
      expect(uiFuer("de", true, fach)).toEqual({ ...UI.de, ...uiEinfach });
      expect(mitFachWoertern(PORTAL_UI.de, fach)).toBe(PORTAL_UI.de);
      expect(fachText("Ihr Behandlungsvorschlag von Ihrer Praxis", fach)).toBe("Ihr Behandlungsvorschlag von Ihrer Praxis");
    }
  });

  it("ändert Übersetzungen nicht", () => {
    expect(uiFuer("en", false, "apotheke")).toBe(UI.en);
  });

  it("sagt bei Apotheke, Fachgeschäft, Sanitätshaus, Pflege und Hebamme weder Praxis noch Behandlung noch Patient", () => {
    for (const fach of ANDERE_WOERTER) {
      const texte = [...alleTexte(uiFuer("de", false, fach)), ...alleTexte(uiFuer("de", true, fach)), ...alleTexte(mitFachWoertern(PORTAL_UI.de, fach))];
      for (const t of texte) expect(t, `${fach}: ${t}`).not.toMatch(/\bPraxis\b|Behandlung|\bPatient/);
    }
  });

  it("findet die richtigen Formen je Fach", () => {
    const apo = uiFuer("de", false, "apotheke");
    expect(apo.pageTitle).toBe("Ihr Beratungsvorschlag");
    expect(apo.hello("Zofia")).toBe("Hallo Zofia, hier ist Ihr Beratungsvorschlag");
    expect(apo.readOnlyNote).toBe("Sie sehen diesen Vorschlag zum Mitlesen. Entscheiden kann nur die Kundin oder der Kunde selbst.");
    expect(apo.recommended).toBe("Von Ihrer Apotheke vorgemerkt");
    expect(apo.hinweisPraxis).toBe("Hinweis der Apotheke:");

    const optik = uiFuer("de", false, "optik");
    expect(optik.thanks).toBe("Danke, Ihr Fachgeschäft hat Ihre Rückmeldung erhalten. Sie können Ihre Auswahl hier jederzeit erneut senden.");
    expect(optik.recTitle).toBe("Vormerkung Ihres Fachgeschäfts im Vergleich");
    expect(optik.back).toBe("Zurück zu Ihrer Übersicht");

    const sani = uiFuer("de", false, "sanitaetshaus");
    expect(sani.fineTherapie("1.1.2027")).toContain("nach der Preisliste Ihres Sanitätshauses");
    expect(sani.fineTherapie("1.1.2027")).toContain("vor der Versorgung vereinbaren wir sie schriftlich");

    const pflege = uiFuer("de", false, "pflege");
    expect(pflege.sendFailed).toBe("Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie den Pflegedienst an.");
    expect(pflege.remindText).toBe("Wählen Sie, wann Sie erinnert werden möchten. Ihr Pflegedienst sieht Ihren Wunsch an diesem Tag.");
    expect(pflege.readOnlyNote).toContain("die Klientin oder der Klient selbst");
    expect(pflege.readOnlyTitle).toBe("Einsatzvorschlag zum Mitlesen");

    const hebamme = uiFuer("de", true, "hebamme");
    expect(hebamme.readOnlyNote).toBe("Sie dürfen diesen Vorschlag mitlesen. Entscheiden kann nur die Frau selbst.");
    expect(hebamme.pageTitle).toBe("Ihr Vorschlag für den Besuch");
    expect(hebamme.discuss).toBe("Diese Auswahl mit der Hebammenpraxis besprechen");

    const klinik = uiFuer("de", false, "klinik");
    expect(klinik.thanks).toContain("Ihre Klinik hat Ihre Rückmeldung erhalten");
    expect(klinik.pageTitle).toBe("Ihr Behandlungsvorschlag");
  });

  it("hält die Einfache Sprache auch mit den Wörtern des Fachs bei höchstens 15 Wörtern je Satz", () => {
    for (const fach of [...ANDERE_WOERTER, "klinik"]) {
      const ui = uiFuer("de", true, fach) as unknown as Record<string, unknown>;
      for (const key of Object.keys(uiEinfach)) {
        const v = ui[key];
        const text = typeof v === "string" ? v : String((v as (...a: unknown[]) => unknown)(...BEISPIEL));
        for (const s of saetze(text)) expect(woerter(s), `${fach}/${key}: ${s}`).toBeLessThanOrEqual(15);
      }
      const hinweis = kostenHinweis(ui as unknown as Ui, { dental: false, therapie: true, fach, gkv: true, until: "24.11.2026", einfach: true });
      for (const s of saetze(hinweis)) expect(woerter(s), `${fach}: ${s}`).toBeLessThanOrEqual(15);
    }
  });

  it("spricht im Portal in den Wörtern des Fachs", () => {
    const apo = mitFachWoertern(PORTAL_UI.de, "apotheke");
    expect(apo.wayTitle).toBe("Ihre Übersicht");
    expect(apo.proposalDoc("01.12.2026")).toBe("Beratungsvorschlag vom 01.12.2026");
    expect(apo.step("Ihr Gespräch in der Praxis steht an.")).toBe("Ihr Gespräch in der Apotheke steht an.");
    expect(apo.step("Sie haben sich gegen die Behandlung entschieden.")).toBe("Sie haben sich gegen die Beratung entschieden.");
    const pflege = mitFachWoertern(PORTAL_UI.de, "pflege");
    expect(pflege.privacy).toBe("Ohne App und ohne Konto. Die Zahlung geht direkt an Ihren Pflegedienst.");
    expect(pflege.feedbackPublic).toBe("Wenn Sie mögen, können Sie Ihren Pflegedienst auch öffentlich bewerten.");
    expect(pflege.anamnesis).toBe("Drei Minuten vor Ihrem Termin, damit beim Pflegedienst nichts mehr auszufüllen ist.");
    expect(pflege.step("Danke. Ihre Zahlung ist bei der Praxis gemeldet.")).toBe("Danke. Ihre Zahlung ist beim Pflegedienst gemeldet.");
    const optik = mitFachWoertern(PORTAL_UI.de, "optik");
    expect(optik.reportedDone).toBe("Danke! Das Fachgeschäft prüft den Zahlungseingang.");
    expect(optik.feedbackPublicLink).toBe("Zum Google-Profil des Fachgeschäfts");
    expect(optik.wayTitle).toBe("Ihre Übersicht");
    expect(mitFachWoertern(PORTAL_UI.de, "klinik").wayTitle).toBe("Ihr Behandlungsweg");
  });

  it("vergleicht mit einem zweiten Angebot, wo das Fach nicht behandelt", () => {
    expect(fachText("+ Angebot einer anderen Praxis eintragen", "optik")).toBe("+ Angebot eines anderen Fachgeschäfts eintragen");
    expect(fachText("Andere Praxis", "pflege")).toBe("Anderer Pflegedienst");
    expect(fachText("Was schlägt sie vor?", "pflege")).toBe("Was schlägt er vor?");
    expect(fachText("Was schlägt sie vor?", "zahn")).toBe("Was schlägt sie vor?");
    expect(fachText("Ihre Praxis sieht einen Eintrag erst, wenn Sie „mit meiner Praxis teilen“ anhaken.", "hoerakustik")).toBe(
      "Ihr Fachgeschäft sieht einen Eintrag erst, wenn Sie „mit meinem Fachgeschäft teilen“ anhaken.",
    );
    expect(zweitmeinungHinweis([], true, "zahn").titel).toBe("Zweitmeinung zum Heil- und Kostenplan");
    expect(zweitmeinungHinweis([], false, "ortho").titel).toBe("Eine zweite Meinung einholen");
    expect(zweitmeinungHinweis([], false, "physio").titel).toBe("Eine zweite Meinung einholen");
    for (const fach of ["optik", "apotheke", "pflege"]) {
      expect(zweitmeinungHinweis([], false, fach).titel).toBe("Ein zweites Angebot einholen");
      expect(vergleichsFragen(false, fach).join(" ")).not.toMatch(/Eingriff|behandelt|Zahnersatz/);
    }
    expect(vergleichsFragen(false, "ortho").join(" ")).toContain("Eingriff");
    expect(vergleichsFragen(true, "zahn").join(" ")).toContain("Zahnersatz");
  });
});

describe("Wörter des Fachs ohne die Fachprofile", () => {
  it("Person und Einrichtung stimmen für jedes Fach mit dem Fachprofil überein", () => {
    const faecher = Object.keys(FACHPROFILE);
    expect(faecher.length).toBeGreaterThanOrEqual(30);
    for (const fach of [...faecher, "andere", "gibtesnicht", null, undefined]) {
      expect(personFuer(fach), String(fach)).toEqual(fachprofil(fach).person);
      expect(einrichtungFuer(fach), String(fach)).toBe(fachprofil(fach).einrichtung);
    }
    // Kein Eintrag für ein Fach, das es nicht gibt
    for (const fach of [...Object.keys(PERSON_JE_FACH), ...Object.keys(EINRICHTUNG_JE_FACH)]) expect(faecher, fach).toContain(fach);
    expect(fachWoerterAusProfil).toBe(fachWoerter);
  });

  it("Zahnmedizin, Orthopädie und Physiotherapie: Patient, Praxis, Behandlung; andere Fächer mit ihren Wörtern", () => {
    for (const fach of ["zahn", "ortho", "physio"]) {
      expect(personFuer(fach).sg).toBe("Patient");
      expect(einrichtungFuer(fach)).toBe("Praxis");
      expect(fachWoerter(fach).vorschlag).toBe("Behandlungsvorschlag");
    }
    expect(personFuer("apotheke").pl).toBe("Kunden");
    expect(einrichtungFuer("optik")).toBe("Fachgeschäft");
    expect(fachWoerter("pflege").vorschlag).toBe("Einsatzvorschlag");
    expect(einrichtungFuer("klinik")).toBe("Klinik");
    expect(personFuer("klinik").sg).toBe("Patient");
  });

  it("die Patientenseiten laden die Fachprofile nicht mit", () => {
    // lib/fachText.ts und lib/fachWoerter.ts landen im Browser der Patienten: ohne die großen Profile.
    for (const datei of ["lib/fachText.ts", "lib/fachWoerter.ts"]) expect(readFileSync(datei, "utf8"), datei).not.toMatch(/from "@\/lib\/(fachprofile|specialties)"/);
    for (const datei of ["components/PatientProposalView.tsx", "components/NeupatientTermin.tsx", "components/PortalTermin.tsx", "components/SignAgreement.tsx", "components/AnamnesisForm.tsx", "components/PortalInvoice.tsx", "components/ZweitmeinungVergleich.tsx"]) {
      expect(readFileSync(datei, "utf8"), datei).not.toContain('from "@/lib/fachprofile"');
    }
  });
});

describe("Feste Sätze der Patientenseiten je Fach", () => {
  it("beugt die Einrichtung richtig: Nominativ, Akkusativ, Dativ, Genitiv", () => {
    const satz = (s: string, fach: string) => fachText(s, fach);
    // Akkusativ nach „an“ und „Sie“: nur beim männlichen Pflegedienst anders als der Nominativ
    expect(satz("Ihre Antworten gehen direkt an die Praxis.", "pflege")).toBe("Ihre Antworten gehen direkt an den Pflegedienst.");
    expect(satz("Ihre Antworten gehen direkt an die Praxis.", "optik")).toBe("Ihre Antworten gehen direkt an das Fachgeschäft.");
    expect(satz("Ihre Antworten gehen direkt an die Praxis.", "apotheke")).toBe("Ihre Antworten gehen direkt an die Apotheke.");
    expect(satz("Darüber bestätigt die Praxis Ihren Termin.", "pflege")).toBe("Darüber bestätigt der Pflegedienst Ihren Termin.");
    // Dativ
    expect(satz("Möchten Sie der Praxis noch etwas sagen? (freiwillig)", "sanitaetshaus")).toBe("Möchten Sie dem Sanitätshaus noch etwas sagen? (freiwillig)");
    expect(satz(" · von der Praxis bestätigt", "pflege")).toBe(" · vom Pflegedienst bestätigt");
    expect(satz("Bitte rufen Sie in der Praxis an.", "hoerakustik")).toBe("Bitte rufen Sie im Fachgeschäft an.");
    // Genitiv
    expect(satz("Die Seite stellt Sorrida im Auftrag der Praxis technisch bereit.", "pflege")).toBe("Die Seite stellt Sorrida im Auftrag des Pflegedienstes technisch bereit.");
    expect(satz("Ihr Behandlungsweg, Unterlagen und Zahlungen Ihrer Praxis.", "optik")).toBe("Ihre Übersicht, Unterlagen und Zahlungen Ihres Fachgeschäfts.");
    // Text zum Weitergeben (SMS): „Ihren Behandlungsweg“ im Akkusativ
    expect(satz("unter diesem Link sehen Sie Ihren Behandlungsweg bei", "apotheke")).toBe("unter diesem Link sehen Sie Ihre Übersicht bei");
    expect(satz("hier ist Ihr Behandlungsvorschlag mit allen Optionen und Kosten", "pflege")).toBe("hier ist Ihr Einsatzvorschlag mit allen Optionen und Kosten");
    for (const fach of ["zahn", "ortho", "physio", "hausarzt", null]) {
      for (const s of ["Ihre Antworten gehen direkt an die Praxis.", "Möchten Sie der Praxis noch etwas sagen? (freiwillig)", "← Zurück zu Ihrem Behandlungsweg", "unter diesem Link sehen Sie Ihren Behandlungsweg bei"]) expect(fachText(s, fach)).toBe(s);
    }
  });

  it("Einverständnis: Erklärung in den Wörtern des Fachs, der Name der Praxis bleibt", () => {
    const a = { practiceName: "Die Praxis am Park", date: "10.11.2026", choices: ["Allgemein: Wunschleistung"], kasse: 0, eigen: 50 };
    const basis = agreementText(a);
    expect(basis).toContain("Ich habe den Behandlungsvorschlag von Die Praxis am Park vom 10.11.2026 gelesen.");
    expect(basis).toContain("Die schriftliche Vereinbarung unterschreibe ich vor der Behandlung in der Praxis.");
    for (const fach of ["zahn", "ortho", "physio", undefined]) expect(agreementText({ ...a, fach })).toBe(basis);
    const apo = agreementText({ ...a, fach: "apotheke" });
    expect(apo).toContain("Ich habe den Beratungsvorschlag von Die Praxis am Park vom 10.11.2026 gelesen.");
    expect(apo).toContain("unterschreibe ich vor der Beratung in der Apotheke.");
    expect(agreementText({ ...a, fach: "pflege" })).toContain("unterschreibe ich vor dem Einsatz beim Pflegedienst.");
  });

  it("Kurz-Fragebogen: deutsches Paket in den Wörtern des Fachs, Übersetzungen und Praxis-Fächer unverändert", () => {
    for (const fach of ["zahn", "ortho", "physio", null, undefined]) expect(kurzPaket("de", { fach })).toBe(kurzPaket("de"));
    expect(kurzPaket("en", { fach: "apotheke" })).toBe(kurzPaket("en"));
    const t = (fach: string, eltern = false) => kurzUebersetzer(kurzPaket("de", { fach, eltern })).t;
    expect(t("ortho")("dringend")).toBe(KURZ_UI.dringend);
    expect(t("apotheke")("dringend")).toContain("rufen Sie bitte direkt in der Apotheke an");
    expect(t("pflege")("notiz")).toBe("Möchten Sie dem Pflegedienst noch etwas sagen? (freiwillig)");
    expect(t("optik")("wo")).toBe(KURZ_UI.wo);
    // Die Fassung für Eltern bleibt darüber erhalten
    expect(t("optik", true)("wo")).toBe("Wo hat Ihr Kind Beschwerden?");
    expect(t("optik", true)("dringend")).toContain("im Fachgeschäft");
    for (const fach of ANDERE_WOERTER) for (const k of Object.keys(KURZ_UI) as (keyof typeof KURZ_UI)[]) expect(t(fach)(k), `${fach}/${k}`).not.toMatch(/\bPraxis\b|Behandlung|\bPatient/);
  });

  it("Hilfe: „Behandlung“ im Fließtext wird zum Wort des Fachs, Namen aus der App bleiben", () => {
    expect(abschlussText("Wie schließe ich eine Behandlung ab?", "Behandlung")).toBe("Wie schließe ich eine Behandlung ab?");
    expect(abschlussText("Wie schließe ich eine Behandlung ab?", "Beratung")).toBe("Wie schließe ich eine Beratung ab?");
    expect(abschlussText("Wie schließe ich eine Behandlung ab?", "Einsatz")).toBe("Wie schließe ich einen Einsatz ab?");
    expect(abschlussText("Was passiert nach dem Abschließen einer Behandlung?", "Besuch")).toBe("Was passiert nach dem Abschließen eines Besuchs?");
    expect(abschlussText("Was passiert nach dem Abschließen einer Behandlung?", "Versorgung")).toBe("Was passiert nach dem Abschließen einer Versorgung?");
    expect(abschlussText("alle Behandlungsvorschläge", "Einsatz")).toBe("alle Einsatzvorschläge");
    expect(abschlussText("„Behandlungsweg senden“ für Behandlerinnen", "Beratung")).toBe("„Behandlungsweg senden“ für Behandlerinnen");
  });
});

describe("Öffentliche Terminanfrage und Schreiben je Fach", () => {
  it("Terminanfrage: für wen sie gedacht ist und wer bestätigt", () => {
    for (const fach of ["zahn", "ortho", "physio", "hausarzt", null]) {
      expect(fuerNeue(fach), String(fach)).toBe("Für neue Patientinnen und Patienten");
      expect(einrichtungWoerter(fach).dieNom).toBe("die Praxis");
    }
    expect(fuerNeue("gyn")).toBe("Für neue Patientinnen");
    expect(fuerNeue("apotheke")).toBe("Für neue Kundinnen und Kunden");
    expect(fuerNeue("pflege")).toBe("Für neue Klientinnen und Klienten");
    expect(fuerNeue("hebamme")).toBe("Für Ihren ersten Termin");
    expect(einrichtungWoerter("optik").dieNom).toBe("das Fachgeschäft");
    expect(einrichtungWoerter("pflege").dieNom).toBe("der Pflegedienst");
    expect(einrichtungWoerter("apotheke").dieNom).toBe("die Apotheke");
  });

  const P: PatientFactors = { age: 46, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0, zuschussJahr: 2026 };
  const brief = (fach: string | undefined, mitWahl = false) => {
    const item: ProposalItem = {
      key: "a", where: "Allgemein", title: "Beispiel", recommended: null, notes: [], excluded: [],
      // Außerhalb der Arztpraxen heißt die Leistungsart „Selbstzahlerleistung“ (eigene Bezeichnung wie im Regelwerk des Fachs).
      options: [{ id: "k", type: "kasse", name: "Kassenleistung", total: 0, benefits: [] }, { id: "w", type: "igel", name: "Wunschleistung", total: 50, benefits: [], ...(fach && fach !== "zahn" && fach !== "ortho" ? { typeLabel: "Selbstzahlerleistung" } : {}) }],
    };
    return buildLetter({ items: [item], choices: mitWahl ? { a: "w" } : {}, patient: P, patientName: "Frau Test", practiceName: "Haus am Markt", date: new Date("2026-11-02"), fach });
  };

  it("Schreiben: Zahnmedizin, Ärzte und Therapie wie bisher", () => {
    for (const fach of ["zahn", "ortho", "physio", undefined]) {
      const t = brief(fach, true);
      expect(t, String(fach)).toContain("Haus am Markt – Ihr persönlicher Behandlungsvorschlag");
      expect(t, String(fach)).toContain("Hier finden Sie unsere Befunde und die Behandlungsmöglichkeiten, die wir mit Ihnen besprochen haben.");
      expect(t, String(fach)).toContain("← von Ihrer Praxis vorgemerkt");
    }
    expect(brief("zahn")).toContain("Heil- und Kostenplan");
    expect(brief(undefined)).toContain("Heil- und Kostenplan");
    expect(brief("ortho")).toContain("Selbstzahlerleistungen (IGeL)");
    expect(brief("ortho")).not.toContain("Heil- und Kostenplan");
    expect(brief("physio")).toContain("privat nach unserer Preisliste berechnet");
    expect(brief("physio")).toContain("vor der Behandlung vereinbaren wir sie schriftlich");
    expect(brief("physio")).not.toMatch(/IGeL|GOÄ|Heil- und Kostenplan/);
  });

  it("Schreiben: Apotheke, Fachgeschäft und Pflegedienst in ihren Wörtern, Klinik mit Wahlleistungsvereinbarung", () => {
    const apo = brief("apotheke", true);
    expect(apo).toContain("Haus am Markt – Ihr persönlicher Beratungsvorschlag");
    expect(apo).toContain("Hier finden Sie die Möglichkeiten, die wir mit Ihnen besprochen haben.");
    expect(apo).toContain("← von Ihrer Apotheke vorgemerkt");
    expect(apo).toContain("vor der Beratung vereinbaren wir sie schriftlich");
    expect(brief("optik", true)).toContain("← von Ihrem Fachgeschäft vorgemerkt");
    expect(brief("pflege")).toContain("vor dem Einsatz vereinbaren wir sie schriftlich");
    for (const fach of ["apotheke", "optik", "hoerakustik", "sanitaetshaus", "pflege", "hebamme"]) expect(brief(fach, true), fach).not.toMatch(/Behandlung|\bPraxis\b|IGeL|GOÄ|Heil- und Kostenplan/);
    const klinik = brief("klinik");
    expect(klinik).toContain("§ 17 KHEntgG");
    expect(klinik).toContain("Gebührenordnung für Ärzte (GOÄ)");
    expect(klinik).not.toMatch(/Preisliste|IGeL/);
  });
});

describe("Website: Seite für andere Fachrichtungen", () => {
  it("nennt als Beispiel kein Fach, das eine eigene Seite hat", () => {
    const seite = readFileSync("app/fachgebiete/andere/page.tsx", "utf8");
    const beschreibung = seite.match(/description:\s*"([^"]+)"/)?.[1] ?? "";
    const beispiel = seite.match(/Beispiel ([^:<]+): eigene Leistungen/)?.[1] ?? "";
    expect(beschreibung.length).toBeGreaterThan(80);
    expect(beispiel).not.toBe("");
    // „Neurologie“, „Gastroenterologie“, „Chirurgie“ … haben längst fertige Anlässe und eine eigene Seite.
    const eigene = SPECIALTIES.map((s) => s.name.split(/[ ,]/)[0]);
    expect(eigene).toContain("Neurologie");
    expect(eigene).toContain("Gastroenterologie");
    for (const name of eigene) expect(`${beschreibung} ${beispiel}`, name).not.toContain(name);
  });
});

describe("Kleingedrucktes zur Kostenschätzung je Fach", () => {
  const until = "24.11.2026";
  it("bleibt für Zahnmedizin, Ärzte und Heilmittel wie bisher", () => {
    expect(kostenHinweis(UI.de, { dental: true, therapie: false, fach: "zahn", gkv: true, until })).toBe(UI.de.fine(true, until));
    expect(kostenHinweis(UI.de, { dental: false, therapie: false, fach: "ortho", gkv: true, until })).toBe(UI.de.fineMed(until));
    expect(kostenHinweis(UI.de, { dental: false, therapie: true, fach: "physio", gkv: true, until })).toBe(UI.de.fineTherapie(until));
  });

  it("nennt bei der Klinik die Wahlleistungsvereinbarung und die GOÄ statt einer Preisliste", () => {
    const k = kostenHinweis(uiFuer("de", false, "klinik"), { dental: false, therapie: true, fach: "klinik", gkv: true, until });
    expect(k).toContain("§ 17 KHEntgG");
    expect(k).toContain("GOÄ");
    expect(k).not.toMatch(/Preisliste|Zuzahlung|IGeL/);
    expect(k).toContain(`gültig bis ${until}`);
  });

  it("nennt die Zuzahlung auf Verordnung nur, wo es eine Verordnung gibt", () => {
    for (const fach of ["hebamme", "heilpraktiker"]) {
      for (const einfach of [false, true]) {
        const k = kostenHinweis(uiFuer("de", einfach, fach), { dental: false, therapie: true, fach, gkv: true, until, einfach });
        expect(k, fach).not.toMatch(/Zuzahlung|Verordnung|Rezept/);
        expect(k).toMatch(/gültig bis|gilt bis/);
      }
    }
    for (const fach of ["physio", "apotheke", "optik", "pflege"]) {
      expect(kostenHinweis(uiFuer("de", false, fach), { dental: false, therapie: true, fach, gkv: true, until })).toContain("gesetzliche Zuzahlung");
    }
  });

  it("schreibt das PDF der Kostenübersicht in den Wörtern des Fachs", () => {
    expect(hinweisText({ gkv: true, dental: true, therapie: false })).toBe(UI.de.fine(true, "x").replace(/\s*Dieser Link ist gültig bis x\./, "").trim());
    expect(hinweisText({ gkv: true, dental: false, therapie: true, fach: "optik" })).toContain("Preisliste Ihres Fachgeschäfts");
    expect(hinweisText({ gkv: true, dental: false, therapie: true, fach: "klinik" })).toContain("§ 17 KHEntgG");
    // Titel und Fußzeile des Blatts
    const blatt = (fach: string | undefined, dental = false) =>
      kostenuebersicht({ praxis: "Haus am Markt", items: [], patient: { age: 45, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 }, praxisWahl: {}, patientWahl: null, dental, therapie: !dental, fach, now: new Date("2026-11-15T10:00:00Z") });
    for (const [fach, dental] of [["zahn", true], [undefined, true], ["ortho", false], ["physio", false]] as const) {
      expect(blatt(fach, dental).titel, String(fach)).toBe("Kostenübersicht zum Behandlungsvorschlag");
      expect(blatt(fach, dental).fuss, String(fach)).toContain("aus dem Behandlungsvorschlag Ihrer Praxis");
    }
    expect(blatt("zahn", true).fuss).toContain("kein Heil- und Kostenplan");
    expect(blatt("ortho").fuss).not.toContain("Heil- und Kostenplan");
    expect(blatt("apotheke").titel).toBe("Kostenübersicht zum Beratungsvorschlag");
    expect(blatt("apotheke").fuss).toContain("aus dem Beratungsvorschlag Ihrer Apotheke");
    expect(blatt("pflege").einreichen).toContain("maßgeblich ist die Rechnung Ihres Pflegedienstes");
  });
});

describe("Fuß der Patientenseiten und Angstfrage je Fach", () => {
  const fuss = (fach: string | null) => renderToStaticMarkup(createElement(PraxisFuss, { name: "Muster", stammdaten: { impressumUrl: "https://example.org/i" }, fach }));
  it("nennt Einrichtung und Zweck des Fachs", () => {
    expect(fuss("zahn")).toContain("zur Behandlung und Abrechnung verwendet. Technische Bereitstellung im Auftrag der Praxis:");
    expect(fuss("ortho")).toContain("Impressum der Praxis");
    expect(fuss(null)).toContain("zur Behandlung und Abrechnung");
    expect(fuss("apotheke")).toContain("für die Beratung und die Abrechnung verwendet. Technische Bereitstellung im Auftrag der Apotheke:");
    expect(fuss("optik")).toContain("Impressum des Fachgeschäfts");
    expect(fuss("pflege")).toContain("für den Einsatz und die Abrechnung");
    for (const f of ["apotheke", "optik", "pflege", "hebamme"]) expect(fuss(f)).not.toMatch(/\bPraxis\b|Behandlung/);
  });

  it("fragt nur dort nach Angst vor der Behandlung, wo behandelt wird", () => {
    for (const fach of ["zahn", "ortho", "physio", "hausarzt", "klinik"]) expect(fragtNachAngst(fach), fach).toBe(true);
    for (const fach of ANDERE_WOERTER) expect(fragtNachAngst(fach), fach).toBe(false);
  });
});
