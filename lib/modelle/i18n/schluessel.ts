// Übersetzungen der Modelle hängen am deutschen Ausgangstext: Der Schlüssel ist ein kurzer
// Fingerabdruck des deutschen Satzes. Fehlt eine Übersetzung, bleibt der deutsche Text stehen.
export function textSchluessel(de: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < de.length; i++) {
    const c = de.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

export type ModellTexte = Record<string, string>;
export const MODELL_SPRACHEN = ["en", "tr", "pl", "ru", "uk"] as const;
export type ModellSprache = (typeof MODELL_SPRACHEN)[number];
/** Sprachen, deren Übersetzung vollständig ist. Nur diese werden Patienten angeboten; die übrigen sind angefangen. */
export const MODELL_SPRACHEN_FERTIG: readonly ModellSprache[] = ["en", "uk"];

/** Übersetzen mit Platzhaltern: uebersetze(w, "Zahn {nr}", { nr: 36 }) */
export function uebersetze(w: ModellTexte | null | undefined, de: string, werte?: Record<string, string | number>): string {
  let s = w?.[textSchluessel(de)] ?? de;
  if (werte) for (const [k, v] of Object.entries(werte)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
