// Schnittmodelle für einzelne Organe: Auge, Ohr und Haut im Querschnitt. Jedes Modell ist
// eine Liste von Teilen mit Form, Farbe und Erklärung; gezeichnet wird in der Reihenfolge
// der Liste (hinten zuerst). Schematische Darstellung zur Erklärung, keine Diagnose.

import { ellipse, flaeche, glatt, strich, type Form, type P } from "./formen";

export type SchnittId = "auge" | "ohr" | "haut";

export interface SchnittTeil {
  id: string;
  name: string;
  latein?: string;
  farbe: string;
  rand: string;
  formen: Form[];
  was: string;
  beschwerden: string;
}

export interface SchnittModell {
  id: SchnittId;
  titel: string;
  /** Was die Zeichnung zeigt (Blickrichtung) */
  ansicht: string;
  breite: number;
  hoehe: number;
  teile: SchnittTeil[];
  /** Beschriftung ohne eigene Erklärung, z. B. „vorn“ / „hinten“ */
  hinweise: { text: string; bei: P }[];
}

/** Punkte auf einem Kreisbogen (Winkel in Grad, 0 = rechts, im Uhrzeigersinn auf dem Bildschirm). */
const bogen = (c: P, r: number, von: number, bis: number, n = 14, ry = r): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const w = ((von + ((bis - von) * i) / n) * Math.PI) / 180;
    return [c[0] + Math.cos(w) * r, c[1] + Math.sin(w) * ry] as P;
  });
const ring = (c: P, r: number, von: number, bis: number, w: number): Form => ({ d: glatt(bogen(c, r, von, bis, 18), false, 0.9), strich: w });

