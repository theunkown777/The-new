// Euro-Beträge aus einem Eingabefeld lesen: „24,90“, „1.250,00“, „24.90“ oder „24“.

export const BETRAG_HINWEIS = "Bitte einen Betrag in Euro eingeben, z. B. 24,90.";

/** Gibt den Betrag in Euro zurück oder null, wenn die Eingabe keine Zahl ist. */
export function betragLesen(text: string): number | null {
  const t = text.trim().replace(/\s|€/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+\.\d{1,2}$/.test(t)) return null;
  const zahl = /^\d+\.\d{1,2}$/.test(t) ? Number(t) : Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(zahl) ? zahl : null;
}
