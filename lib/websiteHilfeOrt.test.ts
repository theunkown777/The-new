// Wo „Frag Sorrida“ auf der Website erscheint, und vor allem wo nicht: Auf der Vorschau-Domain schreibt proxy.ts gesperrte
// Seiten auf /demnaechst um, die Adresse im Browser bleibt dabei „/“ oder „/fachgebiete“. Ein Blick auf den Pfad im Browser
// reicht deshalb nicht. Sicher ist nur: Der Chat hängt in den Rahmen der Informationsseiten, und die Demnächst-Seite sowie
// alle Seiten, die auch ohne Zugang erreichbar sind, rendern ihn nicht (Pflichtseiten nur, wenn die Infoseiten offen sind).
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { freiOhneZugang, infoSeitenOffen } from "@/lib/vorschau";

const lies = (d: string) => readFileSync(d, "utf8");

/** Alle Seiten außerhalb der App (app/(app)) und der Schnittstellen. */
const seiten = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const d = join(ordner, e.name);
    if (e.isDirectory()) return e.name === "(app)" || e.name === "api" ? [] : seiten(d);
    return e.name === "page.tsx" ? [d] : [];
  });

/** Pfad einer Seite; dynamische Teile werden zu einem langen Beispielwert (wie ein geheimer Link). */
const route = (datei: string) =>
  "/" + datei.replace(/^app\/?/, "").replace(/\/?page\.tsx$/, "").split("/").filter(Boolean).map((t) => (/^\[.+\]$/.test(t) ? "beispielwert1234567890ab" : t)).join("/");

// Bausteine, über die der Website-Chat auf eine Seite kommt.
const MIT_CHAT = /\b(WebsiteHilfe|JournalRahmen|PublicShell|LegalPage|ArticlePage|RechnerSeite|FragSorrida)\b/;

describe("Frag Sorrida auf der Website: nicht hinter dem Vorschau-Schloss", () => {
  it("hängt nicht im Root-Layout (dort sähe es auch die umgeschriebene Demnächst-Seite)", () => {
    expect(lies("app/layout.tsx")).not.toMatch(/WebsiteHilfe|FragSorrida/);
  });

  it("wird nur von der Startseite und vom Rahmen der Unterseiten eingehängt", () => {
    const orte = [...seiten("app"), ...readdirSync("components", { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".tsx")).map((e) => join(e.parentPath, e.name))]
      .filter((d) => /<WebsiteHilfe\b/.test(lies(d)))
      .sort();
    expect(orte).toEqual(["app/page.tsx", join("components", "start", "JournalKopf.tsx")]);
  });

  it("die Demnächst-Seite rendert keinen Rahmen mit Chat", () => {
    const quelle = lies("app/demnaechst/page.tsx");
    expect(quelle).not.toMatch(MIT_CHAT);
    // auch nicht über ihre eigenen Bausteine
    for (const [, name] of quelle.matchAll(/from "@\/components\/([\w/]+)"/g)) expect(lies(`components/${name}.tsx`), name).not.toMatch(MIT_CHAT);
  });

  it("Seiten, die ohne Zugang erreichbar sind, zeigen den Chat höchstens über LegalPage (dort nur bei offenen Infoseiten)", () => {
    const frei = seiten("app").filter((d) => freiOhneZugang(route(d)));
    expect(frei.map(route)).toEqual(expect.arrayContaining(["/demnaechst", "/impressum", "/datenschutz", "/lizenzen", "/avv"]));
    for (const d of frei) {
      const quelle = lies(d);
      if (!MIT_CHAT.test(quelle)) continue;
      expect(quelle, d).toMatch(/\bLegalPage\b/);
      expect(quelle, d).not.toMatch(/\b(WebsiteHilfe|JournalRahmen|PublicShell|ArticlePage|RechnerSeite|FragSorrida)\b/);
    }
    expect(lies("components/LegalPage.tsx")).toMatch(/<JournalRahmen hilfe=\{infoSeitenOffen\(\)\}>/);
  });

  it("im Schloss-Fall (Vorschau-Domain, Stufe aus) sind die Infoseiten zu, also kein Chat auf den Pflichtseiten", () => {
    expect(infoSeitenOffen({ VORSCHAU_HOSTS: "sorrida.test" }, true)).toBe(false);
    // Ohne vollständiges Impressum bleibt alles zu, auch wenn die Variable gesetzt ist.
    expect(infoSeitenOffen({ VORSCHAU_HOSTS: "sorrida.test", VORSCHAU_OEFFENTLICH: "1" }, false)).toBe(false);
    expect(infoSeitenOffen({ VORSCHAU_HOSTS: "sorrida.test", VORSCHAU_OEFFENTLICH: "1" }, true)).toBe(true);
    expect(infoSeitenOffen({}, false)).toBe(true);
  });

  it("Patientenseiten, Links mit Token, eingebettete Fenster und die Übergabe rendern keinen Rahmen mit Chat", () => {
    for (const d of seiten("app").filter((x) => /^app\/(p|portal|a|t|embed|uebergabe|demnaechst)\//.test(x))) expect(lies(d), d).not.toMatch(MIT_CHAT);
  });
});