// ================================================================ Auge
// Waagerechter Schnitt durch das rechte Auge, von oben gesehen: vorn (Hornhaut) ist links.
const A: P = [214, 160];
const AUGE: SchnittModell = {
  id: "auge", titel: "Das Auge", ansicht: "Schnitt durch den Augapfel, vorn ist links", breite: 420, hoehe: 320,
  hinweise: [{ text: "vorn", bei: [40, 304] }, { text: "hinten", bei: [384, 304] }],
  teile: [
    { id: "augenmuskeln", name: "Augenmuskeln", latein: "Musculi bulbi", farbe: "#C9706F", rand: "#8A3B3B",
      formen: [strich([[150, 62], [240, 44], [340, 38], [404, 44]], 9), strich([[150, 258], [240, 276], [340, 282], [404, 276]], 9)],
      was: "Sechs kleine Muskeln bewegen jedes Auge in alle Richtungen. Beide Augen werden dabei genau gleich gesteuert, damit ein einziges Bild entsteht.",
      beschwerden: "Arbeiten die Muskeln nicht im Gleichgewicht, schielt das Auge oder man sieht doppelt. Bei Kindern sollte Schielen früh behandelt werden, sonst lernt das Auge nicht richtig zu sehen." },
    { id: "sehnerv", name: "Sehnerv", latein: "Nervus opticus", farbe: "#F0D878", rand: "#A68A22",
      formen: [strich([[312, 186], [356, 204], [410, 214]], 20)],
      was: "Der Sehnerv leitet die Signale der Netzhaut zum Gehirn. Er besteht aus etwa einer Million Nervenfasern.",
      beschwerden: "Beim Grünen Star (Glaukom) sterben Nervenfasern langsam ab, oft durch zu hohen Augeninnendruck. Das merkt man lange nicht; deshalb ist die Früherkennung wichtig." },
    { id: "lederhaut", name: "Lederhaut", latein: "Sclera", farbe: "#FBF8F2", rand: "#B9AE9A",
      formen: [ellipse(A, 112, 112)],
      was: "Die Lederhaut ist die feste weiße Hülle des Augapfels. Sie gibt dem Auge seine Form; von außen sieht man sie als »das Weiße« im Auge.",
      beschwerden: "Ist das Weiße gerötet, steckt meist eine harmlose Reizung oder Bindehautentzündung dahinter. Schmerzen, Lichtscheu oder schlechteres Sehen gehören rasch abgeklärt." },
    { id: "aderhaut", name: "Aderhaut", latein: "Choroidea", farbe: "#A8504A", rand: "#6E2D29",
      formen: [ring(A, 104, -128, 128, 6)],
      was: "Die Aderhaut liegt zwischen Lederhaut und Netzhaut. Ihre vielen Blutgefäße versorgen die Netzhaut mit Sauerstoff und Nährstoffen.",
      beschwerden: "Bei der feuchten Makuladegeneration wachsen hier krankhafte Gefäße ein, aus denen Flüssigkeit austritt. Spritzen ins Auge können das aufhalten." },
    { id: "glaskoerper", name: "Glaskörper", latein: "Corpus vitreum", farbe: "#DCEFF7", rand: "#8FB7CC",
      formen: [ellipse(A, 96, 96)],
      was: "Der Glaskörper ist eine klare, gelartige Masse, die das Innere des Auges ausfüllt und es prall hält.",
      beschwerden: "Mit dem Alter verflüssigt er sich; dann sieht man kleine schwebende Punkte oder Fäden (»fliegende Mücken«). Plötzliche Lichtblitze oder ein Schatten im Blickfeld sind ein Notfall." },
    { id: "netzhaut", name: "Netzhaut", latein: "Retina", farbe: "#F0A65A", rand: "#A8641E",
      formen: [ring(A, 98, -122, 122, 5)],
      was: "Die Netzhaut kleidet das Auge innen aus. Ihre Sinneszellen wandeln Licht in Nervensignale um, ähnlich wie der Sensor einer Kamera.",
      beschwerden: "Diabetes und Bluthochdruck schädigen die feinen Gefäße der Netzhaut. Löst sich die Netzhaut ab, sieht man Blitze, Rußregen oder einen Vorhang; das muss sofort behandelt werden." },
    { id: "makula", name: "Makula (Gelber Fleck)", latein: "Macula lutea", farbe: "#F7D447", rand: "#9A7B10",
      formen: [ellipse([311, 150], 6, 11)],
      was: "Die Makula ist die Stelle des schärfsten Sehens in der Mitte der Netzhaut. Mit ihr liest man und erkennt Gesichter.",
      beschwerden: "Bei der altersbedingten Makuladegeneration (AMD) lässt das Sehen in der Mitte nach: Gerade Linien erscheinen verbogen, Buchstaben verschwimmen." },
    { id: "ziliarkoerper", name: "Ziliarkörper", latein: "Corpus ciliare", farbe: "#B98A6E", rand: "#7A553D",
      formen: [flaeche([[128, 92], [142, 100], [140, 118], [128, 122], [122, 106]], 0.6), flaeche([[128, 228], [142, 220], [140, 202], [128, 198], [122, 214]], 0.6), strich([[130, 120], [126, 132]], 1.4), strich([[130, 200], [126, 188]], 1.4)],
      was: "Der Ziliarkörper hält die Linse über feine Fasern und verformt sie mit seinem Ringmuskel. So stellt das Auge auf Nähe und Ferne scharf. Er bildet auch das Kammerwasser.",
      beschwerden: "Ab etwa 45 Jahren wird die Linse steifer und das Scharfstellen in der Nähe fällt schwerer (Alterssichtigkeit). Dann hilft eine Lesebrille." },
    { id: "linse", name: "Linse", latein: "Lens", farbe: "#F4EDC2", rand: "#A89C52",
      formen: [ellipse([126, 160], 17, 40)],
      was: "Die Linse bündelt das Licht auf die Netzhaut. Sie ist klar und elastisch und verändert ihre Form zum Scharfstellen.",
      beschwerden: "Beim Grauen Star (Katarakt) trübt sich die Linse: Man sieht wie durch Nebel und wird leichter geblendet. Bei der Operation wird sie durch eine Kunstlinse ersetzt." },
    { id: "vorderkammer", name: "Vordere Augenkammer", latein: "Camera anterior", farbe: "#CFE9F2", rand: "#7FB0C4",
      formen: [flaeche([[104, 108], [90, 132], [84, 160], [90, 188], [104, 212], [110, 186], [108, 160], [110, 134]], 0.7)],
      was: "Zwischen Hornhaut und Regenbogenhaut liegt die vordere Augenkammer. Sie ist mit Kammerwasser gefüllt, das ständig gebildet wird und im Kammerwinkel abfließt.",
      beschwerden: "Fließt das Kammerwasser schlecht ab, steigt der Augeninnendruck. Das kann den Sehnerv schädigen (Grüner Star). Der Druck wird beim Augenarzt gemessen." },
    { id: "regenbogenhaut", name: "Regenbogenhaut und Pupille", latein: "Iris und Pupilla", farbe: "#6F9BB8", rand: "#3D6480",
      formen: [strich([[110, 112], [112, 126], [111, 142]], 7), strich([[110, 208], [112, 194], [111, 178]], 7)],
      was: "Die Regenbogenhaut gibt dem Auge seine Farbe. Ihre Öffnung, die Pupille, wird bei hellem Licht eng und im Dunkeln weit, wie die Blende einer Kamera.",
      beschwerden: "Eine Entzündung der Regenbogenhaut verursacht ein rotes, schmerzendes, lichtempfindliches Auge. Ungleich große Pupillen sollten abgeklärt werden." },
    { id: "hornhaut", name: "Hornhaut", latein: "Cornea", farbe: "#BFE3F0", rand: "#5F9FB8",
      formen: [strich([[112, 96], [92, 116], [80, 138], [76, 160], [80, 182], [92, 204], [112, 224]], 7)],
      was: "Die Hornhaut ist das klare »Fenster« vorn am Auge. Sie bricht das Licht am stärksten und ist sehr empfindlich.",
      beschwerden: "Kratzer und Entzündungen schmerzen stark und tränen. Ist die Hornhaut ungleich gewölbt, sieht man verzerrt (Hornhautverkrümmung). Beim Lasern wird ihre Form verändert." },
    { id: "bindehaut", name: "Bindehaut", latein: "Conjunctiva", farbe: "#F2B8B5", rand: "#B5605E",
      formen: [strich([[150, 66], [128, 78], [112, 94]], 3.4), strich([[150, 254], [128, 242], [112, 226]], 3.4)],
      was: "Die Bindehaut ist eine dünne Schleimhaut, die das Weiße des Auges und die Innenseite der Lider überzieht. Sie hält das Auge feucht.",
      beschwerden: "Die Bindehautentzündung macht das Auge rot, es juckt, brennt und tränt. Ursachen sind Viren, Bakterien, Allergien oder trockene Augen." },
  ],
};

