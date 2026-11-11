// Erzeugt aus der Bildauswahl (Servier Medical Art, CC BY 4.0) am 11.11.2026; Punkte in Prozent des Bildes.
// name = Beschriftung im Bild, teil = Erklärung in lib/modelle/erklaerung.ts (falls anders benannt).
import type { ErklaerThema } from "./erklaerung";

export interface BildPunkt {
  name: string;
  teil?: string;
  x: number;
  y: number;
}

export interface ErklaerBild {
  datei: string;
  breite: number;
  hoehe: number;
  titel?: string;
  autor: string;
  quelleUrl: string;
  lizenz: string;
  lizenzUrl: string;
  /** zugeschnitten, zusammengesetzt oder vergrößert */
  geaendert?: boolean;
  punkte: BildPunkt[];
}

const SERVIER = { autor: "Servier Medical Art", lizenz: "CC BY 4.0", lizenzUrl: "https://creativecommons.org/licenses/by/4.0/deed.de" };

export const ERKLAER_BILDER: Partial<Record<ErklaerThema, ErklaerBild>> = {
  auge: {
    datei: "/anatomie-bilder/auge.webp", breite: 431, hoehe: 365, titel: "Eye muscles", quelleUrl: "https://smart.servier.com/smart_image/eye-muscles/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Hornhaut", x: 85, y: 45 },
    { name: "Regenbogenhaut", x: 80, y: 57 },
    { name: "Pupille", x: 81.3, y: 50 },
    { name: "Lederhaut", x: 72, y: 45 },
    { name: "Lidheber", x: 50, y: 26.5 },
    { name: "oberer gerader Augenmuskel", x: 50, y: 34.5 },
    { name: "oberer schräger Augenmuskel", x: 66, y: 34 },
    { name: "seitlicher gerader Augenmuskel", teil: "äußerer gerader Augenmuskel", x: 45, y: 50 },
    { name: "unterer gerader Augenmuskel", x: 40, y: 66 },
    { name: "unterer schräger Augenmuskel", x: 63, y: 66 },
    ],
  },
  ohr: {
    datei: "/anatomie-bilder/ohr.webp", breite: 1309, hoehe: 1083, titel: "Ear", quelleUrl: "https://smart.servier.com/smart_image/ear/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Ohrmuschel", x: 12, y: 62 },
    { name: "Gehörgang", x: 40, y: 52 },
    { name: "Trommelfell", x: 60, y: 55 },
    { name: "Paukenhöhle", x: 64.5, y: 57 },
    { name: "Hammer", x: 59.6, y: 39 },
    { name: "Amboss", x: 66, y: 46 },
    { name: "Steigbügel", x: 72, y: 47 },
    { name: "Bogengänge", x: 70.5, y: 33 },
    { name: "Hörschnecke", x: 79, y: 48 },
    { name: "Hörnerv", x: 87, y: 36.5 },
    { name: "Ohrtrompete", x: 72, y: 70 },
    ],
  },
  lunge: {
    datei: "/anatomie-bilder/lunge.webp", breite: 816, hoehe: 937, titel: "Lungs, Trachea and bronchi, Larynx front view (aus drei Grafiken zusammengesetzt)", quelleUrl: "https://smart.servier.com/smart_image/lungs-11/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Kehlkopf", x: 50, y: 9 },
    { name: "Luftröhre", x: 50, y: 38 },
    { name: "Hauptbronchus rechts", x: 43.8, y: 59.2 },
    { name: "Hauptbronchus links", x: 58, y: 59.5 },
    { name: "Bronchien", x: 38, y: 74 },
    { name: "Oberlappen rechts", teil: "Oberlappen", x: 25, y: 46 },
    { name: "Mittellappen rechts", teil: "Mittellappen", x: 10, y: 74 },
    { name: "Unterlappen rechts", teil: "Unterlappen", x: 4, y: 84 },
    { name: "Oberlappen links", teil: "Oberlappen", x: 80, y: 45 },
    { name: "Unterlappen links", teil: "Unterlappen", x: 62, y: 88 },
    { name: "Herzbucht", x: 63.5, y: 73.5 },
    ],
  },
  herz: {
    datei: "/anatomie-bilder/herz.webp", breite: 383, hoehe: 460, titel: "Heart", quelleUrl: "https://smart.servier.com/smart_image/smart-heart-sagittal-overview/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Aorta", x: 38, y: 12 },
    { name: "obere Hohlvene", x: 20, y: 22 },
    { name: "untere Hohlvene", x: 17, y: 93 },
    { name: "Lungenarterie", x: 64, y: 22 },
    { name: "Lungenvenen", x: 86, y: 41 },
    { name: "rechter Vorhof", x: 22, y: 52 },
    { name: "linker Vorhof", x: 68, y: 44 },
    { name: "rechte Kammer", x: 30, y: 77.5 },
    { name: "linke Kammer", x: 75, y: 76 },
    { name: "Trikuspidalklappe", x: 32, y: 64 },
    { name: "Mitralklappe", x: 58, y: 56 },
    { name: "Aortenklappe", x: 44, y: 50 },
    { name: "Herzscheidewand", x: 62, y: 76 },
    { name: "Herzspitze", x: 88, y: 92 },
    ],
  },
  muskeln: {
    datei: "/anatomie-bilder/muskeln.webp", breite: 516, hoehe: 1356, titel: "Musculature", quelleUrl: "https://smart.servier.com/smart_image/musculature-front/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Stirnmuskel", x: 45, y: 4 },
    { name: "Kopfwender", x: 45.7, y: 15.8 },
    { name: "Trapezmuskel", teil: "Kapuzenmuskel", x: 36.7, y: 17.6 },
    { name: "Deltamuskel", x: 22.9, y: 23.2 },
    { name: "großer Brustmuskel", x: 35, y: 24 },
    { name: "Bizeps", x: 20, y: 33 },
    { name: "Unterarmbeuger", teil: "Unterarmmuskeln", x: 16.6, y: 43 },
    { name: "gerader Bauchmuskel", x: 46, y: 42 },
    { name: "schräger Bauchmuskel", x: 34, y: 38 },
    { name: "Schneidermuskel", x: 38.6, y: 58 },
    { name: "Oberschenkelmuskel", teil: "Oberschenkelmuskel (Quadrizeps)", x: 32, y: 63 },
    { name: "Oberschenkelanzieher", teil: "Adduktoren", x: 44, y: 60 },
    { name: "Kniescheibensehne", x: 39, y: 74 },
    { name: "Schienbeinmuskel", x: 33, y: 82 },
    ],
  },
  mund: {
    datei: "/anatomie-bilder/mund.webp", breite: 489, hoehe: 756, titel: "Oral cavity", quelleUrl: "https://smart.servier.com/smart_image/oral-cavity/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Oberlippe", teil: "Lippen", x: 50, y: 6 },
    { name: "Unterlippe", teil: "Lippen", x: 50, y: 95 },
    { name: "obere Schneidezähne", teil: "Schneidezähne", x: 45, y: 14 },
    { name: "untere Schneidezähne", teil: "Schneidezähne", x: 45, y: 83 },
    { name: "Backenzähne", x: 9.5, y: 47 },
    { name: "harter Gaumen", x: 50, y: 24 },
    { name: "weicher Gaumen", x: 50, y: 40 },
    { name: "Zäpfchen", x: 49.5, y: 50 },
    { name: "Rachen", x: 32, y: 48 },
    { name: "Gaumenmandel", x: 18.5, y: 62 },
    { name: "Zunge", x: 50, y: 70 },
    ],
  },
  zahn: {
    datei: "/anatomie-bilder/zahn.webp", breite: 929, hoehe: 1600, titel: "Tooth", quelleUrl: "https://smart.servier.com/smart_image/tooth/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Zahnschmelz", x: 36, y: 20 },
    { name: "Zahnbein", x: 25, y: 45 },
    { name: "Zahnmark", x: 44, y: 32.5 },
    { name: "Zahnwurzel", teil: "Wurzel", x: 71, y: 62 },
    { name: "Zahnfleisch", x: 10, y: 25 },
    { name: "Kieferknochen", x: 8, y: 55 },
    { name: "Nerv und Blutgefäße", x: 20, y: 86 },
    ],
  },
  haut: {
    datei: "/anatomie-bilder/haut.webp", breite: 1282, hoehe: 1248, titel: "Skin", quelleUrl: "https://smart.servier.com/smart_image/skin/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Oberhaut", x: 33, y: 19 },
    { name: "Lederhaut", x: 62, y: 45 },
    { name: "Unterhaut", x: 30, y: 85 },
    { name: "Haar", teil: "Haar und Haarwurzel", x: 94, y: 10 },
    { name: "Haarfollikel", teil: "Haar und Haarwurzel", x: 87.5, y: 55 },
    { name: "Talgdrüse", x: 94.5, y: 36 },
    { name: "Schweißdrüse", x: 76, y: 68 },
    { name: "Schweißpore", x: 76, y: 23 },
    { name: "Blutgefäße", x: 35.5, y: 50 },
    { name: "Tastkörperchen", teil: "Nervenendigungen", x: 41.5, y: 37 },
    { name: "Lamellenkörperchen", x: 22, y: 44 },
    ],
  },
  skelett: {
    datei: "/anatomie-bilder/skelett.webp", breite: 499, hoehe: 1191, titel: "Skeleton", quelleUrl: "https://smart.servier.com/smart_image/skeleton-face/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Schädel", x: 50, y: 4 },
    { name: "Unterkiefer", x: 50, y: 11.5 },
    { name: "Halswirbelsäule", x: 50, y: 15 },
    { name: "Schlüsselbein", x: 32, y: 18 },
    { name: "Rippen", teil: "Brustkorb", x: 36, y: 27 },
    { name: "Wirbelsäule", x: 50, y: 34 },
    { name: "Oberarmknochen", x: 21, y: 28 },
    { name: "Elle und Speiche", x: 15, y: 44 },
    { name: "Handknochen", teil: "Hand- und Fußknochen", x: 10, y: 54 },
    { name: "Becken", x: 35, y: 42 },
    { name: "Kreuzbein", x: 50, y: 45 },
    { name: "Oberschenkelknochen", x: 35.5, y: 60 },
    { name: "Kniescheibe", x: 41, y: 71.5 },
    { name: "Schienbein", x: 42.5, y: 85 },
    { name: "Wadenbein", x: 38, y: 85 },
    { name: "Fußknochen", teil: "Hand- und Fußknochen", x: 42, y: 96 },
    ],
  },
  verdauung: {
    datei: "/anatomie-bilder/verdauung.webp", breite: 429, hoehe: 1600, titel: "Complete digestive apparatus", quelleUrl: "https://smart.servier.com/smart_image/complete-digestive-apparatus/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Mundhöhle mit Zunge", x: 32, y: 20 },
    { name: "Rachen", x: 53.5, y: 19 },
    { name: "Speiseröhre", x: 53, y: 35 },
    { name: "Leber", x: 20, y: 54 },
    { name: "Gallenblase", x: 18, y: 57 },
    { name: "Magen", x: 72, y: 59 },
    { name: "Milz", x: 93, y: 58 },
    { name: "Bauchspeicheldrüse", x: 35, y: 66 },
    { name: "Zwölffingerdarm", x: 24, y: 65 },
    { name: "Dünndarm", x: 50, y: 80 },
    { name: "Dickdarm", x: 90, y: 78 },
    { name: "Mastdarm", x: 50, y: 95 },
    ],
  },
  niere: {
    datei: "/anatomie-bilder/niere.webp", breite: 795, hoehe: 1356, titel: "Urinary tract", quelleUrl: "https://smart.servier.com/smart_image/urinary-tract/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "rechte Niere", teil: "Niere", x: 15, y: 15 },
    { name: "linke Niere (im Schnitt)", teil: "Niere", x: 72, y: 8 },
    { name: "Nierenrinde", x: 93, y: 18 },
    { name: "Nierenmark", x: 90.5, y: 15 },
    { name: "Nierenbecken", x: 77, y: 15 },
    { name: "Harnleiter", x: 36, y: 45 },
    { name: "Harnblase", x: 50, y: 82 },
    { name: "Harnröhre", x: 50, y: 96 },
    ],
  },
  gehirn: {
    datei: "/anatomie-bilder/gehirn.webp", breite: 580, hoehe: 592, titel: "Brain", quelleUrl: "https://smart.servier.com/smart_image/smart-brain-overview/", ...SERVIER, geaendert: true,
    punkte: [
    { name: "Stirnlappen", x: 78, y: 28 },
    { name: "Scheitellappen", x: 35, y: 15 },
    { name: "Hinterhauptslappen", x: 7, y: 35 },
    { name: "Schläfenlappen", x: 35, y: 55 },
    { name: "Kleinhirn", x: 28, y: 70 },
    { name: "Hirnstamm", x: 45, y: 85 },
    ],
  },
};

