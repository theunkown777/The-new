// Körpermodell: Knochen, Muskeln sowie Sehnen, Bänder und Gelenke als Vektorformen in
// Vorder- und Rückansicht. Schematische Darstellung zur Erklärung für Patienten und für das
// Gespräch in der Praxis; kein Befund, keine Diagnose.
//
// Koordinaten: Zeichenfläche 400 x 880, Körpermitte bei x = 200. Paarige Strukturen sind
// für die linke Bildhälfte beschrieben und werden gespiegelt. In der Vorderansicht ist die
// linke Bildhälfte die rechte Körperseite, in der Rückansicht die linke Körperseite.

import { band, block, ellipse, flaeche, knochen, reihe, spindel, strich, type Form, type P } from "./formen";
import { KOERPER_TEXTE } from "./koerperTexte";

export const KOERPER_BREITE = 400;
export const KOERPER_HOEHE = 880;

export type Ebene = "knochen" | "muskeln" | "sehnen";
export type Ansicht = "vorn" | "hinten";
export type Seite = "R" | "L" | "M";

export const EBENEN: { id: Ebene; name: string; kurz: string }[] = [
  { id: "knochen", name: "Knochen", kurz: "Skelett" },
  { id: "muskeln", name: "Muskeln", kurz: "Muskeln" },
  { id: "sehnen", name: "Sehnen, Bänder und Gelenke", kurz: "Sehnen und Gelenke" },
];

export interface Struktur {
  id: string;
  ebene: Ebene;
  /** paarig: links und rechts einzeln wählbar. mitte: einmal vorhanden. mitteGespiegelt: einmal vorhanden, Form ist nur für eine Hälfte beschrieben. */
  lage: "paarig" | "mitte" | "mitteGespiegelt";
  /** Liegt unter anderen Strukturen und wird gestrichelt darüber gezeichnet. */
  tief?: boolean;
  vorn?: Form[];
  hinten?: Form[];
  name: string;
  latein?: string;
  /** Was ist das und wozu dient es? */
  was: string;
  /** Typische Beschwerden, verständlich erklärt. */
  beschwerden: string;
}

type Roh = Omit<Struktur, "name" | "latein" | "was" | "beschwerden">;

// ---------------------------------------------------------------- Stützpunkte (linke Bildhälfte)
const SCHULTER: P = [129, 161];
const ELLENBOGEN: P = [108, 303];
const HANDGELENK: P = [88, 430];
const HUEFTE: P = [154, 371];
const KNIE: P = [166, 568];
const KNOECHEL: P = [171, 746];

const wirbel = (a: P, b: P, anzahl: number, breite: number, hoehe: number) => reihe(a, b, anzahl).map((c) => block(c, breite, hoehe));

// Rippen: von vorn Bögen vom Brustbein nach außen unten, von hinten von der Wirbelsäule nach außen unten
const rippenVorn: Form[] = [];
for (let i = 0; i < 10; i++) {
  const start: P = i < 7 ? [192, 156 + i * 11.5] : [186 - (i - 6) * 9, 232 + (i - 6) * 9];
  const weite = Math.min(70, 42 + i * 5.2);
  const aussen: P = [200 - weite, 168 + i * 12.5];
  rippenVorn.push(strich([start, [start[0] - (start[0] - aussen[0]) * 0.55, start[1] - 5 + i * 0.6], aussen, [aussen[0] + 5, aussen[1] + 13]], 4.6));
}
const rippenHinten: Form[] = [];
for (let i = 0; i < 12; i++) {
  const start: P = [193, 152 + i * 10.2];
  const weite = i < 10 ? Math.min(70, 40 + i * 5.4) : 52 - (i - 10) * 16;
  const aussen: P = [200 - weite, 166 + i * 11.6];
  rippenHinten.push(strich([start, [start[0] - (start[0] - aussen[0]) * 0.6, start[1] + 1 + i * 0.5], aussen], 4.6));
}

