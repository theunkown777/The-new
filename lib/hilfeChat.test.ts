import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHAT_MAX, CHAT_START, chatSchritt, frueheFragen, kiKnopfZeigen, praxismanagerThema, type ChatEreignis, type ChatNachricht, type ChatZustand } from "@/lib/hilfeChat";

const lauf = (ereignisse: ChatEreignis[], z: ChatZustand = CHAT_START) => ereignisse.reduce(chatSchritt, z);
const frage = (text: string, eintraege: string[] = ["vorschlag-neu"]): ChatEreignis => ({ typ: "frage", text, eintraege });
const antwort = (z: ChatZustand, i = -1) => z.nachrichten.at(i) as Extract<ChatNachricht, { art: "hilfe" }>;

describe("chatSchritt", () => {
  it("eine Frage ergibt Frage und Antwort mit den Einträgen", () => {
    const z = lauf([frage("Wie lege ich einen Vorschlag an?")]);
    expect(z.nachrichten).toHaveLength(2);
    expect(z.nachrichten[0]).toMatchObject({ von: "nutzer", text: "Wie lege ich einen Vorschlag an?" });
    expect(z.nachrichten[1]).toMatchObject({ von: "sorrida", art: "hilfe", eintraege: ["vorschlag-neu"] });
  });
  it("leere Fragen ändern nichts; lange werden gekürzt", () => {
    expect(lauf([frage("   ")])).toBe(CHAT_START);
    const z = lauf([frage("x".repeat(900))]);
    expect((z.nachrichten[0] as { text: string }).text.length).toBe(500);
  });
  it("höchstens CHAT_MAX Nachrichten, die ältesten fallen weg, Kennungen bleiben eindeutig", () => {
    const z = lauf(Array.from({ length: 30 }, (_, i) => frage(`Frage ${i}`)));
    expect(z.nachrichten).toHaveLength(CHAT_MAX);
    expect((z.nachrichten.at(-2) as { text: string }).text).toBe("Frage 29");
    expect(new Set(z.nachrichten.map((n) => n.id)).size).toBe(CHAT_MAX);
  });
  it("Praxismanager-Thema wird an der Antwort vermerkt", () => {
    const z = lauf([{ typ: "frage", text: "Welche Rechnungen sind offen?", eintraege: [], thema: "rechnungen" }]);
    expect(antwort(z).thema).toBe("rechnungen");
  });
  it("Meldung der Seite: einmal je Eintrag", () => {
    const m: ChatEreignis = { typ: "meldung", meldung: "Nicht angemeldet", eintrag: "meldung-nicht-angemeldet" };
    const z = lauf([m, m]);
    expect(z.nachrichten).toHaveLength(1);
    expect(z.nachrichten[0]).toMatchObject({ art: "meldung", eintrag: "meldung-nicht-angemeldet" });
  });
  it("KI: läuft, Antwort oder Fehler hängen an der passenden Antwort", () => {
    let z = lauf([frage("Erste Frage"), frage("Zweite Frage")]);
    const zu = antwort(z).id;
    z = chatSchritt(z, { typ: "ki-start", zu });
    expect(antwort(z).ki).toEqual({ art: "laeuft" });
    expect(antwort(z, 1).ki).toBeUndefined();
    z = chatSchritt(z, { typ: "ki-antwort", zu, passt: true, antwort: "So geht es.", quellen: ["vorschlag-neu"] });
    expect(antwort(z).ki).toMatchObject({ art: "antwort", passt: true, quellen: ["vorschlag-neu"] });
    z = chatSchritt(z, { typ: "ki-fehler", zu: 999, text: "x" });
    expect(antwort(z).ki?.art).toBe("antwort");
  });
  it("leeren entfernt den Verlauf", () => {
    expect(lauf([frage("a b"), { typ: "leeren" }]).nachrichten).toEqual([]);
  });
});

