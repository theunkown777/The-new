// Was die echten 3D-Daten enthalten (erzeugt von scripts/anatomie-3d/bauen.mjs, siehe anatomieInhalt.json)
// und wie die Ebenen des Körpers schrittweise gezeigt werden: Haut → Muskeln → Organe → Skelett → Nerven.
import inhalt from "./anatomieInhalt.json";
import type { Ebene } from "../koerper";

export type DateiId = "haut" | "skelett" | "sehnen" | "muskeln" | "lunge" | "herz" | "verdauung" | "harnwege" | "gehirn" | "nerven" | "auge" | "hno" | "mund" | "kopf";
export interface DateiInhalt { name: string; bytes: number; dreiecke: number; rahmen: { min: number[]; max: number[] }; teile: { name: string; g: string; geschlecht?: string; mitte: number[] }[]; gelenk?: { R: number[]; L: number[] }; achse?: number[]; mund?: number[] }
export const ANATOMIE = inhalt as unknown as Record<DateiId, DateiInhalt>;
export const ANATOMIE_PFAD = "/anatomie-3d";

/** Quellenangabe, wie es die Lizenzen verlangen. */
export const ANATOMIE_QUELLE = "Anatomie: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 JP · Kopf: Lee Perry-Smith, CC BY 3.0";

/** Kennung (z. B. „lunge:R“, „11“, „mund:zunge“) → Datei, in der sie liegt */
export const DATEI_VON: Record<string, DateiId> = {};
for (const [d, i] of Object.entries(ANATOMIE) as [DateiId, DateiInhalt][]) for (const t of i.teile) if (!t.name.startsWith("deko:") && !DATEI_VON[t.name]) DATEI_VON[t.name] = d;
/** Strukturen des Körpermodells, die es auch räumlich (aus echten Daten) gibt. */
export const IN_3D = new Set(Object.keys(DATEI_VON).filter((k) => k.includes(":") && !k.startsWith("mund:")).map((k) => k.split(":")[0]));

/** Stufen der Ebenen, von außen nach innen. */
export type Stufe = "haut" | "muskeln" | "organe" | "skelett" | "nerven";
export const STUFEN: { id: Stufe; name: string }[] = [
  { id: "haut", name: "Haut" }, { id: "muskeln", name: "Muskeln" }, { id: "organe", name: "Organe" }, { id: "skelett", name: "Skelett" }, { id: "nerven", name: "Nerven" },
];
/** Welche Ebenen des Schemas eine Stufe zeigt (Haut: nur der Umriss). */
export const STUFE_EBENEN: Record<Stufe, Ebene[]> = { haut: [], muskeln: ["muskeln", "sehnen"], organe: ["organe"], skelett: ["knochen"], nerven: ["nerven"] };
export const stufeFuerEbene = (e: Ebene): Stufe => (e === "knochen" ? "skelett" : e === "sehnen" ? "muskeln" : e === "organe" ? "organe" : e === "nerven" ? "nerven" : "muskeln");

/** Ist ein Teil (Gruppe g, Kennung k) in dieser Stufe zu sehen? Bandscheiben gehören zum Skelett, das Gehirn auch zu den Nerven. */
export function inStufe(stufe: Stufe, g: string, k?: string | null): boolean {
  switch (stufe) {
    case "haut": return g === "haut";
    case "muskeln": return g === "muskeln" || (g === "sehnen" && k !== "bandscheiben:M");
    case "organe": return g === "organe";
    case "skelett": return g === "knochen" || k === "bandscheiben:M";
    case "nerven": return g === "nerven" || k === "gehirn:M";
  }
}
/** Welche Dateien eine Stufe braucht. */
export const STUFE_DATEIEN: Record<Stufe, DateiId[]> = {
  haut: ["haut"], muskeln: ["muskeln", "sehnen"], organe: ["lunge", "herz", "verdauung", "harnwege", "gehirn"], skelett: ["skelett", "sehnen"], nerven: ["nerven", "gehirn"],
};
/** Dateien für frei kombinierte Ebenen. */
export function dateienFuerEbenen(ebenen: Ebene[], haut: boolean): DateiId[] {
  const d = new Set<DateiId>();
  if (haut) d.add("haut");
  if (ebenen.includes("knochen")) d.add("skelett");
  if (ebenen.includes("muskeln")) d.add("muskeln");
  if (ebenen.includes("sehnen") || ebenen.includes("knochen")) d.add("sehnen");
  if (ebenen.includes("organe")) for (const x of STUFE_DATEIEN.organe) d.add(x);
  if (ebenen.includes("nerven")) d.add("nerven");
  return Array.from(d);
}