const finger = (wurzel: P[], spitze: P[], w: number) => wurzel.map((a, i) => knochen(a, spitze[i], w, w * 1.5, w * 1.2));

const ROH: Roh[] = [
  // ============================================================ Knochen
  { id: "schaedel", ebene: "knochen", lage: "mitte",
    vorn: [flaeche([[200, 17], [224, 23], [235, 46], [233, 70], [225, 84], [219, 97], [200, 103], [181, 97], [175, 84], [167, 70], [165, 46], [176, 23]], 0.7)],
    hinten: [flaeche([[200, 17], [224, 23], [235, 46], [233, 72], [222, 94], [200, 102], [178, 94], [167, 72], [165, 46], [176, 23]], 0.7)] },
  { id: "unterkiefer", ebene: "knochen", lage: "mitte",
    vorn: [flaeche([[174, 82], [177, 102], [188, 114], [200, 117], [212, 114], [223, 102], [226, 82], [219, 96], [209, 104], [200, 105], [191, 104], [181, 96]], 0.7)] },
  { id: "hws", ebene: "knochen", lage: "mitte", vorn: wirbel([200, 119], [200, 142], 5, 15, 4.2), hinten: wirbel([200, 106], [200, 142], 7, 15, 4.4) },
  { id: "bws", ebene: "knochen", lage: "mitte", vorn: wirbel([200, 149], [200, 262], 12, 16, 7.4), hinten: wirbel([200, 149], [200, 262], 12, 16, 7.4) },
  { id: "lws", ebene: "knochen", lage: "mitte", vorn: wirbel([200, 273], [200, 321], 5, 22, 9), hinten: wirbel([200, 273], [200, 321], 5, 22, 9) },
  { id: "kreuzbein", ebene: "knochen", lage: "mitte",
    vorn: [flaeche([[186, 328], [214, 328], [210, 348], [204, 364], [196, 364], [190, 348]], 0.6)],
    hinten: [flaeche([[186, 328], [214, 328], [210, 348], [204, 364], [196, 364], [190, 348]], 0.6)] },
  { id: "steissbein", ebene: "knochen", lage: "mitte", vorn: [flaeche([[197, 366], [203, 366], [202, 376], [200, 380], [198, 376]], 0.6)], hinten: [flaeche([[197, 366], [203, 366], [202, 376], [200, 380], [198, 376]], 0.6)] },
  { id: "rippen", ebene: "knochen", lage: "mitteGespiegelt", vorn: rippenVorn, hinten: rippenHinten },
  { id: "schulterblatt", ebene: "knochen", lage: "paarig",
    vorn: [flaeche([[150, 150], [133, 147], [128, 156], [140, 170]], 0.6)],
    hinten: [flaeche([[172, 152], [150, 146], [128, 148], [124, 158], [136, 176], [150, 206], [160, 214], [168, 190]], 0.6), strich([[168, 164], [150, 158], [128, 152]], 3.4)] },
  { id: "schluesselbein", ebene: "knochen", lage: "paarig", vorn: [knochen([193, 148], [136, 142], 5.2, 8, 8)], hinten: [knochen([170, 146], [134, 143], 4.6, 6, 7)] },
  { id: "brustbein", ebene: "knochen", lage: "mitte", vorn: [flaeche([[189, 146], [211, 146], [209, 164], [207, 226], [200, 242], [193, 226], [191, 164]], 0.6)] },
  { id: "oberarmknochen", ebene: "knochen", lage: "paarig",
    vorn: [ellipse(SCHULTER, 11.5, 11.5), knochen([127, 168], ELLENBOGEN, 10, 16, 23)],
    hinten: [ellipse(SCHULTER, 11.5, 11.5), knochen([127, 168], ELLENBOGEN, 10, 16, 23)] },
  { id: "speiche", ebene: "knochen", lage: "paarig", vorn: [knochen([100, 313], [82, 425], 6.2, 10, 14)], hinten: [knochen([100, 313], [82, 425], 6.2, 10, 14)] },
  { id: "elle", ebene: "knochen", lage: "paarig", vorn: [knochen([114, 310], [96, 425], 6.2, 14, 8)], hinten: [knochen([114, 306], [96, 425], 6.2, 15, 8)] },
  { id: "handwurzel", ebene: "knochen", lage: "paarig",
    vorn: [ellipse([83, 435], 6, 4.6, -12), ellipse([93, 436], 6, 4.6, -12), ellipse([80, 443], 5.4, 4.2, -12), ellipse([90, 444], 6, 4.4, -12)],
    hinten: [ellipse([83, 435], 6, 4.6, -12), ellipse([93, 436], 6, 4.6, -12), ellipse([80, 443], 5.4, 4.2, -12), ellipse([90, 444], 6, 4.4, -12)] },
  { id: "mittelhand", ebene: "knochen", lage: "paarig",
    vorn: finger([[75, 446], [80, 450], [86, 451], [91, 451], [96, 450]], [[63, 462], [72, 478], [81, 482], [89, 481], [97, 477]], 3.6),
    hinten: finger([[75, 446], [80, 450], [86, 451], [91, 451], [96, 450]], [[63, 462], [72, 478], [81, 482], [89, 481], [97, 477]], 3.6) },
  { id: "finger", ebene: "knochen", lage: "paarig",
    vorn: [...finger([[61, 465], [70, 482], [80, 486], [89, 485], [98, 481]], [[54, 480], [65, 500], [77, 507], [88, 505], [99, 497]], 3.2),
      ...finger([[52, 483], [64, 503], [76, 510], [88, 508], [100, 500]], [[48, 493], [61, 518], [75, 527], [88, 524], [101, 512]], 2.8)],
    hinten: [...finger([[61, 465], [70, 482], [80, 486], [89, 485], [98, 481]], [[54, 480], [65, 500], [77, 507], [88, 505], [99, 497]], 3.2),
      ...finger([[52, 483], [64, 503], [76, 510], [88, 508], [100, 500]], [[48, 493], [61, 518], [75, 527], [88, 524], [101, 512]], 2.8)] },
  { id: "becken", ebene: "knochen", lage: "paarig",
    vorn: [flaeche([[188, 331], [170, 318], [150, 315], [137, 327], [137, 346], [145, 364], [152, 384], [162, 400], [178, 402], [196, 392], [197, 380], [184, 374], [173, 360], [176, 346]], 0.6)],
    hinten: [flaeche([[188, 331], [170, 318], [150, 315], [137, 327], [137, 346], [145, 364], [152, 384], [162, 400], [178, 402], [190, 396], [186, 378], [175, 362], [178, 346]], 0.6)] },
  { id: "oberschenkelknochen", ebene: "knochen", lage: "paarig",
    vorn: [ellipse([157, 370], 10.5, 10.5), flaeche([[160, 364], [146, 372], [136, 380], [138, 392], [150, 388], [162, 378]], 0.6), knochen([143, 388], [166, 558], 13, 16, 32)],
    hinten: [ellipse([157, 370], 10.5, 10.5), flaeche([[160, 364], [146, 372], [136, 380], [138, 392], [150, 388], [162, 378]], 0.6), knochen([143, 388], [166, 558], 13, 16, 32)] },
  { id: "kniescheibe", ebene: "knochen", lage: "paarig", vorn: [flaeche([[166, 556], [176, 562], [175, 573], [166, 580], [157, 573], [156, 562]], 0.8)] },
  { id: "schienbein", ebene: "knochen", lage: "paarig", vorn: [knochen([170, 586], [173, 742], 12, 31, 19)], hinten: [knochen([170, 586], [173, 742], 12, 31, 19)] },
  { id: "wadenbein", ebene: "knochen", lage: "paarig", vorn: [knochen([152, 594], [159, 750], 4.8, 9, 9)], hinten: [knochen([152, 594], [159, 750], 4.8, 9, 9)] },
  { id: "fusswurzel", ebene: "knochen", lage: "paarig", vorn: [ellipse([170, 756], 13, 7.5), ellipse([162, 766], 7, 5.5), ellipse([175, 767], 8, 5.5)], hinten: [ellipse([170, 754], 12, 6)] },
  { id: "fersenbein", ebene: "knochen", lage: "paarig", hinten: [flaeche([[160, 760], [181, 760], [183, 776], [176, 786], [165, 786], [158, 776]], 0.7)] },
  { id: "mittelfuss", ebene: "knochen", lage: "paarig", vorn: finger([[157, 771], [163, 773], [169, 774], [175, 774], [181, 773]], [[148, 796], [157, 800], [166, 802], [175, 802], [184, 800]], 4) },
  { id: "zehen", ebene: "knochen", lage: "paarig", vorn: finger([[147, 800], [156, 804], [166, 806], [175, 806], [185, 804]], [[143, 815], [153, 821], [165, 824], [176, 824], [188, 822]], 3.6) },

  // ============================================================ Muskeln, Vorderansicht
  { id: "kaumuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([177, 80], [182, 104], 9)] },
  { id: "kopfwender", ebene: "muskeln", lage: "paarig", vorn: [spindel([175, 96], [193, 146], 8.5)] },
  { id: "trapez", ebene: "muskeln", lage: "paarig",
    vorn: [flaeche([[181, 108], [171, 126], [137, 139], [152, 143], [184, 134]], 0.6)],
    hinten: [flaeche([[199, 98], [187, 104], [172, 128], [134, 143], [146, 157], [176, 170], [190, 226], [199, 264]], 0.55)] },
  { id: "deltamuskel", ebene: "muskeln", lage: "paarig",
    vorn: [flaeche([[146, 139], [124, 142], [111, 160], [112, 196], [121, 216], [130, 196], [142, 168]], 0.7)],
    hinten: [flaeche([[150, 146], [124, 142], [111, 160], [112, 196], [121, 216], [130, 196], [146, 166]], 0.7)] },
  { id: "brustmuskel", ebene: "muskeln", lage: "paarig", vorn: [flaeche([[193, 152], [152, 146], [134, 172], [126, 200], [148, 216], [178, 222], [194, 216]], 0.6)] },
  { id: "saegemuskel", ebene: "muskeln", lage: "paarig", vorn: [flaeche([[142, 218], [131, 232], [136, 242], [130, 252], [137, 262], [134, 272], [148, 276], [152, 248], [150, 226]], 0.4)] },
  { id: "gerader-bauchmuskel", ebene: "muskeln", lage: "paarig", vorn: [flaeche([[181, 230], [198, 226], [198, 378], [191, 382], [183, 340], [180, 280]], 0.5)] },
  { id: "schraeger-bauchmuskel", ebene: "muskeln", lage: "paarig", vorn: [flaeche([[178, 236], [154, 252], [141, 284], [141, 318], [150, 334], [172, 352], [180, 330], [178, 280]], 0.6)] },
  { id: "bizeps", ebene: "muskeln", lage: "paarig", vorn: [spindel([128, 182], [109, 298], 23)] },
  { id: "oberarmspeichenmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([102, 280], [83, 404], 13, 0.3)] },
  { id: "unterarmbeuger", ebene: "muskeln", lage: "paarig", vorn: [spindel([117, 302], [95, 416], 19, 0.3)] },
  { id: "daumenballen", ebene: "muskeln", lage: "paarig", vorn: [ellipse([76, 453], 6.5, 10.5, 30)] },
  { id: "hueftbeuger", ebene: "muskeln", lage: "paarig", tief: true, vorn: [spindel([188, 292], [151, 392], 15, 0.5)] },
  { id: "schenkelbindenspanner", ebene: "muskeln", lage: "paarig", vorn: [spindel([141, 328], [135, 402], 11)] },
  { id: "adduktoren", ebene: "muskeln", lage: "paarig", vorn: [flaeche([[195, 390], [178, 398], [166, 426], [170, 500], [179, 528], [189, 474], [195, 424]], 0.6)] },
  { id: "aeusserer-schenkelmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([139, 398], [156, 554], 24, 0.5)] },
  { id: "gerader-schenkelmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([152, 378], [166, 550], 25)] },
  { id: "innerer-schenkelmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([178, 468], [173, 562], 21, 0.62)] },
  { id: "schneidermuskel", ebene: "muskeln", lage: "paarig", vorn: [band([[143, 330], [156, 392], [174, 470], [182, 548], [180, 590]], 8)] },
  { id: "schienbeinmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([162, 592], [170, 734], 15, 0.32)] },
  { id: "wadenbeinmuskel", ebene: "muskeln", lage: "paarig", vorn: [spindel([151, 598], [157, 736], 10.5, 0.35)], hinten: [spindel([151, 610], [158, 740], 9, 0.4)] },
  { id: "zwillingswadenmuskel", ebene: "muskeln", lage: "paarig",
    vorn: [spindel([183, 592], [180, 694], 12, 0.4)],
    hinten: [spindel([158, 566], [165, 692], 21, 0.42), spindel([181, 566], [174, 696], 23, 0.44)] },

  // ============================================================ Muskeln, Rückansicht
  { id: "rotatorenmanschette-muskeln", ebene: "muskeln", lage: "paarig", hinten: [flaeche([[170, 160], [150, 156], [132, 164], [138, 180], [152, 200], [168, 188]], 0.6)] },
  { id: "breiter-rueckenmuskel", ebene: "muskeln", lage: "paarig", hinten: [flaeche([[198, 238], [178, 204], [150, 198], [131, 178], [132, 206], [144, 268], [164, 316], [198, 328]], 0.55)] },
  { id: "rueckenstrecker", ebene: "muskeln", lage: "paarig", hinten: [flaeche([[198, 256], [187, 262], [183, 318], [190, 344], [198, 344]], 0.5)] },
  { id: "trizeps", ebene: "muskeln", lage: "paarig", hinten: [spindel([127, 178], [108, 300], 25)] },
  { id: "unterarmstrecker", ebene: "muskeln", lage: "paarig", hinten: [spindel([103, 298], [88, 416], 20, 0.3)] },
  { id: "mittlerer-gesaessmuskel", ebene: "muskeln", lage: "paarig", hinten: [flaeche([[188, 330], [158, 317], [138, 332], [146, 356], [178, 354]], 0.6)] },
  { id: "grosser-gesaessmuskel", ebene: "muskeln", lage: "paarig", hinten: [flaeche([[196, 342], [172, 346], [142, 362], [137, 400], [158, 420], [188, 410], [197, 382]], 0.6)] },
  { id: "birnenmuskel", ebene: "muskeln", lage: "paarig", tief: true, hinten: [spindel([192, 350], [146, 378], 9)] },
  { id: "zweikoepfiger-schenkelmuskel", ebene: "muskeln", lage: "paarig", hinten: [spindel([158, 408], [154, 572], 23)] },
  { id: "halbsehnenmuskel", ebene: "muskeln", lage: "paarig", hinten: [spindel([180, 408], [179, 576], 25)] },
  { id: "schollenmuskel", ebene: "muskeln", lage: "paarig", hinten: [spindel([168, 628], [170, 734], 27, 0.4)] },

  // ============================================================ Sehnen, Bänder und Gelenke
  { id: "kiefergelenk", ebene: "sehnen", lage: "paarig", vorn: [ellipse([173, 82], 4.6, 4.6)] },
  { id: "schultergelenk", ebene: "sehnen", lage: "paarig", vorn: [ellipse([135, 158], 7.5, 9, -20)], hinten: [ellipse([135, 158], 7.5, 9, 20)] },
  { id: "rotatorenmanschette", ebene: "sehnen", lage: "paarig", vorn: [strich([[142, 150], [131, 147], [121, 154]], 4)], hinten: [strich([[146, 152], [132, 148], [120, 156]], 4)] },
  { id: "bizepssehne", ebene: "sehnen", lage: "paarig", vorn: [strich([[127, 154], [126, 172], [127, 190]], 3.2)] },
  { id: "tennisarm", ebene: "sehnen", lage: "paarig", vorn: [ellipse([98, 300], 5, 6)], hinten: [ellipse([98, 300], 5, 6)] },
  { id: "golferarm", ebene: "sehnen", lage: "paarig", vorn: [ellipse([119, 302], 5, 6)] },
  { id: "karpaltunnel", ebene: "sehnen", lage: "paarig", vorn: [ellipse([88, 431], 10, 5, -10)] },
  { id: "bandscheiben", ebene: "sehnen", lage: "mitte",
    vorn: reihe([200, 279], [200, 327], 5).map((c) => ellipse(c, 11.5, 2.2)),
    hinten: reihe([200, 279], [200, 327], 5).map((c) => ellipse(c, 11.5, 2.2)) },
  { id: "isg", ebene: "sehnen", lage: "paarig", vorn: [strich([[187, 330], [189, 344], [192, 356]], 3.4)], hinten: [strich([[187, 330], [189, 344], [192, 356]], 3.4)] },
  { id: "leistenband", ebene: "sehnen", lage: "paarig", vorn: [strich([[142, 331], [168, 362], [196, 386]], 3)] },
  { id: "hueftgelenk", ebene: "sehnen", lage: "paarig", vorn: [ellipse([157, 370], 13.5, 13.5)], hinten: [ellipse([157, 370], 13.5, 13.5)] },
  { id: "tractus", ebene: "sehnen", lage: "paarig", vorn: [strich([[136, 392], [140, 480], [151, 588]], 4.4)], hinten: [strich([[136, 392], [140, 480], [151, 588]], 4.4)] },
  { id: "quadrizepssehne", ebene: "sehnen", lage: "paarig", vorn: [strich([[166, 540], [166, 556]], 9)] },
  { id: "patellasehne", ebene: "sehnen", lage: "paarig", vorn: [strich([[166, 580], [168, 600]], 7.5)] },
  { id: "innenband", ebene: "sehnen", lage: "paarig", vorn: [strich([[181, 556], [183, 574], [181, 596]], 3.4)] },
  { id: "aussenband", ebene: "sehnen", lage: "paarig", vorn: [strich([[151, 558], [150, 576], [152, 596]], 3.4)] },
  { id: "meniskus", ebene: "sehnen", lage: "paarig", vorn: [strich([[153, 582], [159, 585], [165, 583]], 3.6), strich([[168, 583], [174, 585], [181, 582]], 3.6)], hinten: [strich([[153, 582], [159, 585], [165, 583]], 3.6), strich([[168, 583], [174, 585], [181, 582]], 3.6)] },
  { id: "kreuzbaender", ebene: "sehnen", lage: "paarig", tief: true, vorn: [strich([[161, 562], [172, 580]], 3.2), strich([[172, 562], [161, 580]], 3.2)], hinten: [strich([[161, 566], [172, 584]], 3.2), strich([[172, 566], [161, 584]], 3.2)] },
  { id: "achillessehne", ebene: "sehnen", lage: "paarig", hinten: [strich([[170, 694], [170, 730], [171, 764]], 7)] },
  { id: "sprunggelenk", ebene: "sehnen", lage: "paarig", vorn: [ellipse([171, 747], 12, 5)], hinten: [ellipse([171, 748], 11, 4.4)] },
  { id: "aussenbaender-sprunggelenk", ebene: "sehnen", lage: "paarig", vorn: [strich([[158, 746], [156, 756], [160, 765]], 3.4)] },
  { id: "plantarfaszie", ebene: "sehnen", lage: "paarig", tief: true, vorn: [strich([[170, 762], [168, 782], [166, 800]], 5)] },
];

export const STRUKTUREN: Struktur[] = ROH.map((r) => {
  const t = KOERPER_TEXTE[r.id];
  if (!t) throw new Error(`Körpermodell: Text für „${r.id}“ fehlt`);
  return { ...r, ...t };
});

export const strukturNach = (id: string) => STRUKTUREN.find((s) => s.id === id) ?? null;

/** Kennung eines markierbaren Teils: Struktur und Körperseite, z. B. „patellasehne:L“. */
export const teilKennung = (id: string, seite: Seite) => `${id}:${seite}`;
export function teilLesen(kennung: string): { struktur: Struktur; seite: Seite } | null {
  const [id, seite] = kennung.split(":");
  const struktur = strukturNach(id);
  if (!struktur || !["R", "L", "M"].includes(seite)) return null;
  if ((struktur.lage === "paarig") !== (seite !== "M")) return null;
  return { struktur, seite: seite as Seite };
}
export const seitenName = (seite: Seite) => (seite === "R" ? "rechts" : seite === "L" ? "links" : "");
export const teilName = (kennung: string) => {
  const t = teilLesen(kennung);
  return t ? `${t.struktur.name}${t.seite === "M" ? "" : ` ${seitenName(t.seite)}`}` : kennung;
};

/** Körperseite einer paarigen Struktur je Bildhälfte: von vorn ist die linke Bildhälfte die rechte Körperseite. */
export const seiteImBild = (ansicht: Ansicht, bildhaelfte: "links" | "rechts"): Seite =>
  (ansicht === "vorn") === (bildhaelfte === "links") ? "R" : "L";

/** Zeichnung ohne eigene Erklärung (Augenhöhlen, Nasenöffnung, Zahnreihe, Öffnungen im Becken). */
export const DEKOR: Record<Ansicht, Form[]> = {
  vorn: [
    ellipse([188, 57], 7.5, 6.5), ellipse([212, 57], 7.5, 6.5),
    flaeche([[200, 66], [204, 79], [200, 82], [196, 79]], 0.6),
    strich([[187, 93], [200, 95], [213, 93]], 1.4),
    ellipse([177, 388], 6, 8, 20), ellipse([223, 388], 6, 8, -20),
  ],
  hinten: [ellipse([179, 388], 5, 7, 20), ellipse([221, 388], 5, 7, -20)],
};

// Körperumriss als weiche Fläche hinter den Strukturen (dicke Striche mit runden Enden)
export const UMRISS: { d: string; breite: number }[] = [
  { d: "M200 60V62", breite: 80 },
  { d: "M200 104V140", breite: 36 },
  { d: "M150 176L250 176M158 230L242 230M162 290L238 290M160 350L240 350", breite: 92 },
  { d: `M${SCHULTER[0]} ${SCHULTER[1] + 4}L${ELLENBOGEN[0]} ${ELLENBOGEN[1]}M${400 - SCHULTER[0]} ${SCHULTER[1] + 4}L${400 - ELLENBOGEN[0]} ${ELLENBOGEN[1]}`, breite: 44 },
  { d: `M${ELLENBOGEN[0]} ${ELLENBOGEN[1]}L${HANDGELENK[0]} ${HANDGELENK[1]}M${400 - ELLENBOGEN[0]} ${ELLENBOGEN[1]}L${400 - HANDGELENK[0]} ${HANDGELENK[1]}`, breite: 34 },
  { d: "M84 450L78 496M316 450L322 496", breite: 40 },
  { d: `M${HUEFTE[0] + 4} 390L${KNIE[0]} ${KNIE[1]}M${400 - HUEFTE[0] - 4} 390L${400 - KNIE[0]} ${KNIE[1]}`, breite: 70 },
  { d: `M${KNIE[0]} ${KNIE[1]}L${KNOECHEL[0]} ${KNOECHEL[1]}M${400 - KNIE[0]} ${KNIE[1]}L${400 - KNOECHEL[0]} ${KNOECHEL[1]}`, breite: 50 },
  { d: "M170 760L166 800M230 760L234 800", breite: 46 },
];
