// Schnittmodelle im Raum (Auge, Ohr, Haut, Zahn im Längsschnitt): Die Schnittzeichnung wird zu
// einer Gewebescheibe mit Tiefe. Jedes Teil bekommt gerundete Kanten und eine eigene Höhe, so
// dass die Schichten wie bei einem anatomischen Präparat plastisch hervortreten.
import type * as DREI from "three";
import type { Form } from "@/lib/modelle/formen";
import { pfadPunkte } from "@/lib/modelle/drei/pfad";
import type { Drei } from "./Buehne";
import type { Bauplan } from "./Modell3D";
import { rohr, stoff } from "./werkzeug";

export interface ScheibenTeil { id: string; farbe: string; formen: Form[] }

export function scheibeBauplan(T: Drei, teile: ScheibenTeil[], breite: number, hoehe: number, ursprung: [number, number] = [0, 0]): Bauplan {
  const mx = ursprung[0] + breite / 2, my = ursprung[1] + hoehe / 2, dicke = Math.min(breite, hoehe) * 0.13;
  const auftraege = teile.map((teil, rang) => () => {
    const meshes: DREI.Mesh[] = [];
    // Spätere Teile der Zeichnung liegen obenauf: Sie treten etwas weiter hervor.
    const vor = dicke * (0.82 + 0.18 * (rang / Math.max(1, teile.length - 1)));
    for (const f of teil.formen) for (const t of pfadPunkte(f.d, 2.5)) {
      let g: DREI.BufferGeometry;
      if (f.strich || !t.geschlossen) {
        if (t.punkte.length < 2) continue;
        g = rohr(T, t.punkte.map((p): [number, number, number] => [p[0] - mx, my - p[1], vor * 0.9]), Math.max(1, (f.strich ?? 2.5) / 2));
      } else {
        if (t.punkte.length < 3) continue;
        // Prisma mit gerundeten Kanten, mittig um z = 0
        const form = new T.Shape(t.punkte.map((p) => new T.Vector2(p[0] - mx, my - p[1])));
        g = new T.ExtrudeGeometry(form, { depth: 2 * vor, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.4, bevelSegments: 4, curveSegments: 4 });
        g.translate(0, 0, -vor);
      }
      const mesh = new T.Mesh(g, stoff(T, teil.farbe, "gewebe"));
      mesh.userData = { kennung: teil.id, gruppe: "scheibe" };
      meshes.push(mesh);
    }
    return meshes;
  });
  return { kugel: { mitte: [0, 0, 0], radius: Math.hypot(breite, hoehe) / 2 }, winkel: 0.45, auftraege };
}