/** Der ganze Mensch als Einstieg, mit den Stellen der Punkte je Thema (x, y in Prozent). */
export interface MenschBild {
  datei: string;
  breite: number;
  hoehe: number;
  autor: string;
  quelleUrl: string;
  lizenz: string;
  punkte: Partial<Record<ErklaerThema, { x: number; y: number }>>;
}

// Die Muskelfigur von vorn wirkt wie ein echter Mensch; die Punkte liegen dort, wo das Organ im Körper sitzt.
export const MENSCH_BILD: MenschBild | null = {
  datei: "/anatomie-bilder/muskeln.webp",
  breite: 516,
  hoehe: 1356,
  autor: "Servier Medical Art",
  quelleUrl: "https://smart.servier.com/smart_image/musculature-front/",
  lizenz: "CC BY 4.0",
  punkte: {
    gehirn: { x: 49.7, y: 2.4 },
    auge: { x: 44.9, y: 8.1 },
    ohr: { x: 37.6, y: 7.6 },
    mund: { x: 49.7, y: 11.6 },
    lunge: { x: 42, y: 24 },
    herz: { x: 54, y: 27 },
    verdauung: { x: 50, y: 38 },
    niere: { x: 57, y: 40.5 },
    haut: { x: 80, y: 40 },
    muskeln: { x: 64, y: 62 },
    skelett: { x: 61, y: 74.5 },
  },
};
