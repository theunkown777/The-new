import { describe, expect, it } from "vitest";
import { ANAMNESE_FRAGEN, ANLIEGEN, anamneseFuer } from "@/lib/anamneseProfile";
import { anamneseFehler, anamneseZeilen, anamnesePruefen, anamnesisFlags, anamnesisProposalGlobals, anamnesisSchemaFuer, anliegenTexte, parseAnamnesis } from "@/lib/anamnesis";

const zahn = anamneseFuer("zahn");
const hausarzt = anamneseFuer("hausarzt");
const allNo = (p: { fragen: { key: string }[] }) => Object.fromEntries(p.fragen.map((q) => [q.key, { yes: false }]));

describe("Anamnese", () => {
  it("verlangt alle Fragen des Bogens und eine Bestätigung", () => {
    const schema = anamnesisSchemaFuer(zahn);
    expect(schema.safeParse({ q: allNo(zahn), confirmName: "Martina Weber" }).success).toBe(true);
    const fehlt = schema.safeParse({ q: { rauchen: { yes: true } }, confirmName: "Martina Weber" });
    expect(fehlt.success).toBe(false);
    // Der Browser schickt immer alle Fragen; fehlt eine, hat sich der Bogen seit dem Öffnen geändert.
    expect(anamneseFehler(fehlt.error!.issues)).toBe("Der Bogen hat sich geändert. Bitte laden Sie die Seite neu.");
    expect(schema.safeParse({ q: allNo(zahn), confirmName: "" }).success).toBe(false);
  });

  it("meldet Fehler auf Deutsch und passend, nie mit den englischen Texten der Prüfung", () => {
    const fehler = (body: unknown, opts?: { altbestand?: boolean }) => {
      const p = anamnesePruefen(body, hausarzt, opts);
      return p.ok ? "ok" : p.fehler;
    };
    const voll = { q: allNo(hausarzt), wishes: [], confirmName: "M. Weber" };
    expect(fehler(voll)).toBe("ok");
    // Kein oder kein lesbarer Inhalt
    for (const b of [undefined, null, [], "x", 3]) expect(fehler(b), String(b)).toBe("Die Angaben konnten nicht gelesen werden. Bitte laden Sie die Seite neu.");
    // Bogen geändert: eine Frage fehlt (z. B. Geburtstag mit 12 Jahren) oder ist neu
    const { rauchen: _r, ...ohneRauchen } = allNo(hausarzt);
    expect(fehler({ ...voll, q: ohneRauchen })).toBe("Der Bogen hat sich geändert. Bitte laden Sie die Seite neu.");
    expect(fehler({ ...voll, q: { ...allNo(hausarzt), knirschen: { yes: false } } })).toMatch(/geändert/);
    expect(fehler({ ...voll, wishes: ["hell"] })).toMatch(/geändert/);
    // Antwort unvollständig
    expect(fehler({ ...voll, q: { ...allNo(hausarzt), rauchen: null } })).toBe("Bitte alle Fragen beantworten");
    expect(fehler({ ...voll, q: { ...allNo(hausarzt), rauchen: { yes: "ja" } } })).toBe("Bitte alle Fragen beantworten");
    // Zu lang oder Name fehlt
    expect(fehler({ ...voll, q: { ...allNo(hausarzt), medikamente: { yes: true, detail: "x".repeat(301) } } })).toBe("Bitte kürzen Sie Ihre Angabe zu einer Frage auf höchstens 300 Zeichen.");
    expect(fehler({ ...voll, note: "x".repeat(1001) })).toBe("Bitte kürzen Sie die weiteren Hinweise auf höchstens 1000 Zeichen.");
    expect(fehler({ ...voll, confirmName: "x".repeat(121) })).toBe("Bitte kürzen Sie den Namen auf höchstens 120 Zeichen.");
    expect(fehler({ ...voll, confirmName: "M" })).toBe("Bitte Ihren Namen zur Bestätigung eintragen");
    expect(fehler({ q: allNo(hausarzt), wishes: [] })).toBe("Bitte Ihren Namen zur Bestätigung eintragen");
    // Nie Englisch
    for (const b of [undefined, {}, { q: 1 }, { ...voll, wishes: "x" }, { ...voll, note: 5 }]) expect(fehler(b), JSON.stringify(b)).not.toMatch(/Invalid|expected|received|Too big|Unrecognized/);
  });

  it("Warnhinweise zuerst, mit Detail", () => {
    const p = anamnesePruefen({ q: { ...allNo(zahn), diabetes: { yes: true }, blutverduenner: { yes: true, detail: "Eliquis 5 mg" } }, wishes: ["angst"], confirmName: "M. Weber" }, zahn);
    if (!p.ok) throw new Error(p.fehler);
    const flags = anamnesisFlags(p.daten);
    expect(flags[0]).toEqual({ level: "warn", text: "Blutverdünner", detail: "Eliquis 5 mg" });
    expect(flags.map((f) => f.level)).toEqual(["warn", "info", "info"]);
  });

  it("übernimmt Raucher, Knirschen und Bleaching-Wunsch nur im zahnärztlichen Bogen in den Vorschlag", () => {
    const p = anamnesePruefen({ q: { ...allNo(zahn), rauchen: { yes: true }, knirschen: { yes: true } }, wishes: ["hell", "luecke"], confirmName: "M. Weber" }, zahn);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.daten).toMatchObject({ v: 2, fach: "zahn" });
    expect(anamnesisProposalGlobals(p.daten).sort()).toEqual(["bleaching", "bruxismus", "raucher"]);
    const h = anamnesePruefen({ q: { ...allNo(hausarzt), rauchen: { yes: true } }, wishes: [], confirmName: "M. Weber" }, hausarzt);
    if (!h.ok) throw new Error(h.fehler);
    expect(anamnesisProposalGlobals(h.daten)).toEqual([]);
    // Auch wenn die Praxis inzwischen Zahnmedizin wäre: Der Bogen war hausärztlich.
    expect(anamnesisProposalGlobals(h.daten, "zahn")).toEqual([]);
  });

  it("speichert Fassung 2 mit Fach und lehnt fremde Schlüssel ab", () => {
    const p = anamnesePruefen({ q: allNo(hausarzt), wishes: ["kasse"], confirmName: "M. Weber" }, hausarzt);
    expect(p.ok && p.daten).toMatchObject({ v: 2, fach: "hausarzt", ansprache: "patient", wishes: ["kasse"] });
    const knirschen = anamnesePruefen({ q: { ...allNo(hausarzt), knirschen: { yes: true } }, wishes: [], confirmName: "M. Weber" }, hausarzt);
    expect(knirschen.ok).toBe(false);
    expect(!knirschen.ok && knirschen.fehler).toMatch(/neu/);
    expect(anamnesePruefen({ q: allNo(hausarzt), wishes: ["hell"], confirmName: "M. Weber" }, hausarzt).ok).toBe(false);
    expect(anamnesePruefen({ q: allNo(hausarzt), wishes: [], confirmName: "M. Weber", fach: "zahn" }, hausarzt).ok).toBe(false);
  });
});

