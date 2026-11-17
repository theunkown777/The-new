// Bausteine für die räumlichen Modelle: Röhren und Materialien.
import type * as DREI from "three";
import type { Drei } from "./Buehne";

/** Röhre entlang einer Punktfolge im Raum (Sehne, Nerv, Rippe). */
export function rohr(T: Drei, punkte: [number, number, number][], radius: number, flach = 1): DREI.BufferGeometry {
  const kurve = new T.CatmullRomCurve3(punkte.map((p) => new T.Vector3(...p)), false, "centripetal");
  const g = new T.TubeGeometry(kurve, Math.max(6, Math.min(80, punkte.length * 2)), radius, 10, false);
  // Enden schließen (kleine Kugelkappen wären schöner; die Enden liegen meist in anderen Teilen)
  if (flach !== 1) g.scale(1, 1, flach);
  return g;
}

export type Stoff = "knochen" | "organ" | "muskel" | "sehne" | "nerv" | "zahn" | "zahnfleisch" | "metall" | "gewebe";
export function stoff(T: Drei, farbe: string | number, art: Stoff, deck = 1): DREI.MeshStandardMaterial {
  const c = new T.Color(farbe as DREI.ColorRepresentation);
  // Die Farben der Schemazeichnung sind für Papier gedacht; im Licht der Bühne wirken sie kräftiger besser.
  const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  if (art === "knochen") c.setHSL(0.105, 0.42, Math.min(hsl.l, 0.8) * 0.94);
  else if (art !== "zahn" && art !== "metall") c.setHSL(hsl.h, Math.min(1, hsl.s * 1.25 + 0.05), hsl.l * 0.86);
  const p = (o: DREI.MeshPhysicalMaterialParameters) => new T.MeshPhysicalMaterial({ color: c, opacity: deck, ...o });
  switch (art) {
    case "knochen": return p({ roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.3, sheenColor: new T.Color(0xfff3dd) });
    case "organ": return p({ roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.28 });
    case "muskel": return p({ roughness: 0.5, clearcoat: 0.22, clearcoatRoughness: 0.45, sheen: 0.4, sheenColor: new T.Color(0xffc9c0) });
    case "sehne": return p({ roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    case "nerv": return p({ roughness: 0.45, clearcoat: 0.3 });
    case "zahn": return p({ roughness: 0.2, clearcoat: 0.85, clearcoatRoughness: 0.12, sheen: 0.2, sheenColor: new T.Color(0xffffff) });
    case "zahnfleisch": return p({ roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    case "metall": return p({ roughness: 0.25, metalness: 0.9 });
    default: return p({ roughness: 0.5, clearcoat: 0.25 });
  }
}
