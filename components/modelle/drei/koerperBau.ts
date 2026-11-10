// Körper im Raum: Jede Struktur des flachen Modells (Umriss von vorn und/oder hinten) wird zu einem
// runden Körper aufgeblasen und in der richtigen Tiefe eingesetzt. Knochen liegen in der Mitte,
// Organe im Rumpf, Muskeln und Sehnen außen auf Vorder- und Rückseite, darüber eine durchscheinende Haut.
import type * as DREI from "three";
import { KOERPER_BREITE, KOERPER_HOEHE, STRUKTUREN, UMRISS, seiteImBild, teilKennung, type Ebene, type Struktur } from "@/lib/modelle/koerper";
import type { Form, P } from "@/lib/modelle/formen";
import { aufblasen } from "@/lib/modelle/drei/aufblasen";
import { pfadPunkte } from "@/lib/modelle/drei/pfad";
import type { Drei } from "./Buehne";
import { mittePunkte, netzGeometrie, rohr, stoff, type Stoff } from "./werkzeug";

const MX = KOERPER_BREITE / 2, MY = KOERPER_HOEHE / 2;
// Wie flach die Körperabschnitte des Umrisses sind (1 = rund): Kopf, Hals, Rumpf, Oberarm, Unterarm, Hand, Oberschenkel, Unterschenkel, Fuß
const FLACH = [0.98, 1.0, 1.08, 0.92, 0.86, 0.45, 0.94, 0.92, 0.7];
const ABSCHNITTE = UMRISS.flatMap((u, i) => pfadPunkte(u.d).flatMap((t) => t.punkte.slice(1).map((b, k) => ({ a: t.punkte[k], b, r: u.breite / 2, flach: FLACH[i] ?? 0.8 }))));

/** Halbe Dicke des Körpers an einer Stelle des Bildes (0 außerhalb). */
export function hautTiefe(x: number, y: number): number {
  let m = 0;
  for (const s of ABSCHNITTE) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (y - s.a[1]) * dy) / l2)) : 0;
    const d2 = (x - s.a[0] - t * dx) ** 2 + (y - s.a[1] - t * dy) ** 2;
    if (d2 < s.r * s.r) m = Math.max(m, s.flach * Math.sqrt(s.r * s.r - d2));
  }
  return m;
}

const STOFF: Record<Ebene, Stoff> = { knochen: "knochen", organe: "organ", muskeln: "muskel", sehnen: "sehne", nerven: "nerv" };
// Lage in der Tiefe (Anteil der halben Körperdicke) und Wölbung je Ebene
const TIEFE: Record<Ebene, { aussen: number; rund: number; innen: number; max: number }> = {
  knochen: { aussen: 0.3, rund: 0.82, innen: 0.82, max: 0 },
  organe: { aussen: 0.16, rund: 0.75, innen: 0.6, max: 0.5 },
  muskeln: { aussen: 0.6, rund: 0.6, innen: 0.2, max: 0.34 },
  sehnen: { aussen: 0.74, rund: 0.45, innen: 0.2, max: 0.16 },
  nerven: { aussen: 0.42, rund: 0.6, innen: 0.6, max: 0.2 },
};

export interface Bauplan { kugel: { mitte: [number, number, number]; radius: number }; boden: number; auftraege: (() => DREI.Mesh[])[] }

