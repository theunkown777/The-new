import { MODELL_SPRACHEN_FERTIG, type ModellSprache, type ModellTexte } from "./schluessel";

/** Wörterbuch einer Portalsprache für die Modelle; Deutsch und unbekannte Sprachen: null. Nur auf dem Server laden. */
export async function modellTexte(lang: string): Promise<ModellTexte | null> {
  if (!(MODELL_SPRACHEN_FERTIG as readonly string[]).includes(lang as ModellSprache)) return null;
  switch (lang) {
    case "en": return (await import("./en.json")).default as ModellTexte;
    case "tr": return (await import("./tr.json")).default as ModellTexte;
    case "pl": return (await import("./pl.json")).default as ModellTexte;
    case "ru": return (await import("./ru.json")).default as ModellTexte;
    case "uk": return (await import("./uk.json")).default as ModellTexte;
    default: return null;
  }
}
