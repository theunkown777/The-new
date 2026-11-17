// Klein und ohne Katalog, damit auch proxy.ts (Edge) es nutzen kann.

/**
 * Handelsnamen verschreibungspflichtiger Arzneimittel → Wirkstoff oder Leistung (§ 10 Abs. 1 HWG). Die öffentliche Suche
 * (/leistungen?q=…) leitet auf den Wirkstoff um, damit der Handelsname weder auf der Seite noch in ihrer Adresse steht.
 */
export const WIRKSTOFF_STATT_HANDELSNAME: Record<string, string> = {
  botox: "Botulinumtoxin",
  vistabel: "Botulinumtoxin",
  bocouture: "Botulinumtoxin",
  azzalure: "Botulinumtoxin",
  dysport: "Botulinumtoxin",
  xeomin: "Botulinumtoxin",
  wegovy: "GLP-1",
  ozempic: "GLP-1",
  saxenda: "GLP-1",
  rybelsus: "GLP-1",
  victoza: "GLP-1",
  mounjaro: "GLP-1",
  shingrix: "Gürtelrose-Impfung",
};
const HANDELSNAME = new RegExp(`\\p{L}*(?:${Object.keys(WIRKSTOFF_STATT_HANDELSNAME).join("|")})\\p{L}*`, "giu");
/** Suchanfrage mit Wirkstoff statt Handelsname („Botox Zornesfalte“ → „Botulinumtoxin Zornesfalte“). */
export const ohneHandelsnamen = (q: string) =>
  q.replace(HANDELSNAME, (m) => WIRKSTOFF_STATT_HANDELSNAME[Object.keys(WIRKSTOFF_STATT_HANDELSNAME).find((k) => m.toLowerCase().includes(k))!]);

/**
 * Parameter der Seite /leistungen mit Wirkstoff statt Handelsname, oder null, wenn die Suche keinen Handelsnamen enthält.
 * Übernimmt nur die Filter der Seite; `ws=1` zeigt dort den Hinweis „Gesucht wird mit dem Wirkstoff“.
 */
export function leistungssucheOhneHandelsnamen(p: URLSearchParams): URLSearchParams | null {
  const q = (p.get("q") ?? "").slice(0, 80);
  const neu = ohneHandelsnamen(q);
  if (neu === q) return null;
  const ziel = new URLSearchParams();
  for (const k of ["bereich", "kt", "inv", "ausfall"]) {
    const v = p.get(k);
    if (v) ziel.set(k, v);
  }
  ziel.set("q", neu.slice(0, 80));
  ziel.set("ws", "1");
  return ziel;
}
