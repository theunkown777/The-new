// Baupläne der 3D-Modelle für die Frage „Wo haben Sie Beschwerden?“: je Art das echte Modell.
// Körper und Haut: Haut des ganzen Menschen (haut.glb), auf Wunsch mit dem Skelett darunter (Gelenke).
// Zähne: Kiefer, Zähne, Zahnfleisch, Zunge und Gaumen (mund.glb) mit offenem Mund, ohne Gesicht.
// Augen und HNO: Kopf-Scan mit Gesicht und Ohren (kopf.glb).
import type { KurzArt } from "@/lib/kurzcheck";
import type { Drei } from "@/components/modelle/drei/Buehne";
import type { Bauplan } from "@/components/modelle/drei/Modell3D";
import { ladeDatei } from "@/components/modelle/drei/echt";
import { MUND_ACHSE, MUND_OFFEN, kiefergelenkKugeln } from "@/components/modelle/drei/mundBau";
import { KOERPER_KUGEL } from "@/components/modelle/drei/koerperEcht";

/** Ausschnitt je Art: Mitte und Radius der Kugel, die die Kamera zeigt */
export const ORT_KUGEL: Record<"koerper" | "kopf" | "zahn", { mitte: [number, number, number]; radius: number }> = {
  koerper: KOERPER_KUGEL,
  kopf: { mitte: [0, 712, 20], radius: 118 },
  zahn: { mitte: [0, 676, 46], radius: 58 },
};

export function ortBauplan(T: Drei, art: KurzArt): Bauplan {
  if (art === "zahn") {
    return {
      kugel: ORT_KUGEL.zahn, winkel: 0, hoehe: 0.2, selbstDrehen: false,
      // Mund gleich offen: Ober- und Unterkiefer mit allen Zähnen zu sehen
      klappe: { achse: MUND_ACHSE, winkel: MUND_OFFEN },
      auftraege: [async () => ladeDatei(T, "mund"), () => kiefergelenkKugeln(T)],
    };
  }
  if (art === "auge" || art === "hno") {
    return { kugel: ORT_KUGEL.kopf, winkel: art === "hno" ? -0.6 : 0, hoehe: 0.04, selbstDrehen: false, auftraege: [async () => ladeDatei(T, "kopf")] };
  }
  return { kugel: ORT_KUGEL.koerper, boden: -860, winkel: 0, hoehe: 0.06, selbstDrehen: false, auftraege: [async () => ladeDatei(T, "haut")] };
}
