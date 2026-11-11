// Mund aus echten Daten: Gesicht (Lee-Perry-Smith-Scan) und dahinter Kiefer, Zähne, Zunge und Gaumen
// (BodyParts3D). Die Kamera fährt wie beim Abbeißen auf die Lippen zu, der Mund öffnet sich, das
// Gesicht löst sich auf und der Blick geht hinein.
import { ANATOMIE } from "@/lib/modelle/drei/anatomie";
import type { Buehne, Drei } from "./Buehne";
import type { Bauplan } from "./Modell3D";
import { ladeDatei, stoffEcht } from "./echt";

export const MUND_OFFEN = 0.32;
const M = (ANATOMIE.kopf?.mund ?? [0, 676, 96]) as [number, number, number];
const ACHSE = (ANATOMIE.mund?.achse ?? [0, 722, -5]) as [number, number, number];
/** Mitte des Zahnbogens: dorthin schaut die Kamera am Ende */
const BOGEN: [number, number, number] = [0, M[1] - 6, M[2] - 52];

export function mundBauplan(T: Drei): Bauplan {
  const zahnBlick = (x: number, z: number) => Math.atan2(x, z - BOGEN[2] + 25) * 0.95;
  return {
    kugel: { mitte: [0, M[1] + 20, M[2] - 30], radius: 120 }, winkel: 0.3, hoehe: 0.08, selbstDrehen: false,
    klappe: { achse: ACHSE, winkel: 0 },
    auftraege: [
      async () => (await ladeDatei(T, "kopf")).map((m) => { m.userData.ueber = "gesicht"; m.userData.gruppe = "gesicht"; return m; }),
      async () => (await ladeDatei(T, "mund")).map((m) => {
        const k = String(m.userData.kennung ?? ""), [x, , z] = m.userData.mitte as number[];
        m.userData.ueber = "innen";
        if (/^\d\d$/.test(k)) Object.assign(m.userData, { zahn: true, blickTheta: zahnBlick(x, z), blickPhi: Number(k[0]) <= 2 ? 1.95 : 1.12 });
        if (k === "mund:zahnfleisch" || k === "mund:oberkiefer" || k === "mund:unterkiefer") m.userData.fleisch = true;
        return m;
      }),
      // Lage der Kiefergelenke: durchscheinende Kugel am Gelenkköpfchen (Markierung, kein Scan)
      () => {
        const g = ANATOMIE.mund?.gelenk;
        if (!g) return [];
        return (["R", "L"] as const).map((s) => {
          const mat = stoffEcht(T, { s: "knorpel", f: "#F2C46B" });
          mat.opacity = 0.6; mat.transparent = true; mat.depthWrite = false;
          const m = new T.Mesh(new T.SphereGeometry(6, 20, 14), mat);
          m.geometry.translate(g[s][0], g[s][1] - 3, g[s][2]);
          m.userData = { kennung: "mund:kiefergelenk", gruppe: "knochen", ueber: "innen", klappe: 0, mitte: g[s] };
          return m;
        });
      },
    ],
  };
}

/** Die Fahrt in den Mund (etwa 2,6 s). Anfassen bricht ab und springt in den Endzustand. */
export function inDenMund(b: Buehne, fertig?: () => void) {
  const glatt = (a: number, e: number, t: number) => { const x = Math.max(0, Math.min(1, (t - a) / (e - a))); return x * x * (3 - 2 * x); };
  const ende = () => { b.klappen(MUND_OFFEN); b.gesicht(0); fertig?.(); };
  b.gesicht(1); b.klappen(0);
  b.fahrt([
    { pos: [95, M[1] + 70, M[2] + 360], ziel: [0, M[1] + 30, M[2] - 25] },
    { pos: [20, M[1] + 14, M[2] + 115], ziel: [0, M[1] + 2, M[2] - 40] },
    { pos: [0, M[1] + 10, M[2] + 38], ziel: [0, M[1] - 4, M[2] - 60] },
    { pos: [50, M[1] + 62, M[2] + 80], ziel: [0, M[1] - 12, M[2] - 45] },
  ], 2700, {
    beiT: (t) => { b.klappen(MUND_OFFEN * glatt(0.06, 0.42, t)); b.gesicht(1 - glatt(0.36, 0.6, t)); },
    ende, abbruch: ende,
  });
}

/** Zurück vor das Gesicht (Mund schließt sich). */
export function vorDasGesicht(b: Buehne) {
  b.gesicht(1); b.klappen(0);
  b.fahrt([{ pos: [95, M[1] + 70, M[2] + 360], ziel: [0, M[1] + 30, M[2] - 25] }], 1600, { vonHier: true });
}