// Bögen von vor November 2026 (Fassung 1): ohne Fach, mit festem Fragensatz. Sie bleiben lesbar und gehen nicht verloren.
describe("Ältere Bögen (Fassung 1)", () => {
  const v1 = {
    q: { medikamente: { yes: true, detail: "Ramipril" }, blutverduenner: { yes: true, detail: "ASS 100" }, gerinnung: { yes: false }, bisphosphonate: { yes: false }, allergien: { yes: false }, herz: { yes: false }, blutdruck: { yes: true }, diabetes: { yes: false }, infektion: { yes: false }, bestrahlung: { yes: false }, schwanger: { yes: false }, rauchen: { yes: true }, knirschen: { yes: true } },
    wishes: ["hell", "kosten"],
    confirmName: "Anna Krüger",
  };

  it("bleiben lesbar mit Hinweisen und Anliegen", () => {
    const a = parseAnamnesis(v1)!;
    expect(a).toMatchObject({ v: 1, fach: null });
    expect(anamnesisFlags(a).map((f) => f.text)).toContain("Blutverdünner");
    expect(anliegenTexte(a)).toEqual(["hellere Zähne", "Kosten gering halten"]);
    expect(anamneseZeilen(a)).toHaveLength(13);
  });

  it("übernehmen in den Vorschlag nach dem Fach der Praxis", () => {
    const a = parseAnamnesis(v1)!;
    expect(anamnesisProposalGlobals(a, "zahn").sort()).toEqual(["bleaching", "bruxismus", "raucher"]);
    expect(anamnesisProposalGlobals(a, "hausarzt")).toEqual([]);
    expect(anamnesisProposalGlobals(a, null)).toEqual([]);
  });

  it("zeigen nur, was gefragt wurde (kein „Nein“ für Ungefragtes)", () => {
    const a = parseAnamnesis({ q: { medikamente: { yes: false }, rauchen: { yes: true } }, wishes: [], confirmName: "X Y" })!;
    const zeilen = anamneseZeilen(a);
    expect(zeilen.map((z) => z.antwort)).toEqual(["Nein", "Ja"]);
    expect(JSON.stringify(zeilen)).not.toMatch(/Knirschen|Zähne/);
  });

  it("vor dem Fach angelegte, offene Bögen werden noch angenommen; fremde Anliegen fallen weg", () => {
    const alt = { ...v1, q: Object.fromEntries(Object.entries(v1.q).filter(([k]) => k !== "knirschen")), wishes: ["hell", "angst"] };
    expect(anamnesePruefen(alt, hausarzt).ok).toBe(false);
    const p = anamnesePruefen(alt, hausarzt, { altbestand: true });
    if (!p.ok) throw new Error(p.fehler);
    expect(p.daten.wishes).toEqual(["angst"]);
    expect(p.daten.q.bisphosphonate).toEqual({ yes: false });
    expect(anamnesePruefen({ ...alt, q: { medikamente: { yes: false } } }, hausarzt, { altbestand: true }).ok).toBe(false);
  });

  it("alter Bogen mit zu kurzem Namen: Meldung zum Namen, nicht „Bogen geändert“", () => {
    const alt = { ...v1, q: Object.fromEntries(Object.entries(v1.q).filter(([k]) => k !== "knirschen")), confirmName: "A" };
    const p = anamnesePruefen(alt, hausarzt, { altbestand: true });
    expect(!p.ok && p.fehler).toBe("Bitte Ihren Namen zur Bestätigung eintragen");
  });
});