export function koerperBauplan(T: Drei, farbe: (s: Struktur) => string): Bauplan {
  const auftraege: (() => DREI.Mesh[])[] = [];

  // Haut: Kapseln entlang des Umrisses, erst unsichtbar in die Tiefe geschrieben, dann einmal durchscheinend gezeichnet
  auftraege.push(() => {
    const teile: DREI.BufferGeometry[] = [];
    for (const s of ABSCHNITTE) {
      const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const g = new T.CapsuleGeometry(s.r, l, 10, 28);
      g.rotateZ(-Math.atan2(s.b[0] - s.a[0], -(s.b[1] - s.a[1])));
      g.scale(1, 1, s.flach);
      g.translate((s.a[0] + s.b[0]) / 2 - MX, MY - (s.a[1] + s.b[1]) / 2, 0);
      teile.push(g);
    }
    const tiefe = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: true }) as unknown as DREI.MeshStandardMaterial;
    const haut = new T.MeshPhysicalMaterial({ color: 0xd9a888, roughness: 0.6, opacity: 0.13, depthWrite: false, depthFunc: T.LessEqualDepth, sheen: 0.6, sheenColor: new T.Color(0xffe2cf) });
    return teile.flatMap((g) => {
      const a = new T.Mesh(g, tiefe.clone()); a.renderOrder = 8; a.userData = { haut: true, gruppe: "haut" };
      const b = new T.Mesh(g, haut.clone()); b.renderOrder = 9; b.userData = { haut: true, gruppe: "haut" };
      return [a, b];
    });
  });

  for (const s of STRUKTUREN) {
    auftraege.push(() => {
      const meshes: DREI.Mesh[] = [];
      const lage = TIEFE[s.ebene];
      const beide = !!s.vorn && !!s.hinten;
      // Knochen und Organe, die es von beiden Seiten gibt, sind ein Körper in der Mitte; alles andere liegt vorn und/oder hinten außen.
      const ansichten: ("vorn" | "hinten")[] = beide && (s.ebene === "knochen" || s.ebene === "organe") ? ["vorn"] : ([s.vorn ? "vorn" : null, s.hinten ? "hinten" : null].filter(Boolean) as ("vorn" | "hinten")[]);
      const mittig = beide && (s.ebene === "knochen" || s.ebene === "organe");
      for (const ansicht of ansichten) {
        const vz = ansicht === "vorn" ? 1 : -1;
        const formen = s[ansicht] as Form[];
        // Hälften: wie gezeichnet und gespiegelt. Die Rückansicht ist im Bild seitenverkehrt, im Raum wird sie zurückgespiegelt.
        const haelften: { spiegeln: boolean; seite: "R" | "L" | "M" }[] = s.lage === "paarig"
          ? [{ spiegeln: false, seite: seiteImBild(ansicht, "links") }, { spiegeln: true, seite: seiteImBild(ansicht, "rechts") }]
          : s.lage === "mitteGespiegelt" ? [{ spiegeln: false, seite: "M" }, { spiegeln: true, seite: "M" }] : [{ spiegeln: false, seite: "M" }];
        for (const h of haelften) {
          // im Raum gespiegelt? Rückansicht dreht die Seiten um
          const imRaumSpiegeln = h.spiegeln !== (ansicht === "hinten");
          const kennung = teilKennung(s.id, h.seite);
          const daten = { kennung, gruppe: s.ebene, geschlecht: s.geschlecht ?? null, seiteZ: mittig ? 0 : vz };
          for (const f of formen) {
            for (const t of pfadPunkte(f.d, 3)) {
              const m = mittePunkte(t.punkte);
              const dick = Math.max(6, hautTiefe(m[0], m[1]));
              const z = mittig ? 0 : vz * lage.aussen * dick;
              let g: DREI.BufferGeometry;
              if (f.strich || !t.geschlossen) {
                const r = Math.max(1.1, (f.strich ?? 3) / 2);
                // Rippen und andere Linien folgen der Wölbung des Körpers
                const pts = t.punkte.map((p): [number, number, number] => {
                  const hier = Math.max(dick * 0.25, hautTiefe(p[0], p[1]));
                  const zz = mittig ? 0 : vz * lage.aussen * hier;
                  return [(imRaumSpiegeln ? KOERPER_BREITE - p[0] : p[0]) - MX, MY - p[1], zz];
                });
                if (pts.length < 2) continue;
                g = rohr(T, pts, r, 0.8);
              } else {
                const netz = aufblasen(t.punkte, {
                  vorn: vz > 0 || mittig ? lage.rund : lage.innen, hinten: vz > 0 && !mittig ? lage.innen : lage.rund,
                  maxDicke: lage.max ? Math.max(3, lage.max * dick) : undefined,
                });
                if (!netz.index.length) continue;
                // Muskeln, Sehnen und Nerven legen sich um den Körper: Die Tiefe folgt an jedem Punkt der Körperoberfläche.
                const umKoerper = !mittig && s.ebene !== "knochen" && s.ebene !== "organe";
                g = netzGeometrie(T, netz, { mx: MX, my: MY, spiegelX: imRaumSpiegeln ? MX : null, z, zVon: umKoerper ? (x, y) => vz * lage.aussen * Math.max(dick * 0.25, hautTiefe(x, y)) : undefined });
              }
              const mesh = new T.Mesh(g, stoff(T, farbe(s), STOFF[s.ebene]));
              mesh.userData = daten;
              meshes.push(mesh);
            }
          }
        }
      }
      return meshes;
    });
  }
  return { kugel: { mitte: [0, 0, 0], radius: KOERPER_HOEHE / 2 + 10 }, boden: -MY + 28, auftraege };
}
