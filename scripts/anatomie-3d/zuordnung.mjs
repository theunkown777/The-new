// Welche BodyParts3D-Teile in welche Datei kommen und zu welcher Struktur der App sie gehören.
// k = Kennung aus lib/modelle/koerper.ts (mit Seite) oder lib/modelle/mund.ts, n = deutscher Name
// für Teile ohne eigene Erklärung, g = Ebene, s = Stoff (Material), f = Farbe, m = Muster:
// Text = genauer englischer Name (Einzelteil oder Verbund), RegExp = alle passenden Einzelteile,
// { v: Verbund, nur: RegExp } = Teile eines Verbunds, deren Name passt.
// Viele Muskeln gibt es in BodyParts3D nur rechts; fehlt die linke Seite, wird die rechte gespiegelt.

const SEITE = { R: "right", L: "left" };
const ersetze = (m, s) => (typeof m === "string" ? m.replaceAll("{s}", s) : m instanceof RegExp ? new RegExp(m.source.replaceAll("{s}", s), m.flags) : { ...m, v: m.v.replaceAll("{s}", s), nur: m.nur });
/** Paarige Struktur: je eine Seite; fehlt links, wird rechts gespiegelt. */
const paar = (k, g, s, f, muster, mehr = {}) => (["R", "L"]).map((seite) => ({ k: k ? `${k}:${seite}` : null, g, s, f, m: muster.map((x) => ersetze(x, SEITE[seite])), spiegelVon: seite === "L" ? muster.map((x) => ersetze(x, SEITE.R)) : null, seite, ...mehr }));
const eins = (k, g, s, f, muster, mehr = {}) => ({ k, g, s, f, m: muster, ...mehr });
const deko = (n, g, s, f, muster, mehr = {}) => ({ k: null, n, g, s, f, m: muster, ...mehr });
const dekoPaar = (n, g, s, f, muster, mehr = {}) => paar(null, g, s, f, muster, { n, ...mehr });

const KNOCHEN = "#E6D8BC", KNORPEL = "#CFDAD6", MUSKEL = "#A9443B", SEHNE = "#E8E1CF", ARTERIE = "#BE2F2B", VENE = "#3F5DA8", NERV = "#EBCB5A";
const r = (s) => new RegExp(`^(${s})$`, "i");

