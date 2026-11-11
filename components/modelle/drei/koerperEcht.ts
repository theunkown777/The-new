// Körper aus echten Daten: Rahmen (Kamera) für den ganzen Körper oder ein Organ, Sichtbarkeit je Stufe.
import { ANATOMIE, type DateiId } from "@/lib/modelle/drei/anatomie";
import { FOKUS, imFokus, type Fokus, type FokusId } from "@/lib/modelle/fokus";

/** Dateien, die nur für ein Organ gezeigt werden, nie im ganzen Körper (Auge, HNO, Mund, Kopf). */
export const NUR_FOKUS: DateiId[] = ["auge", "hno", "mund", "kopf"];

export const KOERPER_KUGEL: { mitte: [number, number, number]; radius: number } = { mitte: [0, 0, 0], radius: 880 };

/** Mittelpunkt und Radius, die ein Organ (Fokus) ganz zeigen. */
export function fokusKugel(f: Fokus): { mitte: [number, number, number]; radius: number } {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const nimm = (p: number[], rand: number) => { for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k] - rand); max[k] = Math.max(max[k], p[k] + rand); } };
  for (const d of f.dateien) {
    const i = ANATOMIE[d];
    if (!i) continue;
    if (!f.strukturen && !f.hoehe) { nimm(i.rahmen.min, 0); nimm(i.rahmen.max, 0); continue; }
    for (const t of i.teile) if (imFokus(f, t.name, t.mitte[1])) nimm(t.mitte, 45);
  }
  if (!Number.isFinite(min[0])) return KOERPER_KUGEL;
  const mitte: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.max(40, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2) * 0.92;
  return { mitte, radius };
}
export const fokusKugelVon = (id: FokusId) => fokusKugel(FOKUS[id]);