// Die Hinweise aus dem Fragebogen nennen nur, was der Patient angegeben hat. Was daraus für die Behandlung folgt,
// entscheidet die Praxis (lib/zweckbestimmung.ts: keine Therapieempfehlungen, keine Bewertung von Befunden).
describe("Hinweise aus dem Anamnesebogen", () => {
  it("nennen die Angabe, kein Risiko und keine Anweisung", () => {
    const texte = Object.values(ANAMNESE_FRAGEN).flatMap((q) => (q.hinweis ? [q.hinweis.text] : []));
    expect(texte.length).toBeGreaterThan(8);
    for (const t of texte) expect(t, t).not.toMatch(/risiko|prophylaxe|prüfen|ggf\.|:|\bvor\b|wundheilung|nekrose|einplanen|abklären|empfohlen/i);
  });

  it("Anliegen: Angst wird beschrieben, nicht angewiesen", () => {
    expect(ANLIEGEN.angst.hinweis?.text).toBe("Angst vor der Behandlung angegeben");
    for (const a of Object.values(ANLIEGEN)) if (a.hinweis) expect(a.hinweis.text, a.key).not.toMatch(/patient:|einplanen|mehr Zeit|risiko|:/i);
  });
});

describe("Übernommene Angaben vom Gerät des Patienten (vorbefuellt)", () => {
  const jetzt = new Date("2026-11-17T10:00:00Z");
  const voll = { q: allNo(hausarzt), wishes: [], confirmName: "M. Weber" };
  const mit = (vorbefuellt: unknown) => ({ ...voll, vorbefuellt });

  it("nur mit Erlaubnis (Bogen auf dem Gerät des Patienten), sonst gilt der Bogen als geändert", () => {
    const ohne = anamnesePruefen(mit({ stand: "2026-11-01", geprueft: true }), hausarzt, { jetzt });
    expect(ohne).toEqual({ ok: false, fehler: "Der Bogen hat sich geändert. Bitte laden Sie die Seite neu." });
    // Ohne Übernahme bleibt alles wie bisher.
    const normal = anamnesePruefen(voll, hausarzt, { vorbefuelltErlaubt: true, jetzt });
    expect(normal.ok && normal.vorbefuelltStand).toBe(null);
    expect(anamnesePruefen({ ...voll, vorbefuellt: null }, hausarzt, { jetzt }).ok).toBe(true);
  });

  it("ein gültiger Stand wird als Tag gespeichert, getrennt von den Antworten", () => {
    const p = anamnesePruefen(mit({ stand: "2026-11-01", geprueft: true }), hausarzt, { vorbefuelltErlaubt: true, jetzt });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.vorbefuelltStand?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(JSON.stringify(p.daten)).not.toMatch(/vorbefuellt|2026-11-01/);
  });

  it("lehnt Zukunft, zu alte, ungültige und unbestätigte Angaben ab", () => {
    const fehler = (v: unknown) => {
      const p = anamnesePruefen(mit(v), hausarzt, { vorbefuelltErlaubt: true, jetzt });
      return p.ok ? "ok" : p.fehler;
    };
    expect(fehler({ stand: "2026-11-18", geprueft: true })).toBe("ok"); // ein Tag Spielraum für Zeitzonen
    expect(fehler({ stand: "2025-11-16", geprueft: true })).toBe("ok");
    for (const v of [
      { stand: "2026-11-19", geprueft: true },
      { stand: "2025-11-15", geprueft: true },
      { stand: "2026-02-30", geprueft: true },
      { stand: "17.11.2026", geprueft: true },
      { stand: "2026-11-01", geprueft: false },
      { stand: "2026-11-01" },
      "2026-11-01",
      true,
    ]) expect(fehler(v), JSON.stringify(v)).toMatch(/übernommenen Angaben/);
  });

  it("nimmt keine Herkunft an: weitere Felder (Praxis, Fach, Kopie) werden abgelehnt", () => {
    for (const extra of [{ praxis: "Zahnarztpraxis A" }, { fach: "zahn" }, { kopie: "Meine Angaben" }, { gruppe: "zahn" }]) {
      const p = anamnesePruefen(mit({ stand: "2026-11-01", geprueft: true, ...extra }), hausarzt, { vorbefuelltErlaubt: true, jetzt });
      expect(p.ok, JSON.stringify(extra)).toBe(false);
    }
  });
});