export const DATEIEN = {
  // ------------------------------------------------------------------ Haut (Körperoberfläche)
  haut: { name: "Haut", dreiecke: 80000, teile: [eins("haut", "haut", "haut", "#D6A185", ["Skin"])] },

  // ------------------------------------------------------------------ Skelett
  skelett: {
    name: "Skelett", dreiecke: 160000, teile: [
      eins("schaedel:M", "knochen", "knochen", KNOCHEN, [r("frontal bone|occipital bone|sphenoid bone|ethmoid|vomer|(right|left) (parietal bone|temporal bone|zygomatic bone|maxilla|nasal bone|lacrimal bone|palatine bone|inferior nasal concha)")], { gewicht: 1.6 }),
      eins("unterkiefer:M", "knochen", "knochen", KNOCHEN, ["Mandible"], { gewicht: 1.4 }),
      eins("hws:M", "knochen", "knochen", KNOCHEN, [r("atlas|axis|(third|fourth|fifth|sixth|seventh) cervical vertebra")]),
      eins("bws:M", "knochen", "knochen", KNOCHEN, [/^\w+ thoracic vertebra$/i]),
      eins("lws:M", "knochen", "knochen", KNOCHEN, [/^\w+ lumbar vertebra$/i]),
      eins("kreuzbein:M", "knochen", "knochen", KNOCHEN, ["Sacrum"]),
      eins("rippen:M", "knochen", "knochen", KNOCHEN, [/^(right|left) \w+ rib$/i], { gewicht: 1.2 }),
      eins("rippen:M", "knochen", "knorpel", KNORPEL, [/^(right|left) \w+ costal cartilage$/i]),
      eins("brustbein:M", "knochen", "knochen", KNOCHEN, [r("manubrium|body of sternum|xiphoid process")]),
      ...paar("schulterblatt", "knochen", "knochen", KNOCHEN, ["{s} scapula"]),
      ...paar("schluesselbein", "knochen", "knochen", KNOCHEN, ["{s} clavicle"]),
      ...paar("oberarmknochen", "knochen", "knochen", KNOCHEN, ["{s} humerus"]),
      ...paar("speiche", "knochen", "knochen", KNOCHEN, ["{s} radius"]),
      ...paar("elle", "knochen", "knochen", KNOCHEN, ["{s} ulna"]),
      ...paar("handwurzel", "knochen", "knochen", KNOCHEN, [/^{s} (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)$/i]),
      ...paar("mittelhand", "knochen", "knochen", KNOCHEN, [/^{s} \w+ metacarpal bone$/i]),
      ...paar("finger", "knochen", "knochen", KNOCHEN, [/^\w+ phalanx of {s} (thumb|index finger|middle finger|ring finger|little finger)$/i]),
      ...paar("becken", "knochen", "knochen", KNOCHEN, ["{s} hip bone"], { gewicht: 1.3 }),
      ...paar("oberschenkelknochen", "knochen", "knochen", KNOCHEN, ["{s} femur"]),
      ...paar("kniescheibe", "knochen", "knochen", KNOCHEN, ["{s} patella"]),
      ...paar("schienbein", "knochen", "knochen", KNOCHEN, ["{s} tibia"]),
      ...paar("wadenbein", "knochen", "knochen", KNOCHEN, ["{s} fibula"]),
      ...paar("fusswurzel", "knochen", "knochen", KNOCHEN, [/^({s} talus|navicular bone of {s} foot|{s} cuboid bone|{s} (medial|intermediate|lateral) cuneiform bone)$/i]),
      ...paar("fersenbein", "knochen", "knochen", KNOCHEN, ["{s} calcaneus"]),
      ...paar("mittelfuss", "knochen", "knochen", KNOCHEN, [/^{s} \w+ metatarsal bone$/i]),
      ...paar("zehen", "knochen", "knochen", KNOCHEN, [/^\w+ phalanx of {s} (big|second|third|fourth|little) toe$/i, /^sesamoid bone of {s} foot$/i]),
      deko("Zungenbein", "knochen", "knochen", KNOCHEN, ["Hyoid bone"]),
      deko("Zähne", "knochen", "zahn", "#F2EAD6", [/secondary (incisor|canine|premolar|molar) tooth$/i], { gewicht: 0.6 }),
    ],
  },

  // ------------------------------------------------------------------ Bänder, Bandscheiben, Sehnenplatten
  sehnen: {
    name: "Sehnen und Bänder", dreiecke: 16000, teile: [
      eins("bandscheiben:M", "sehnen", "knorpel", "#D7E2E4", [/^intervertebral disk/i]),
      ...paar("tractus", "sehnen", "sehne", SEHNE, ["{s} iliotibial tract"]),
      ...paar("achillessehne", "sehnen", "sehne", SEHNE, ["{s} calcaneal tendon"]),
      ...paar("karpaltunnel", "sehnen", "sehne", SEHNE, ["Flexor retinaculum of {s} wrist"]),
      deko("Weiße Linie (Bauchmitte)", "sehnen", "sehne", SEHNE, ["Linea alba"]),
      ...dekoPaar("Membran zwischen Elle und Speiche", "sehnen", "sehne", SEHNE, ["Interosseous membrane of {s} forearm"]),
      ...dekoPaar("Membran zwischen Schienbein und Wadenbein", "sehnen", "sehne", SEHNE, ["Interosseous membrane of {s} leg"]),
      ...dekoPaar("Langes Fußsohlenband", "sehnen", "sehne", SEHNE, ["{s} long plantar ligament"]),
    ],
  },

  // ------------------------------------------------------------------ Muskeln
  muskeln: {
    name: "Muskeln", dreiecke: 150000, teile: [
      ...paar("kopfwender", "muskeln", "muskel", MUSKEL, ["{s} sternocleidomastoid"]),
      ...paar("trapez", "muskeln", "muskel", MUSKEL, [/^(ascending|descending|transverse) part of {s} trapezius$/i], { gewicht: 1.3 }),
      ...paar("deltamuskel", "muskeln", "muskel", MUSKEL, [/^(acromial|clavicular|spinal) part of {s} deltoid$/i]),
      ...paar("brustmuskel", "muskeln", "muskel", MUSKEL, [/^(abdominal|clavicular|sternocostal) part of {s} pectoralis major$/i]),
      ...paar("saegemuskel", "muskeln", "muskel", MUSKEL, ["{s} serratus anterior"]),
      ...paar("schraeger-bauchmuskel", "muskeln", "muskel", MUSKEL, ["{s} external oblique"], { gewicht: 1.4 }),
      ...paar("bizeps", "muskeln", "muskel", MUSKEL, [/^(long|short) head of {s} biceps brachii$/i]),
      ...paar("oberarmspeichenmuskel", "muskeln", "muskel", MUSKEL, ["{s} brachioradialis"]),
      ...paar("unterarmbeuger", "muskeln", "muskel", MUSKEL, [/^{s} (flexor carpi radialis|palmaris longus|flexor digitorum superficialis)$/i, /^humeral head of {s} flexor carpi ulnaris$/i]),
      ...paar("daumenballen", "muskeln", "muskel", MUSKEL, [/^{s} (abductor pollicis brevis|flexor pollicis brevis|opponens pollicis)$/i]),
      ...paar("hueftbeuger", "muskeln", "muskel", MUSKEL, [/^{s} (psoas major|iliacus)$/i]),
      ...paar("schenkelbindenspanner", "muskeln", "muskel", MUSKEL, ["{s} tensor fasciae latae"]),
      ...paar("adduktoren", "muskeln", "muskel", MUSKEL, [/^{s} (adductor longus|adductor brevis|adductor magnus|adductor minimus|pectineus|gracilis)$/i]),
      ...paar("aeusserer-schenkelmuskel", "muskeln", "muskel", MUSKEL, ["{s} vastus lateralis"]),
      ...paar("gerader-schenkelmuskel", "muskeln", "muskel", MUSKEL, ["{s} rectus femoris"]),
      ...paar("innerer-schenkelmuskel", "muskeln", "muskel", MUSKEL, ["{s} vastus medialis"]),
      ...paar("schneidermuskel", "muskeln", "muskel", MUSKEL, ["{s} sartorius"]),
      ...paar("schienbeinmuskel", "muskeln", "muskel", MUSKEL, ["{s} tibialis anterior"]),
      ...paar("wadenbeinmuskel", "muskeln", "muskel", MUSKEL, [/^{s} fibularis (longus|brevis)$/i]),
      ...paar("zwillingswadenmuskel", "muskeln", "muskel", MUSKEL, [/^(lateral|medial) head of {s} gastrocnemius$/i]),
      ...paar("rotatorenmanschette-muskeln", "muskeln", "muskel", MUSKEL, [/^{s} (supraspinatus|infraspinatus muscle|teres minor|subscapularis)$/i]),
      ...paar("rueckenstrecker", "muskeln", "muskel", MUSKEL, [/^{s} (iliocostalis (cervicis|thoracis|lumborum)|longissimus (capitis|cervicis|thoracis)|spinalis thoracis)$/i]),
      ...paar("trizeps", "muskeln", "muskel", MUSKEL, [/^(long|lateral|medial) head of {s} triceps brachii$/i]),
      ...paar("unterarmstrecker", "muskeln", "muskel", MUSKEL, [/^{s} (extensor carpi radialis longus|extensor carpi radialis brevis|extensor digitorum|extensor carpi ulnaris|extensor digiti minimi)$/i]),
      ...paar("mittlerer-gesaessmuskel", "muskeln", "muskel", MUSKEL, ["{s} gluteus medius"]),
      ...paar("grosser-gesaessmuskel", "muskeln", "muskel", MUSKEL, ["{s} gluteus maximus"], { gewicht: 1.3 }),
      ...paar("birnenmuskel", "muskeln", "muskel", MUSKEL, ["{s} piriformis"]),
      ...paar("zweikoepfiger-schenkelmuskel", "muskeln", "muskel", MUSKEL, [/^(long|short) head of {s} biceps femoris$/i]),
      ...paar("halbsehnenmuskel", "muskeln", "muskel", MUSKEL, [/^{s} (semitendinosus|semimembranosus)$/i]),
      ...paar("schollenmuskel", "muskeln", "muskel", MUSKEL, ["{s} soleus"]),
      // ohne eigene Erklärung, füllen das Bild
      ...dekoPaar("Großer Rundmuskel", "muskeln", "muskel", MUSKEL, ["{s} teres major"]),
      ...dekoPaar("Armbeuger (Brachialis)", "muskeln", "muskel", MUSKEL, ["{s} brachialis"]),
      ...dekoPaar("Rautenmuskeln", "muskeln", "muskel", MUSKEL, [/^{s} rhomboid (major|minor)$/i]),
      ...dekoPaar("Schulterblattheber", "muskeln", "muskel", MUSKEL, ["{s} levator scapulae"]),
      ...dekoPaar("Kleiner Brustmuskel", "muskeln", "muskel", MUSKEL, ["{s} pectoralis minor"]),
      ...dekoPaar("Kleiner Gesäßmuskel", "muskeln", "muskel", MUSKEL, ["{s} gluteus minimus"]),
      ...dekoPaar("Mittlerer Schenkelmuskel", "muskeln", "muskel", MUSKEL, ["{s} vastus intermedius"]),
      ...dekoPaar("Hinterer Schienbeinmuskel", "muskeln", "muskel", MUSKEL, ["{s} tibialis posterior"]),
      ...dekoPaar("Zehenstrecker", "muskeln", "muskel", MUSKEL, [/^{s} extensor (digitorum|hallucis) longus$/i]),
      ...dekoPaar("Zehenbeuger", "muskeln", "muskel", MUSKEL, [/^{s} flexor (digitorum|hallucis) longus$/i]),
      ...dekoPaar("Tiefer Fingerbeuger", "muskeln", "muskel", MUSKEL, ["{s} flexor digitorum profundus"]),
      ...dekoPaar("Riemenmuskeln des Nackens", "muskeln", "muskel", MUSKEL, [/^{s} splenius (capitis|cervicis)$/i, "{s} semispinalis capitis"]),
      ...dekoPaar("Treppenmuskeln", "muskeln", "muskel", MUSKEL, [/^{s} scalenus (anterior|medius|posterior)$/i]),
      ...dekoPaar("Unterarmdreher", "muskeln", "muskel", MUSKEL, ["{s} supinator", /^(humeral|ulnar) head of {s} pronator teres$/i]),
    ],
  },

  // ------------------------------------------------------------------ Lunge und Atemwege
  lunge: {
    name: "Lunge", dreiecke: 60000, teile: [
      ...paar("lunge", "organe", "lunge", "#E3A3A2", [{ v: "{s} lung" }], { huelle: true, gewicht: 2.2 }),
      eins("luftroehre:M", "organe", "knorpel", "#E9DCCF", ["Trachea", "Left main bronchus", "Right main bronchus proper", /bronchial tree$/i], { gewicht: 1.4 }),
      deko("Lungenarterien", "organe", "vene", "#4D6FB8", [{ v: "right lung", nur: /artery/i }, { v: "left lung", nur: /artery/i }, /^(right|left) pulmonary artery$/i, "Pulmonary trunk"], { gewicht: 0.9 }),
      deko("Lungenvenen", "organe", "arterie", "#C33A3A", [{ v: "right lung", nur: /vein/i }, { v: "left lung", nur: /vein/i }, /^(right|left) (superior|inferior) pulmonary vein$/i], { gewicht: 0.9 }),
      eins("zwerchfell:M", "organe", "muskel", "#A84B42", ["Diaphragm"], { gewicht: 1.2 }),
    ],
  },

  // ------------------------------------------------------------------ Herz und große Gefäße
  herz: {
    name: "Herz", dreiecke: 40000, teile: [
      eins("herz:M", "organe", "herz", "#93362F", ["Wall of left atrium", "Wall of right atrium", "Wall of ventricle"], { gewicht: 2 }),
      eins("herz:M", "organe", "arterie", ARTERIE, [{ v: "heart", nur: /coronary artery|conus artery/i }]),
      eins("herz:M", "organe", "vene", VENE, [{ v: "heart", nur: /cardiac vein|marginal vein|coronary sinus|vein of left ventricle/i }]),
      eins("aorta:M", "organe", "arterie", ARTERIE, [r("ascending aorta|arch of aorta|descending aorta|descending thoracic aorta|abdominal aorta")], { gewicht: 1.3 }),
      ...paar("halsschlagader", "organe", "arterie", ARTERIE, ["{s} common carotid artery"]),
      deko("Hohlvenen", "organe", "vene", VENE, ["Superior vena cava", "Inferior vena cava", /^(right|left) brachiocephalic vein$/i]),
      deko("Lungenschlagader", "organe", "vene", "#4D6FB8", ["Pulmonary trunk", /^(right|left) pulmonary artery$/i]),
      deko("Arm- und Kopfschlagader", "organe", "arterie", ARTERIE, ["Brachiocephalic artery", /^(right|left) subclavian artery$/i]),
    ],
  },

  // ------------------------------------------------------------------ Verdauung
  verdauung: {
    name: "Verdauung", dreiecke: 60000, teile: [
      eins("speiseroehre:M", "organe", "organ", "#C98479", ["Esophagus"]),
      eins("magen:M", "organe", "organ", "#D9978A", ["Stomach"], { gewicht: 1.3 }),
      eins("leber:M", "organe", "organ", "#7C3024", [/^hepatovenous segment/i, "Caudate lobe of liver"], { gewicht: 2 }),
      eins("gallenblase:M", "organe", "organ", "#557F3C", ["Gallbladder"]),
      eins("bauchspeicheldruese:M", "organe", "organ", "#E1B57E", ["Pancreas"], { gewicht: 1.2 }),
      eins("milz:M", "organe", "organ", "#6F2B3A", ["Spleen"]),
      eins("duenndarm:M", "organe", "darm", "#E0A08E", [r("duodenum|(proximal|middle|distal) part of (jejunum|ileum)")], { gewicht: 1.6 }),
      eins("dickdarm:M", "organe", "darm", "#C78A72", [r("ascending colon|transverse colon|descending colon|rectum|ileocecal junction")], { gewicht: 1.6 }),
      eins("blinddarm:M", "organe", "darm", "#C78A72", ["Appendix"]),
    ],
  },

  // ------------------------------------------------------------------ Nieren, Harnwege, männliche Organe
  harnwege: {
    name: "Nieren und Harnwege", dreiecke: 24000, teile: [
      ...paar("niere", "organe", "organ", "#8E3A2F", ["{s} kidney"], { gewicht: 1.5 }),
      ...paar("nebenniere", "organe", "organ", "#D6A341", ["{s} adrenal gland"]),
      ...paar("harnleiter", "organe", "organ", "#E0C26C", ["{s} ureter"]),
      eins("harnblase:M", "organe", "organ", "#E0BE6A", ["Urinary bladder"]),
      eins("prostata:M", "organe", "organ", "#B5768C", ["Prostate"], { geschlecht: "M" }),
      deko("Harnröhre", "organe", "organ", "#E0C26C", ["Urethra"], { geschlecht: "M" }),
      ...dekoPaar("Samenbläschen", "organe", "organ", "#C99A9E", ["{s} seminal vesicle"], { geschlecht: "M" }),
      ...dekoPaar("Samenleiter", "organe", "organ", "#D8B4A4", ["{s} deferent duct"], { geschlecht: "M" }),
      ...dekoPaar("Hoden", "organe", "organ", "#D9B8A8", ["{s} testis", "{s} epididymis"], { geschlecht: "M" }),
      deko("Schwellkörper", "organe", "organ", "#C98B86", ["Corpus cavernosum of penis", "Corpus spongiosum of penis", "Glans penis"], { geschlecht: "M" }),
      ...dekoPaar("Beckenvenen", "organe", "vene", VENE, ["{s} common iliac vein", "{s} external iliac vein", "{s} internal iliac vein"]),
      ...dekoPaar("Beckenarterien", "organe", "arterie", ARTERIE, ["{s} common iliac artery", "{s} external iliac artery", "{s} internal iliac artery"]),
    ],
  },

  // ------------------------------------------------------------------ Gehirn
  gehirn: {
    name: "Gehirn", dreiecke: 46000, teile: [
      eins("gehirn:M", "organe", "gehirn", "#E2BDB4", [{ v: "brain", nur: /^(?!.*(ventricle|aqueduct|choroid|canal|plexus|commissure|fornix|stria|habenula|septum|lamina|interpeduncular|interventricular|caudate|putamen|globus|thalamus|internal capsule|hippocampus|amygdala|white matter|geniculate|colliculus|mammillary|tract))/i }], { gewicht: 3 }),
      deko("Hirnanhangdrüse", "organe", "organ", "#D99A7B", ["Pituitary gland"]),
    ],
  },

  // ------------------------------------------------------------------ Nerven (in den freien Daten nur am Auge)
  nerven: {
    name: "Nerven", dreiecke: 8000, teile: [
      ...paar("trigeminus", "nerven", "nerv", NERV, [/^{s} (ophthalmic|frontal|supra-orbital|supratrochlear|lacrimal|nasociliary|infratrochlear|anterior ethmoidal|posterior ethmoidal|long ciliary) nerve$/i]),
      ...dekoPaar("Sehnerv", "nerven", "nerv", NERV, [/^{s} optic (nerve|tract)$/i]),
      deko("Sehnervenkreuzung", "nerven", "nerv", NERV, ["Optic chiasm"]),
      ...dekoPaar("Augenrollnerv", "nerven", "nerv", NERV, ["{s} trochlear nerve"]),
    ],
  },

  // ------------------------------------------------------------------ Auge
  auge: {
    name: "Auge", dreiecke: 30000, teile: [
      ...dekoPaar("Lederhaut", "organe", "lederhaut", "#F1ECE4", ["{s} sclera"], { gewicht: 1.4 }),
      ...dekoPaar("Hornhaut", "organe", "hornhaut", "#FFFFFF", ["{s} cornea"]),
      ...dekoPaar("Regenbogenhaut", "organe", "iris", "#5E7A8E", ["{s} iris"]),
      ...dekoPaar("Linse", "organe", "linse", "#F4EBD0", ["{s} lens"]),
      ...dekoPaar("Netzhaut", "organe", "organ", "#D88A6E", [/^optic part of {s} retina$/i]),
      ...dekoPaar("Aderhaut", "organe", "organ", "#5B2B25", ["{s} choroid"]),
      ...dekoPaar("Strahlenkörper", "organe", "organ", "#6B3A30", ["{s} corona ciliaris"]),
      ...dekoPaar("Augenmuskeln", "muskeln", "muskel", MUSKEL, [/^{s} (superior|inferior|medial|lateral) rectus$/i, /^{s} (superior|inferior) oblique$/i, "{s} levator palpebrae superioris"]),
      ...dekoPaar("Sehnerv", "nerven", "nerv", NERV, ["{s} optic nerve"]),
      ...dekoPaar("Tränendrüse", "organe", "organ", "#E2B07E", ["{s} lacrimal gland"]),
    ],
  },

  // ------------------------------------------------------------------ Ohr, Nase, Kehlkopf
  hno: {
    name: "Ohr, Nase und Kehlkopf", dreiecke: 22000, teile: [
      deko("Ohrmuschel", "organe", "haut", "#D6A185", ["External ear"], { gewicht: 1.6 }),
      deko("Nasenknorpel", "organe", "knorpel", KNORPEL, [/^(right|left) (major alar|lateral nasal) cartilage$/i, "Septal nasal cartilage"]),
      deko("Nasenmuscheln", "organe", "knochen", KNOCHEN, [/^(right|left) inferior nasal concha$/i]),
      deko("Kehlkopf (Schildknorpel und Ringknorpel)", "organe", "knorpel", KNORPEL, ["Thyroid cartilage", "Cricoid cartilage", /^(right|left) (arytenoid|corniculate|cuneiform) cartilage$/i], { gewicht: 1.3 }),
      deko("Kehldeckel", "organe", "knorpel", "#D8C9B4", ["Epiglottis"]),
      deko("Stimmlippen", "organe", "sehne", SEHNE, [/^(right|left) (vocal ligament|vocalis)$/i]),
      deko("Zungenbein", "knochen", "knochen", KNOCHEN, ["Hyoid bone"]),
      deko("Luftröhre", "organe", "knorpel", "#E9DCCF", ["Trachea"]),
      deko("Rachenmuskeln", "muskeln", "muskel", MUSKEL, [/^(right|left) (superior|middle|inferior) pharyngeal constrictor$/i], { gewicht: 0.5 }),
      deko("Zunge", "organe", "zunge", "#C4646A", ["Tongue"]),
    ],
  },

  // ------------------------------------------------------------------ Mund, Kiefer, Zähne
  mund: {
    name: "Mund und Kiefer", dreiecke: 60000, teile: [
      eins("mund:oberkiefer", "knochen", "knochen", KNOCHEN, [r("(right|left) maxilla|(right|left) palatine bone")], { gewicht: 1.6 }),
      eins("mund:unterkiefer", "knochen", "knochen", KNOCHEN, ["Mandible"], { gewicht: 1.6, klappe: true }),
      eins("mund:zahnfleisch", "organe", "zahnfleisch", "#D47A7E", ["Gingiva of upper jaw"]),
      eins("mund:zahnfleisch", "organe", "zahnfleisch", "#D47A7E", ["Gingiva of lower jaw"], { klappe: true }),
      eins("mund:zunge", "organe", "zunge", "#C4646A", ["Tongue"], { klappe: 0.55, gewicht: 1.4 }),
      eins("mund:gaumen", "muskeln", "gaumen", "#D98D8E", [/^(right|left) (levator|tensor) veli palatini$/i, /^(right|left) palatopharyngeus$/i], { gewicht: 0.6 }),
      eins("mund:zaepfchen", "muskeln", "gaumen", "#D98D8E", ["Uvular muscle"]),
      eins("mund:mundboden", "muskeln", "muskel", MUSKEL, [/^(right|left) (mylohyoid|geniohyoid|digastric)$/i, /^(right|left) (genioglossus|hyoglossus)$/i], { klappe: true }),
      eins("mund:speicheldruesen", "organe", "organ", "#E2B07E", [/^(right|left) (submandibular|sublingual) gland$/i], { klappe: true }),
      eins("mund:zungenbein", "knochen", "knochen", KNOCHEN, ["Hyoid bone"], { klappe: 0.3 }),
      ...dekoPaar("Schläfenbein mit Gelenkpfanne des Kiefergelenks", "knochen", "knochen", KNOCHEN, ["{s} temporal bone"], { gewicht: 0.8 }),
      deko("Jochbein", "knochen", "knochen", KNOCHEN, [/^(right|left) zygomatic bone$/i], { gewicht: 0.6 }),
      // Zähne: FDI-Nummer = Kennung (1. Ziffer Quadrant: 1 oben rechts, 2 oben links, 3 unten links, 4 unten rechts)
      ...[["upper", "right", 1], ["upper", "left", 2], ["lower", "left", 3], ["lower", "right", 4]].flatMap(([kiefer, seite, q]) =>
        [["central secondary incisor", 1], ["lateral secondary incisor", 2], ["secondary canine", 3], ["first secondary premolar", 4], ["second secondary premolar", 5], ["first secondary molar", 6], ["second secondary molar", 7]].map(([art, n]) =>
          eins(`${q}${n}`, "zaehne", "zahn", "#F3EBD8", [`${seite} ${kiefer} ${art} tooth`], { klappe: kiefer === "lower", zahn: true, gewicht: 1.1 }))),
    ],
  },
};