describe("KI nur auf Knopfdruck", () => {
  it("Knopf nur bei aktiven KI-Hilfen, je Antwort, nicht während sie läuft oder wenn sie schon da ist", () => {
    let z = lauf([frage("Wie lege ich einen Vorschlag an?")]);
    const n = antwort(z);
    expect(kiKnopfZeigen(n, false)).toBe(false);
    expect(kiKnopfZeigen(n, true)).toBe(true);
    expect(kiKnopfZeigen(z.nachrichten[0], true)).toBe(false);
    z = chatSchritt(z, { typ: "ki-start", zu: n.id });
    expect(kiKnopfZeigen(antwort(z), true)).toBe(false);
    z = chatSchritt(z, { typ: "ki-fehler", zu: n.id, text: "weg" });
    expect(kiKnopfZeigen(antwort(z), true)).toBe(true);
    z = chatSchritt(z, { typ: "ki-antwort", zu: n.id, passt: false, antwort: "", quellen: [] });
    expect(kiKnopfZeigen(antwort(z), true)).toBe(false);
  });
  it("Verlauf für die KI: höchstens drei frühere Fragen, ohne Antworten und ohne die Frage selbst", () => {
    const z = lauf(["eins", "zwei", "drei", "vier", "fünf"].map((t) => frage(t)));
    const letzte = antwort(z).id;
    expect(frueheFragen(z, letzte)).toEqual(["zwei", "drei", "vier"]);
    expect(frueheFragen(z, antwort(z, 1).id)).toEqual([]);
    expect(frueheFragen(z, antwort(z, 3).id)).toEqual(["eins"]);
    expect(JSON.stringify(frueheFragen(z, letzte))).not.toContain("vorschlag-neu");
  });
});

describe("Praxismanager-Weiche", () => {
  it.each([
    ["Welche Rechnungen sind offen?", "rechnungen"],
    ["Wer ist zur Vorsorge fällig?", "vorsorge"],
    ["Wie voll ist der Kalender heute?", "termine"],
    ["Wo hakt es gerade?", "engpaesse"],
    ["Welche Berichte warten auf Freigabe?", "berichte"],
    ["Was ist nicht abgerechnet?", "abrechnung"],
    ["Wie läuft der Umsatz?", "umsatz"],
  ])("%s → %s", (f, t) => expect(praxismanagerThema(f)).toBe(t));
  it("Fragen zur Bedienung bleiben bei der Hilfe", () => {
    for (const f of ["Wo sehe ich offene Rechnungen?", "Wie trage ich einen Termin ein?", "Wie lege ich einen Vorschlag an?", "Was bedeutet Beachten im Praxismanager?", "Warum zeigt der Praxismanager keinen Umsatz?"]) expect(praxismanagerThema(f), f).toBeNull();
  });
  it("Umsatz nur mit Recht auf die Analyse", () => {
    expect(praxismanagerThema("Wie läuft der Umsatz?", { analyse: false })).toBeNull();
    expect(praxismanagerThema("Wie läuft der Umsatz?", { analyse: true })).toBe("umsatz");
  });
});

describe("Nichts wird gespeichert", () => {
  it("Chat und Zeiger nutzen keinen Speicher im Browser und keine Cookies", () => {
    for (const d of ["lib/hilfeChat.ts", "lib/hilfeZeiger.ts", "lib/hilfeSuche.ts", "components/FragSorrida.tsx", "components/HilfeZeiger.tsx", "components/WebsiteHilfe.tsx"]) {
      const t = readFileSync(d, "utf8").replace(/\/\/.*$/gm, "");
      expect(t, d).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    }
  });
  it("auf der Website kein KI-Knopf und keine Anfrage an die KI", () => {
    const t = readFileSync("components/FragSorrida.tsx", "utf8");
    expect(t).toContain('const kiAktiv = modus === "app" && ki;');
    expect(readFileSync("components/WebsiteHilfe.tsx", "utf8")).not.toMatch(/\bki=/);
  });
});
