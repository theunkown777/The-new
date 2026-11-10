// Gebiss im Raum: Jeder Zahn bekommt aus seinem Umriss (Blick auf die Kaufläche) eine Krone mit
// gerundeten Kanten und Wurzeln. Ober- und Unterkiefer stehen übereinander, das Zahnfleisch
// umschließt die Zahnhälse, der Unterkiefer lässt sich öffnen und schließen.
import type * as DREI from "three";
import { MILCHZAEHNE, ZAEHNE, zahnKennung, type Zahn } from "@/lib/modelle/gebiss";
import { pfadPunkte } from "@/lib/modelle/drei/pfad";
import type { Drei } from "./Buehne";
import type { Bauplan } from "./Modell3D";
import { stoff } from "./werkzeug";

// Bild → Raum: x bleibt, die Bildhöhe wird zur Tiefe (Schneidezähne vorn), die Höhe kommt dazu.
const HINTEN = { oben: 252, unten: 318 } as const;
const TIEF_MITTE = 95;
const raumXZ = (z: Zahn, x: number, y: number): [number, number] => [x - 200, (z.kiefer === "oben" ? HINTEN.oben - y : y - HINTEN.unten) - TIEF_MITTE];

const KRONE: Record<string, number> = { schneidezahn: 21, eckzahn: 23, praemolar: 16, molar: 14, weisheitszahn: 13 };
const WURZEL: Record<string, number> = { schneidezahn: 26, eckzahn: 32, praemolar: 25, molar: 23, weisheitszahn: 19 };
const wurzelZahl = (z: Zahn) => (z.art === "molar" || z.art === "weisheitszahn" ? (z.kiefer === "oben" ? 3 : 2) : z.art === "praemolar" && z.kiefer === "oben" && z.pos === 4 ? 2 : 1);