// ================================================================ Ohr
// Schnitt durch das rechte Ohr von vorn: außen ist links, innen (zum Kopf) rechts.
const spirale = (c: P, r0: number, r1: number, umdrehungen: number): P[] =>
  Array.from({ length: 40 }, (_, i) => {
    const t = i / 39, w = t * umdrehungen * 2 * Math.PI, r = r0 + (r1 - r0) * t;
    return [c[0] + Math.cos(w) * r, c[1] + Math.sin(w) * r * 0.85] as P;
  });
const OHR: SchnittModell = {
  id: "ohr", titel: "Das Ohr", ansicht: "Schnitt durch das Ohr, außen ist links", breite: 472, hoehe: 328,
  hinweise: [{ text: "Außenohr", bei: [70, 304] }, { text: "Mittelohr", bei: [262, 304] }, { text: "Innenohr", bei: [366, 304] }],
  teile: [
    { id: "schlaefenbein", name: "Schläfenbein", latein: "Os temporale", farbe: "#EFE3CC", rand: "#A8956C",
      formen: [flaeche([[150, 40], [300, 24], [448, 40], [450, 290], [330, 300], [250, 250], [228, 214], [150, 204], [130, 150], [140, 90]], 0.4)],
      was: "Mittelohr und Innenohr liegen geschützt in einem der härtesten Knochen des Körpers, dem Felsenbein, einem Teil des Schläfenbeins.",
      beschwerden: "Eine verschleppte Mittelohrentzündung kann auf den Knochen hinter dem Ohr übergreifen. Dann schmerzt und schwillt die Stelle hinter der Ohrmuschel." },
    { id: "ohrmuschel", name: "Ohrmuschel", latein: "Auricula", farbe: "#F0C9B0", rand: "#B07F62",
      formen: [flaeche([[96, 34], [58, 40], [30, 80], [26, 140], [40, 196], [62, 236], [86, 262], [104, 250], [100, 214], [112, 186], [128, 176], [128, 146], [108, 136], [92, 110], [100, 70], [116, 52]], 0.6), strich([[94, 60], [66, 70], [50, 110], [54, 160], [76, 200]], 2)],
      was: "Die Ohrmuschel fängt den Schall auf und leitet ihn in den Gehörgang. Sie besteht aus elastischem Knorpel und hilft zu erkennen, woher ein Geräusch kommt.",
      beschwerden: "Sie kann sich entzünden oder nach einem Schlag anschwellen. Abstehende Ohren sind harmlos und können auf Wunsch angelegt werden." },
    { id: "gehoergang", name: "Gehörgang", latein: "Meatus acusticus externus", farbe: "#F7DCC9", rand: "#B07F62",
      formen: [strich([[116, 162], [150, 156], [190, 162], [226, 166]], 22)],
      was: "Der etwa drei Zentimeter lange Gehörgang leitet den Schall zum Trommelfell. Drüsen bilden Ohrenschmalz, das den Gang reinigt und schützt.",
      beschwerden: "Ein Pfropf aus Ohrenschmalz dämpft das Hören; Wattestäbchen schieben ihn nur tiefer. Die Entzündung des Gehörgangs (»Badeotitis«) juckt und schmerzt." },
    { id: "paukenhoehle", name: "Paukenhöhle (Mittelohr)", latein: "Cavum tympani", farbe: "#FBF3E4", rand: "#B9A680",
      formen: [flaeche([[240, 120], [270, 112], [296, 124], [300, 170], [292, 208], [262, 214], [240, 204]], 0.6)],
      was: "Die Paukenhöhle ist ein luftgefüllter Raum hinter dem Trommelfell. In ihr liegen die drei Gehörknöchelchen.",
      beschwerden: "Bei einer Mittelohrentzündung sammelt sich hier Flüssigkeit oder Eiter: pochende Ohrenschmerzen, Fieber, dumpfes Hören. Sie ist bei Kindern sehr häufig." },
    { id: "ohrtrompete", name: "Ohrtrompete", latein: "Tuba auditiva", farbe: "#F2B8B5", rand: "#B5605E",
      formen: [strich([[274, 210], [296, 244], [330, 276], [370, 296]], 8)],
      was: "Die Ohrtrompete verbindet das Mittelohr mit dem Rachen. Beim Schlucken und Gähnen öffnet sie sich und gleicht den Druck aus.",
      beschwerden: "Ist sie bei einer Erkältung zugeschwollen, fühlt sich das Ohr wie verstopft an und es knackt. Im Flugzeug oder beim Tauchen kann das schmerzen." },
    { id: "trommelfell", name: "Trommelfell", latein: "Membrana tympani", farbe: "#D9B8A0", rand: "#8A654C",
      formen: [strich([[236, 136], [242, 166], [236, 198]], 3.6)],
      was: "Das Trommelfell ist ein dünnes Häutchen am Ende des Gehörgangs. Schallwellen versetzen es in Schwingung.",
      beschwerden: "Durch Entzündung, Wattestäbchen oder einen Knall kann es reißen. Kleine Löcher heilen meist von selbst. Bei häufigen Ergüssen wird ein Röhrchen eingesetzt." },
    { id: "gehoerknoechelchen", name: "Gehörknöchelchen", latein: "Hammer, Amboss, Steigbügel", farbe: "#F3E9D4", rand: "#8F7C55",
      formen: [strich([[243, 172], [250, 152], [256, 138]], 4), ellipse([258, 136], 6, 5), flaeche([[262, 134], [276, 138], [280, 150], [272, 162], [266, 148]], 0.6), strich([[274, 160], [288, 164]], 3), ellipse([292, 164], 4, 6)],
      was: "Hammer, Amboss und Steigbügel sind die kleinsten Knochen des Körpers. Sie übertragen die Schwingung des Trommelfells verstärkt auf das Innenohr.",
      beschwerden: "Nach chronischen Entzündungen kann die Kette unterbrochen oder versteift sein. Dann hört man schlechter; eine Operation kann sie wiederherstellen." },
    { id: "gleichgewichtsorgan", name: "Gleichgewichtsorgan", latein: "Organum vestibulare", farbe: "#CFE3F0", rand: "#44779B",
      formen: [{ ...ellipse([338, 104], 26, 18, -30), strich: 6 }, { ...ellipse([366, 112], 22, 16, 40), strich: 6 }, { ...ellipse([352, 88], 18, 22, 80), strich: 6 }, ellipse([342, 136], 15, 12)],
      was: "Drei Bogengänge und zwei kleine Säckchen messen Drehungen und die Lage des Kopfes. Zusammen mit Augen und Muskeln halten sie den Körper im Gleichgewicht.",
      beschwerden: "Lösen sich winzige Kristalle und geraten in einen Bogengang, entsteht kurzer Drehschwindel bei Kopfbewegungen (Lagerungsschwindel). Er lässt sich mit bestimmten Lagerungsübungen beheben." },
    { id: "schnecke", name: "Hörschnecke", latein: "Cochlea", farbe: "#CFE3F0", rand: "#44779B",
      formen: [ellipse([356, 190], 30, 26), { d: glatt(spirale([356, 190], 3, 24, 2.4), false, 0.9), strich: 4 }],
      was: "In der Hörschnecke wandeln feine Haarzellen die Schwingungen in Nervensignale um. Hohe Töne werden am Eingang, tiefe an der Spitze der Schnecke gehört.",
      beschwerden: "Lärm und Alter schädigen die Haarzellen dauerhaft: Zuerst gehen die hohen Töne verloren. Ohrgeräusche (Tinnitus) und der Hörsturz entstehen ebenfalls hier." },
    { id: "hoernerv", name: "Hör- und Gleichgewichtsnerv", latein: "Nervus vestibulocochlearis", farbe: "#F4D452", rand: "#9A7B10",
      formen: [strich([[382, 186], [414, 172], [452, 160]], 10), strich([[360, 140], [392, 150], [414, 168]], 5)],
      was: "Der Nerv leitet die Signale der Hörschnecke und des Gleichgewichtsorgans zum Gehirn.",
      beschwerden: "Entzündet sich der Gleichgewichtsanteil, entsteht tagelanger starker Drehschwindel mit Übelkeit. Einseitige Hörminderung mit Ohrgeräusch sollte abgeklärt werden." },
  ],
};

