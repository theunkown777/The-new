// Gruppen der Praxen (Zahnmedizin, ärztliche Praxis, Therapie) mit fester Farbe und festem Symbol.
// Damit lassen sich Portale verschiedener Praxen auf einem Gerät auseinanderhalten: im Kopf der Patientenseiten,
// auf dem Startbildschirm und in „Meine Praxen auf diesem Gerät“.
//
// Diese Datei hat keine Abhängigkeiten. Client-Bausteine (components/MeinePraxen.tsx) lesen Farben und Symbole
// von hier, ohne die große Fachliste (lib/specialties.ts) in den Browser zu laden. Die Zuordnung Fach → Gruppe
// steht in lib/praxisKennung.ts.
//
// Die Farben sind fest und für alle Praxen einer Gruppe gleich. Sie sagen nur „welche Art Praxis“, nie „welche
// Praxis ist besser“. Weiße Schrift und weiße Symbole erreichen auf jeder Farbe mindestens 4,5 : 1.

export const PRAXIS_GRUPPEN = ["zahn", "arzt", "therapie"] as const;
export type PraxisGruppe = (typeof PRAXIS_GRUPPEN)[number];

export interface GruppenFarbe {
  /** Streifen, Symbolfläche und theme_color auf hellem Grund */
  farbe: string;
  /** Streifen und Akzent auf dunklem Grund */
  farbeDunkel: string;
  /** zarte Fläche (Karte) auf hellem Grund */
  flaeche: string;
  /** zarte Fläche (Karte) auf dunklem Grund */
  flaecheDunkel: string;
}

export const GRUPPEN_FARBE: Record<PraxisGruppe, GruppenFarbe> = {
  zahn: { farbe: "#0F766E", farbeDunkel: "#5EEAD4", flaeche: "#F0FDFA", flaecheDunkel: "#10302D" },
  arzt: { farbe: "#1D4ED8", farbeDunkel: "#93C5FD", flaeche: "#EFF6FF", flaecheDunkel: "#152544" },
  therapie: { farbe: "#6D28D9", farbeDunkel: "#C4B5FD", flaeche: "#F5F3FF", flaecheDunkel: "#291C46" },
};

/** Statische Symbole je Gruppe unter public/brand (erzeugt mit scripts/gruppenSymbole.mjs, selbst gezeichnet). */
export const GRUPPEN_SYMBOL: Record<PraxisGruppe, { svg: string; png192: string; png512: string; apple: string }> = {
  zahn: { svg: "/brand/gruppe-zahn.svg", png192: "/brand/gruppe-zahn-192.png", png512: "/brand/gruppe-zahn-512.png", apple: "/brand/gruppe-zahn-180.png" },
  arzt: { svg: "/brand/gruppe-arzt.svg", png192: "/brand/gruppe-arzt-192.png", png512: "/brand/gruppe-arzt-512.png", apple: "/brand/gruppe-arzt-180.png" },
  therapie: { svg: "/brand/gruppe-therapie.svg", png192: "/brand/gruppe-therapie-192.png", png512: "/brand/gruppe-therapie-512.png", apple: "/brand/gruppe-therapie-180.png" },
};

export const istPraxisGruppe = (x: unknown): x is PraxisGruppe => typeof x === "string" && (PRAXIS_GRUPPEN as readonly string[]).includes(x);