export function gebissBauplan(T: Drei, verbinde: (g: DREI.BufferGeometry[]) => DREI.BufferGeometry): Bauplan {
  const auftraege: (() => DREI.Mesh[])[] = [];
  const SPALT = 1.2; // halber Abstand der Kauflächen bei geschlossenem Mund

  const zahnMesh = (z: Zahn): DREI.Mesh | null => {
    const [t] = pfadPunkte(z.form.d, 1.4);
    if (!t) return null;
    const oben = z.kiefer === "oben", vz = oben ? 1 : -1, klein = z.milch ? 0.78 : 1;
    const hk = KRONE[z.art] * klein, hw = WURZEL[z.art] * klein;
    const [mx, mz] = raumXZ(z, z.mitte[0], z.mitte[1]);
    // Umriss um die Zahnmitte, in der Ebene der Kaufläche (x, Tiefe)
    const form = new T.Shape(t.punkte.map((p) => { const [x, zz] = raumXZ(z, p[0], p[1]); return new T.Vector2(x - mx, zz - mz); }));
    const krone = new T.ExtrudeGeometry(form, { depth: hk - 4, bevelEnabled: true, bevelThickness: 2.2, bevelSize: 1.5, bevelSegments: 5, curveSegments: 6, steps: 6 });
    // Extrusion läuft entlang +z; aufrichten: Tiefe des Körpers wird zur Höhe (y), Umriss liegt in (x, z)
    krone.rotateX(Math.PI / 2); // (x, y, z) → (x, −z, y): Umriss-y wird Tiefe, Extrusion zeigt nach unten
    krone.translate(0, hk - 2.2, 0); // Krone von y = 0 (Kaufläche) bis y = hk (Zahnhals)
    // Form geben: zum Zahnhals schmaler; Schneidezähne zur Schneide hin flach, Eckzähne spitz, Backenzähne mit Höckern
    const aussen = new T.Vector2(mx, mz + TIEF_MITTE * 0.4).normalize(); // etwa nach außen (vom Bogen weg)
    const p = krone.getAttribute("position") as DREI.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), zz = p.getZ(i), h = Math.max(0, Math.min(1, y / hk)); // 0 = Kaufläche, 1 = Zahnhals
      let sx = 1 - 0.16 * h * h, sz = sx, dy = 0;
      if (z.art === "schneidezahn" || z.art === "eckzahn") {
        // Dicke (nach außen/innen) nimmt zur Schneide hin ab
        const d = x * aussen.x + zz * aussen.y, schmal = z.art === "eckzahn" ? 0.42 : 0.3, k = schmal + (1 - schmal) * Math.min(1, h * 1.7);
        const nx = x + aussen.x * d * (k - 1), nz = zz + aussen.y * d * (k - 1);
        p.setXYZ(i, nx * sx, y, nz * sz);
        if (z.art === "eckzahn") { const quer = x * -aussen.y + zz * aussen.x; p.setY(i, y + (1 - h) * Math.abs(quer) * 0.32); }
        continue;
      }
      // Höcker: Kaufläche leicht gewellt, in der Mitte eine Rille
      if (h < 0.35) { const r = Math.hypot(x, zz); dy = (1 - h / 0.35) * (1.6 * Math.cos(r * 0.42) - 0.9); sx = sz = 1; }
      p.setXYZ(i, x * sx, y - dy, zz * sz);
    }
    const teile: DREI.BufferGeometry[] = [krone];
    const n = wurzelZahl(z), rb = Math.max(2.4, Math.sqrt(Math.abs(T.ShapeUtils.area(form.getPoints(8)))) * (n > 1 ? 0.3 : 0.42));
    for (let i = 0; i < n; i++) {
      const w = new T.CylinderGeometry(rb * 0.22, rb, hw, 12, 4);
      w.translate(0, hk + hw / 2 - 1, 0);
      const wp = w.getAttribute("position") as DREI.BufferAttribute;
      // mehrere Wurzeln spreizen sich leicht
      const winkel = n === 1 ? 0 : (i / n) * Math.PI * 2 + 0.6, ab = n === 1 ? 0 : rb * 0.85;
      for (let k = 0; k < wp.count; k++) { const hh = Math.max(0, (wp.getY(k) - hk) / hw); wp.setX(k, wp.getX(k) + Math.cos(winkel) * ab * (0.75 + hh * 0.7)); wp.setZ(k, wp.getZ(k) + Math.sin(winkel) * ab * (0.75 + hh * 0.7)); }
      teile.push(w);
    }
    const g = verbinde(teile.map((x) => { const y = x.index ? x.toNonIndexed() : x; y.deleteAttribute("uv"); return y; }));
    // Unterkiefer: Krone nach oben; Oberkiefer: gespiegelt (Krone nach unten, Wurzeln nach oben)
    if (oben) g.translate(mx, SPALT, mz);
    else {
      // spiegeln und die Dreiecke umdrehen, damit die Flächen weiter nach außen zeigen
      g.scale(1, -1, 1); g.translate(mx, -SPALT, mz);
      const q = g.getAttribute("position") as DREI.BufferAttribute, a = q.array as Float32Array;
      for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const m = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = m; }
    }
    g.deleteAttribute("normal");
    g.computeVertexNormals();
    const mesh = new T.Mesh(g, stoff(T, z.milch ? 0xfbf9f3 : 0xf5efdf, "zahn"));
    void vz;
    mesh.userData = { kennung: zahnKennung(z.fdi), gruppe: z.milch ? "milch" : "bleibend", klappe: !oben, blickTheta: Math.atan2(mx, mz + TIEF_MITTE * 0.9) * 0.9, blickPhi: oben ? 1.75 : 1.2 };
    return mesh;
  };

  const zahnfleisch = (zaehne: Zahn[], kiefer: "oben" | "unten", milch: boolean): DREI.Mesh => {
    const reihe = zaehne.filter((z) => z.kiefer === kiefer).sort((a, b) => (a.seite === "rechts" ? -a.pos : a.pos) - (b.seite === "rechts" ? -b.pos : b.pos));
    const pts = reihe.map((z) => { const [x, zz] = raumXZ(z, z.mitte[0], z.mitte[1]); return new T.Vector3(x, 0, zz); });
    // Enden etwas verlängern, damit der letzte Backenzahn ganz im Zahnfleisch steht
    const a = pts[0].clone().add(pts[0].clone().sub(pts[1]).multiplyScalar(0.7)), e = pts[pts.length - 1].clone().add(pts[pts.length - 1].clone().sub(pts[pts.length - 2]).multiplyScalar(0.7));
    const g = new T.TubeGeometry(new T.CatmullRomCurve3([a, ...pts, e], false, "centripetal"), 90, milch ? 9.5 : 12, 14, false);
    const vz = kiefer === "oben" ? 1 : -1, hals = (milch ? 15 : 19) * vz;
    g.scale(1, milch ? 2.0 : 2.15, 1);
    g.translate(0, hals + vz * (milch ? 16 : 22), 0);
    const mesh = new T.Mesh(g, stoff(T, 0xe58f8c, "zahnfleisch"));
    mesh.userData = { gruppe: milch ? "milch" : "bleibend", fleisch: true, klappe: kiefer === "unten" };
    return mesh;
  };

  for (const [liste, milch] of [[ZAEHNE, false], [MILCHZAEHNE, true]] as const) {
    auftraege.push(() => [zahnfleisch(liste, "oben", milch), zahnfleisch(liste, "unten", milch)]);
    for (let i = 0; i < liste.length; i += 4) auftraege.push(() => liste.slice(i, i + 4).map(zahnMesh).filter((m): m is DREI.Mesh => !!m));
  }
  // Gelenkachse des Unterkiefers: hinter den Backenzähnen, etwas oberhalb der Kauebene
  return { kugel: { mitte: [0, 0, 0], radius: 150 }, winkel: 0.5, klappe: { achse: [0, 26, -150], winkel: 0.3 }, auftraege };
}