// ================================================================ Haut
// Schnitt durch die Haut wie ein Block: oben die Oberfläche, unten das Fettgewebe.
const wellig = (y: number, hub: number, von = 20, bis = 400, schritt = 20): P[] =>
  Array.from({ length: Math.floor((bis - von) / schritt) + 1 }, (_, i) => [von + i * schritt, y + (i % 2 ? hub : -hub)] as P);
const HAUT: SchnittModell = {
  id: "haut", titel: "Die Haut", ansicht: "Schnitt durch die Haut, oben ist die Oberfläche", breite: 420, hoehe: 330,
  hinweise: [{ text: "Oberfläche", bei: [26, 36] }],
  teile: [
    { id: "unterhaut", name: "Unterhaut (Fettgewebe)", latein: "Subcutis", farbe: "#F7E2A6", rand: "#B89B4C",
      formen: [flaeche([[20, 214], [400, 214], [400, 310], [20, 310]], 0.1), ellipse([70, 262], 30, 24), ellipse([138, 268], 28, 26), ellipse([206, 260], 30, 24), ellipse([276, 268], 30, 26), ellipse([346, 262], 32, 24)],
      was: "Die Unterhaut besteht vor allem aus Fettgewebe. Sie polstert, speichert Energie und schützt vor Kälte.",
      beschwerden: "Hier entstehen gutartige Fettgeschwülste (Lipome), die als weiche Knoten tastbar sind. Spritzen wie Insulin oder Thrombosespritzen werden in die Unterhaut gegeben." },
    { id: "lederhaut", name: "Lederhaut", latein: "Dermis", farbe: "#F3C5AE", rand: "#B5806A",
      formen: [flaeche([...wellig(92, 5), [400, 214], [20, 214]], 0.5)],
      was: "Die Lederhaut gibt der Haut Festigkeit und Elastizität. In ihr liegen Blutgefäße, Nerven, Haarwurzeln, Talg- und Schweißdrüsen.",
      beschwerden: "Mit dem Alter und durch Sonne nimmt das stützende Kollagen ab: Die Haut wird dünner und bekommt Falten. Tiefe Wunden und Dehnungsstreifen entstehen in dieser Schicht." },
    { id: "blutgefaesse", name: "Blutgefäße", latein: "Vasa sanguinea", farbe: "#D9534F", rand: "#8C2A27",
      formen: [strich([[20, 204], [120, 198], [240, 206], [400, 198]], 4), strich([[60, 202], [64, 150], [58, 112]], 2.2), strich([[232, 206], [238, 150], [230, 112]], 2.2), strich([[332, 200], [338, 150], [330, 112]], 2.2)],
      was: "Feine Blutgefäße versorgen die Haut und regeln die Körpertemperatur: Bei Wärme weiten sie sich, bei Kälte ziehen sie sich zusammen.",
      beschwerden: "Erweiterte Äderchen zeigen sich als Rötung oder feine rote Linien, etwa bei Rosazea oder als Besenreiser. Sie lassen sich veröden oder lasern." },
    { id: "nervenenden", name: "Nervenenden", latein: "Terminationes nervorum", farbe: "#F4D452", rand: "#9A7B10",
      formen: [strich([[20, 190], [80, 186], [102, 150], [100, 110]], 2.6), ellipse([100, 104], 5, 7), strich([[102, 150], [130, 120]], 1.8), strich([[400, 186], [372, 150], [376, 112]], 2.2), ellipse([376, 106], 4, 6)],
      was: "Millionen Nervenenden und Tastkörperchen machen die Haut zum größten Sinnesorgan. Sie melden Berührung, Druck, Wärme, Kälte, Schmerz und Juckreiz.",
      beschwerden: "Bei der Gürtelrose entzünden sich Nerven: brennender Schmerz und Bläschen auf einer Körperseite. Diabetes kann die Nerven schädigen; dann lässt das Gefühl an den Füßen nach." },
    { id: "schweissdruese", name: "Schweißdrüse", latein: "Glandula sudorifera", farbe: "#A9CFE3", rand: "#4F86A3",
      formen: [{ d: glatt([[282, 190], [296, 184], [300, 196], [286, 202], [278, 192], [290, 180], [302, 188]], false, 1), strich: 4.5 }, strich([[292, 180], [286, 150], [296, 120], [288, 90], [292, 64]], 2.6)],
      was: "Schweißdrüsen liegen als kleine Knäuel in der Lederhaut. Ihr Schweiß verdunstet auf der Haut und kühlt den Körper.",
      beschwerden: "Manche Menschen schwitzen übermäßig, vor allem an Händen, Füßen und Achseln. Dagegen helfen spezielle Deos, Leitungswasser-Bäder oder Spritzen mit Botulinumtoxin." },
    { id: "haarfollikel", name: "Haar und Haarwurzel", latein: "Pilus und Folliculus pili", farbe: "#8A5A3C", rand: "#4E2F1B",
      formen: [strich([[160, 196], [170, 150], [178, 100], [186, 64]], 9), ellipse([158, 200], 9, 10), strich([[186, 64], [196, 30], [208, 8]], 3.4)],
      was: "Jedes Haar wächst aus einer Haarwurzel in der Lederhaut. Ein kleiner Muskel kann es aufrichten; so entsteht die Gänsehaut.",
      beschwerden: "Entzündet sich die Haarwurzel, entsteht ein schmerzhafter Pickel oder Furunkel. Haarausfall hat viele Ursachen, von der Veranlagung bis zu Hormonen und Eisenmangel." },
    { id: "talgdruese", name: "Talgdrüse", latein: "Glandula sebacea", farbe: "#F2D98A", rand: "#A8893A",
      formen: [flaeche([[184, 118], [200, 112], [212, 124], [208, 142], [192, 146], [182, 134]], 0.7)],
      was: "Talgdrüsen münden in die Haarwurzel. Ihr Fett hält Haut und Haare geschmeidig und schützt vor dem Austrocknen.",
      beschwerden: "Bei Akne bilden die Drüsen zu viel Talg und die Ausgänge verstopfen: Es entstehen Mitesser und entzündete Pickel. Das ist gut behandelbar." },
    { id: "oberhaut", name: "Oberhaut", latein: "Epidermis", farbe: "#EFB39A", rand: "#A86A52",
      formen: [flaeche([[20, 62], [400, 62], ...wellig(92, 5).reverse()], 0.5)],
      was: "Die Oberhaut ist die äußere Schutzschicht. Sie erneuert sich etwa alle vier Wochen vollständig: Neue Zellen wandern von unten nach oben.",
      beschwerden: "Bei Schuppenflechte erneuert sie sich viel zu schnell, bei Neurodermitis ist ihre Schutzfunktion gestört: Die Haut wird trocken, rot und juckt." },
    { id: "pigmentzellen", name: "Pigmentzellen", latein: "Melanozyten", farbe: "#6B4226", rand: "#3D230F",
      formen: [48, 108, 168, 228, 268, 328, 388].map((x) => ellipse([x, 88], 4, 3)),
      was: "Pigmentzellen in der untersten Lage der Oberhaut bilden den Farbstoff Melanin. Er bräunt die Haut und schützt das Erbgut der Zellen vor UV-Strahlung.",
      beschwerden: "Zu viel Sonne schädigt die Pigmentzellen. Aus ihnen kann schwarzer Hautkrebs (Melanom) entstehen. Sonnenschutz ist die wichtigste Vorbeugung." },
    { id: "hornschicht", name: "Hornschicht", latein: "Stratum corneum", farbe: "#F5D9C4", rand: "#B58E74",
      formen: [flaeche([[20, 52], [400, 52], [400, 62], [20, 62]], 0.1)],
      was: "Die Hornschicht besteht aus abgestorbenen, verhornten Zellen. Sie ist die eigentliche Barriere gegen Wasser, Keime und Reizstoffe.",
      beschwerden: "Häufiges Waschen und Kälte trocknen sie aus: Die Haut spannt, schuppt und reißt ein. An belasteten Stellen wird sie dicker (Hornhaut, Schwielen)." },
    { id: "muttermal", name: "Muttermal", latein: "Naevus", farbe: "#7A4A2A", rand: "#40220F",
      formen: [flaeche([[322, 54], [330, 44], [346, 42], [358, 50], [362, 62], [320, 62]], 0.6)],
      was: "Ein Muttermal ist eine gutartige Ansammlung von Pigmentzellen. Fast jeder Mensch hat mehrere davon.",
      beschwerden: "Verändert sich ein Muttermal in Form, Farbe oder Größe, juckt oder blutet es, sollte es angesehen werden. Ab 35 zahlt die Kasse alle zwei Jahre das Hautkrebs-Screening." },
  ],
};

export const SCHNITTMODELLE: Record<SchnittId, SchnittModell> = { auge: AUGE, ohr: OHR, haut: HAUT };
export const schnittTeil = (modell: SchnittId, id: string) => SCHNITTMODELLE[modell]?.teile.find((t) => t.id === id) ?? null;
