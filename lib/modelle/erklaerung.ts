// Inhalte der Erklärungsansicht: je Thema eine Einleitung und zu jedem beschrifteten Teil
// eine kurze, patientengerechte Erklärung. Die Bildpunkte (wo das Teil im Bild liegt) stehen
// in lib/modelle/erklaerBilder.ts, die Bilder selbst in public/modelle/erklaerung/.

export type ErklaerThema =
  | "auge"
  | "ohr"
  | "lunge"
  | "herz"
  | "muskeln"
  | "mund"
  | "zahn"
  | "haut"
  | "skelett"
  | "verdauung"
  | "niere"
  | "gehirn";

export interface ErklaerTeil {
  /** Name wie er im Bild steht */
  name: string;
  /** Was ist das? */
  was: string;
  /** Wozu dient es? */
  wofuer: string;
  /** Typische Beschwerde oder was Patienten oft fragen (optional) */
  hinweis?: string;
}

export interface ErklaerInhalt {
  titel: string;
  einleitung: string;
  teile: ErklaerTeil[];
}

const T = (name: string, was: string, wofuer: string, hinweis?: string): ErklaerTeil => ({ name, was, wofuer, ...(hinweis ? { hinweis } : {}) });

export const ERKLAERUNG: Record<ErklaerThema, ErklaerInhalt> = {
  auge: {
    titel: "Das Auge",
    einleitung: "Der Augapfel ist etwa so groß wie eine Murmel. Licht fällt vorn durch Hornhaut, Pupille und Linse und wird hinten auf der Netzhaut zu einem Bild. Sechs kleine Muskeln bewegen das Auge in jede Richtung.",
    teile: [
      T("Hornhaut", "Die klare, gewölbte Haut ganz vorn auf dem Auge, wie ein Uhrglas.", "Sie bricht das einfallende Licht am stärksten und schützt das Auge.", "Kratzer oder Entzündungen der Hornhaut schmerzen stark und machen lichtempfindlich."),
      T("Regenbogenhaut", "Der farbige Ring um die Pupille (Iris); er gibt dem Auge seine Farbe.", "Wie eine Kamerablende regelt sie, wie viel Licht ins Auge fällt."),
      T("Pupille", "Das schwarze Loch in der Mitte der Regenbogenhaut.", "Durch sie fällt das Licht ins Auge. Bei Helligkeit wird sie klein, im Dunkeln groß.", "Zum Untersuchen des Augenhintergrunds wird sie mit Tropfen erweitert."),
      T("Linse", "Eine klare, elastische Scheibe hinter der Pupille.", "Sie stellt scharf, indem sie ihre Form verändert, für nah und fern.", "Wird die Linse im Alter trüb, spricht man vom Grauen Star; sie kann durch eine Kunstlinse ersetzt werden."),
      T("Lederhaut", "Die feste, weiße Außenhülle des Augapfels.", "Sie gibt dem Auge seine Form und schützt das Innere."),
      T("Netzhaut", "Die lichtempfindliche Schicht innen an der Rückwand des Auges.", "Sie wandelt Licht in Nervensignale um, die ans Gehirn gehen.", "Bei Diabetes oder hohem Blutdruck wird sie regelmäßig kontrolliert."),
      T("Sehnerv", "Ein dickes Nervenbündel hinten am Auge.", "Er leitet das Bild von der Netzhaut zum Gehirn.", "Beim Grünen Star (Glaukom) wird er durch zu hohen Augendruck langsam geschädigt."),
      T("oberer gerader Augenmuskel", "Muskel oben am Augapfel.", "Hebt den Blick nach oben."),
      T("unterer gerader Augenmuskel", "Muskel unten am Augapfel.", "Senkt den Blick nach unten."),
      T("äußerer gerader Augenmuskel", "Muskel an der Schläfenseite des Auges.", "Dreht das Auge nach außen."),
      T("innerer gerader Augenmuskel", "Muskel an der Nasenseite des Auges.", "Dreht das Auge zur Nase hin, zum Beispiel beim Lesen."),
      T("oberer schräger Augenmuskel", "Muskel, der über eine kleine Rolle schräg am Auge ansetzt.", "Dreht und senkt das Auge."),
      T("unterer schräger Augenmuskel", "Muskel schräg unten am Auge.", "Dreht und hebt das Auge."),
      T("Lidheber", "Ein Muskel im oberen Augenlid.", "Hebt das Oberlid und hält das Auge offen.", "Erschlafft er im Alter, hängt das Lid (Ptosis); das kann die Sicht einschränken."),
    ],
  },
  ohr: {
    titel: "Das Ohr",
    einleitung: "Das Ohr hat drei Teile: Das Außenohr fängt den Schall auf, das Mittelohr verstärkt ihn mit drei winzigen Knöchelchen, und im Innenohr wird er zu Nervensignalen. Im Innenohr sitzt außerdem das Gleichgewichtsorgan.",
    teile: [
      T("Ohrmuschel", "Der sichtbare Teil des Ohrs aus Knorpel und Haut.", "Sie fängt den Schall auf und hilft zu hören, aus welcher Richtung er kommt."),
      T("Gehörgang", "Der etwa 2,5 cm lange Kanal bis zum Trommelfell.", "Er leitet den Schall nach innen; Ohrenschmalz hält ihn sauber.", "Wattestäbchen schieben Ohrenschmalz eher nach innen; ein Pfropf kann in der Praxis entfernt werden."),
      T("Trommelfell", "Ein dünnes Häutchen am Ende des Gehörgangs.", "Es schwingt mit dem Schall und gibt die Schwingung an die Gehörknöchelchen weiter.", "Bei einer Mittelohrentzündung kann es sich vorwölben oder einreißen; meist heilt es von selbst."),
      T("Hammer", "Das erste der drei Gehörknöchelchen, mit dem Trommelfell verbunden.", "Überträgt die Schwingung vom Trommelfell weiter."),
      T("Amboss", "Das mittlere Gehörknöchelchen.", "Verbindet Hammer und Steigbügel und verstärkt die Schwingung."),
      T("Steigbügel", "Das kleinste Knöchelchen des Körpers.", "Drückt die Schwingung ins Innenohr."),
      T("Hörschnecke", "Ein schneckenförmiges, mit Flüssigkeit gefülltes Organ im Innenohr.", "Feine Haarzellen wandeln hier Schall in Nervensignale um, für jede Tonhöhe an einer anderen Stelle.", "Lärm und Alter schädigen diese Haarzellen; daraus entsteht die häufigste Form der Schwerhörigkeit."),
      T("Bogengänge", "Drei kleine, mit Flüssigkeit gefüllte Ringe im Innenohr.", "Sie sind Teil des Gleichgewichtsorgans und merken jede Drehung des Kopfes.", "Lose Kristalle in den Bogengängen verursachen den gutartigen Lagerungsschwindel."),
      T("Hörnerv", "Der Nerv vom Innenohr zum Gehirn.", "Er leitet Hör- und Gleichgewichtssignale weiter."),
      T("Ohrtrompete", "Ein schmaler Gang vom Mittelohr in den Rachen (Eustachische Röhre).", "Sie gleicht den Luftdruck aus, zum Beispiel beim Schlucken im Flugzeug.", "Ist sie bei Schnupfen verschwollen, fühlt sich das Ohr dumpf an."),
      T("Paukenhöhle", "Der luftgefüllte Raum hinter dem Trommelfell, das Mittelohr.", "Hier sitzen die drei Gehörknöchelchen.", "Sammelt sich hier bei Erkältung Flüssigkeit, hört man dumpf; bei Kindern ist das häufig."),
    ],
  },
  lunge: {
    titel: "Die Lunge",
    einleitung: "Über Kehlkopf und Luftröhre gelangt die Luft in die Bronchien, die sich wie ein umgedrehter Baum immer feiner verzweigen. In Millionen winziger Lungenbläschen geht Sauerstoff ins Blut über. Die rechte Lunge hat drei Lappen, die linke nur zwei, weil dort das Herz Platz braucht.",
    teile: [
      T("Kehlkopf", "Der Übergang vom Rachen zur Luftröhre, mit den Stimmbändern.", "Er bildet die Stimme und verschließt beim Schlucken die Luftröhre."),
      T("Luftröhre", "Ein etwa 12 cm langes Rohr, das von Knorpelspangen offen gehalten wird.", "Sie leitet die Atemluft zu den Lungen; feine Flimmerhärchen transportieren Schleim nach oben."),
      T("Hauptbronchus rechts", "Der rechte der beiden großen Äste der Luftröhre.", "Er führt die Luft in die rechte Lunge. Er verläuft steiler; Fremdkörper landen deshalb öfter rechts."),
      T("Hauptbronchus links", "Der linke große Ast der Luftröhre.", "Er führt die Luft in die linke Lunge."),
      T("Bronchien", "Die immer feineren Verzweigungen der Atemwege.", "Sie verteilen die Luft in alle Bereiche der Lunge.", "Bei Asthma und COPD verengen sie sich; Sprays sollen sie weit stellen oder die Entzündung bremsen."),
      T("Bronchiolen", "Die feinsten Atemwege, dünner als ein Millimeter.", "Sie enden in den Lungenbläschen, wo der Gasaustausch stattfindet."),
      T("Oberlappen", "Der obere Abschnitt eines Lungenflügels.", "Teil der Atemfläche; jeder Lappen hat seine eigene Bronchie und Blutversorgung."),
      T("Mittellappen", "Der mittlere Lappen, nur in der rechten Lunge.", "Teil der Atemfläche der rechten Lunge."),
      T("Unterlappen", "Der untere, größte Abschnitt eines Lungenflügels.", "Hier wird beim tiefen Einatmen am meisten Luft ausgetauscht."),
      T("Herzbucht", "Eine Einbuchtung an der linken Lunge.", "Hier liegt das Herz an der Lunge an."),
      T("Zwerchfell", "Der große, kuppelförmige Atemmuskel unter der Lunge.", "Zieht es sich zusammen, dehnt sich die Lunge und Luft strömt ein."),
    ],
  },
  herz: {
    titel: "Das Herz",
    einleitung: "Das Herz ist ein Hohlmuskel etwa so groß wie eine Faust. Die rechte Seite pumpt sauerstoffarmes Blut in die Lunge, die linke Seite pumpt das sauerstoffreiche Blut in den ganzen Körper. Vier Klappen sorgen dafür, dass das Blut nur in eine Richtung fließt.",
    teile: [
      T("rechter Vorhof", "Die obere rechte Kammer des Herzens.", "Sie nimmt das verbrauchte Blut aus dem Körper auf.", "Hier sitzt der natürliche Taktgeber des Herzens (Sinusknoten)."),
      T("rechte Kammer", "Die untere rechte Herzkammer.", "Sie pumpt das Blut in die Lunge, damit es Sauerstoff aufnimmt."),
      T("linker Vorhof", "Die obere linke Kammer.", "Sie nimmt das frische, sauerstoffreiche Blut aus der Lunge auf.", "Beim Vorhofflimmern schlägt er unregelmäßig; dagegen helfen Medikamente oder eine Verödung."),
      T("linke Kammer", "Die kräftigste Herzkammer mit der dicksten Wand.", "Sie pumpt das Blut mit hohem Druck in den ganzen Körper.", "Bei Bluthochdruck muss sie dauerhaft mehr leisten und verdickt sich."),
      T("Trikuspidalklappe", "Die Klappe zwischen rechtem Vorhof und rechter Kammer, mit drei Segeln.", "Sie verhindert, dass Blut zurück in den Vorhof fließt."),
      T("Mitralklappe", "Die Klappe zwischen linkem Vorhof und linker Kammer, mit zwei Segeln.", "Sie schließt, wenn die linke Kammer pumpt.", "Schließt sie nicht dicht, hört man beim Abhören ein Geräusch."),
      T("Aortenklappe", "Die Klappe am Ausgang der linken Kammer.", "Sie lässt das Blut in die Hauptschlagader und verhindert den Rückfluss.", "Im Alter kann sie verkalken und eng werden; sie lässt sich ersetzen, oft per Katheter."),
      T("Pulmonalklappe", "Die Klappe am Ausgang der rechten Kammer.", "Sie lässt das Blut in die Lungenarterie."),
      T("Aorta", "Die Hauptschlagader, das größte Blutgefäß des Körpers.", "Sie verteilt das sauerstoffreiche Blut in den ganzen Körper."),
      T("obere Hohlvene", "Eine große Vene, die von oben ins Herz mündet.", "Sie bringt das Blut aus Kopf und Armen zurück zum Herzen."),
      T("untere Hohlvene", "Eine große Vene, die von unten ins Herz mündet.", "Sie bringt das Blut aus Bauch und Beinen zurück zum Herzen."),
      T("Lungenarterie", "Das Gefäß von der rechten Kammer zur Lunge.", "Sie führt sauerstoffarmes Blut zur Lunge, obwohl sie eine Arterie ist."),
      T("Lungenvenen", "Vier Gefäße von der Lunge zum linken Vorhof.", "Sie bringen das frische, sauerstoffreiche Blut zum Herzen."),
      T("Herzscheidewand", "Die Wand zwischen rechter und linker Herzhälfte.", "Sie trennt sauerstoffarmes und sauerstoffreiches Blut."),
      T("Herzkranzgefäße", "Kleine Arterien auf der Oberfläche des Herzens.", "Sie versorgen den Herzmuskel selbst mit Blut.", "Verengen sie sich, entsteht Brustenge (Angina pectoris); ein Verschluss führt zum Herzinfarkt."),
      T("Herzspitze", "Die untere Spitze des Herzens, sie zeigt nach links unten.", "Hier spürt man den Herzschlag an der Brustwand am deutlichsten."),
    ],
  },
  muskeln: {
    titel: "Die Muskeln",
    einleitung: "Über 650 Muskeln bewegen den Körper. Sie ziehen sich zusammen und ziehen über Sehnen an den Knochen. Muskeln arbeiten meist paarweise: Der eine beugt, der andere streckt.",
    teile: [
      T("Kopfwender", "Ein langer Muskel seitlich am Hals.", "Dreht und neigt den Kopf.", "Verspannt er sich, entstehen Nackenschmerzen und manchmal Kopfschmerzen."),
      T("Kapuzenmuskel", "Ein großer, flacher Muskel von Nacken bis Schulterblatt.", "Hebt die Schultern und hält die Schulterblätter.", "Typischer Ort für Verspannungen bei Bildschirmarbeit."),
      T("Deltamuskel", "Der Muskel, der die Schulter rund umhüllt.", "Hebt den Arm zur Seite, nach vorn und nach hinten."),
      T("großer Brustmuskel", "Der große, fächerförmige Muskel der Brust.", "Zieht den Arm zum Körper und nach vorn."),
      T("Bizeps", "Der zweiköpfige Muskel vorn am Oberarm.", "Beugt den Ellenbogen und dreht die Hand nach oben."),
      T("Trizeps", "Der Muskel hinten am Oberarm.", "Streckt den Ellenbogen."),
      T("Unterarmmuskeln", "Viele schlanke Muskeln am Unterarm.", "Bewegen Handgelenk und Finger.", "Überlastung führt zum Tennis- oder Golferarm."),
      T("gerader Bauchmuskel", "Der Muskel vorn am Bauch, durch Sehnen in Felder geteilt (Sixpack).", "Beugt den Rumpf und stützt die Bauchorgane."),
      T("schräger Bauchmuskel", "Muskeln seitlich am Bauch, schräg verlaufend.", "Drehen den Rumpf und stabilisieren den Rücken."),
      T("Schneidermuskel", "Der längste Muskel des Körpers, schräg über den Oberschenkel.", "Beugt Hüfte und Knie, zum Beispiel im Schneidersitz."),
      T("Oberschenkelmuskel (Quadrizeps)", "Der kräftige, vierteilige Muskel vorn am Oberschenkel.", "Streckt das Knie, wichtig für Treppen und Aufstehen.", "Nach Knieverletzungen wird er gezielt trainiert, weil er das Knie stabilisiert."),
      T("Adduktoren", "Muskeln an der Innenseite des Oberschenkels.", "Ziehen das Bein zur Mitte."),
      T("Schienbeinmuskel", "Muskel vorn neben dem Schienbein.", "Hebt den Fuß an, damit man beim Gehen nicht hängen bleibt."),
      T("Wadenmuskel", "Der kräftige Muskel hinten am Unterschenkel.", "Hebt die Ferse, zum Beispiel beim Gehen und auf Zehenspitzen.", "Seine Sehne ist die Achillessehne."),
      T("Sehnen", "Feste, weiße Stränge aus Bindegewebe.", "Sie verbinden die Muskeln mit den Knochen und übertragen die Kraft.", "Sehnen heilen langsam, weil sie wenig durchblutet sind."),
      T("Stirnmuskel", "Ein flacher Muskel über der Stirn.", "Hebt die Augenbrauen und legt die Stirn in Falten."),
      T("Kniescheibensehne", "Die kräftige Sehne unter der Kniescheibe.", "Überträgt die Kraft des Oberschenkelmuskels auf das Schienbein.", "Bei Sprungsportarten kann sie gereizt sein (Springerknie)."),
    ],
  },
  mund: {
    titel: "Mund und Kiefer",
    einleitung: "Im Mund arbeiten Zähne, Zunge, Kiefer und Kaumuskeln zusammen. Oberkiefer und Unterkiefer tragen je 16 Zähne. Das Kiefergelenk vor dem Ohr erlaubt Öffnen, Schließen und Mahlen.",
    teile: [
      T("Schneidezähne", "Die vier vorderen Zähne oben und unten.", "Sie beißen ab."),
      T("Eckzähne", "Die langen Zähne an der Ecke des Zahnbogens.", "Sie halten und reißen; ihre Wurzel ist die längste im Gebiss."),
      T("Backenzähne", "Die breiten Zähne hinten mit Höckern.", "Sie zermahlen die Nahrung.", "In ihren Furchen entsteht Karies besonders leicht; eine Versiegelung kann schützen."),
      T("Weisheitszahn", "Der hinterste Backenzahn, kommt oft erst als Erwachsener.", "Oft ohne Funktion, weil Platz fehlt.", "Bleibt er im Kiefer stecken, kann er entzünden und wird dann entfernt."),
      T("Zunge", "Ein beweglicher Muskel mit Geschmacksknospen.", "Schmeckt, schiebt die Nahrung zwischen die Zähne und formt Laute."),
      T("Gaumen", "Das Dach der Mundhöhle, vorn hart, hinten weich.", "Trennt Mund und Nase und hilft beim Schlucken."),
      T("Zahnfleisch", "Die rosa Schleimhaut um die Zähne.", "Schützt Zahnhals und Kieferknochen.", "Blutet es beim Putzen, ist es meist entzündet; regelmäßige Pflege und Zahnreinigung helfen."),
      T("Oberkiefer", "Der fest mit dem Schädel verbundene Kieferknochen.", "Trägt die oberen Zähne."),
      T("Unterkiefer", "Der bewegliche Kieferknochen.", "Trägt die unteren Zähne und bewegt sich beim Kauen und Sprechen."),
      T("Kiefergelenk", "Das Gelenk direkt vor dem Ohr.", "Erlaubt Öffnen, Schließen und Seitwärtsbewegen des Unterkiefers.", "Knacken, Schmerzen oder nächtliches Zähneknirschen können es belasten; eine Aufbissschiene entlastet."),
      T("Kaumuskel", "Ein kräftiger Muskel an der Wange.", "Schließt den Kiefer mit großer Kraft."),
      T("Lippen", "Ober- und Unterlippe aus Muskel und dünner Haut.", "Schließen den Mund, formen Laute und tasten fein."),
      T("harter Gaumen", "Der vordere, knöcherne Teil des Gaumens.", "Gegenlager für die Zunge beim Kauen und Sprechen."),
      T("weicher Gaumen", "Der hintere, bewegliche Teil des Gaumens.", "Verschließt beim Schlucken den Weg in die Nase."),
      T("Zäpfchen", "Das kleine Gewebe, das hinten vom weichen Gaumen herabhängt.", "Hilft beim Schlucken und Sprechen.", "Ist es lang oder schlaff, kann es Schnarchen verstärken."),
      T("Rachen", "Der Raum hinter Mund und Nase.", "Hier kreuzen sich Atem- und Speiseweg."),
      T("Gaumenmandel", "Lymphgewebe links und rechts am Rachen.", "Gehört zur Abwehr gegen Keime aus Mund und Nase.", "Entzündet sie sich häufig, kann eine Entfernung sinnvoll sein."),
    ],
  },
  zahn: {
    titel: "Der Zahn im Schnitt",
    einleitung: "Ein Zahn besteht aus der sichtbaren Krone und der Wurzel im Kieferknochen. Außen schützt der Zahnschmelz, darunter liegt das Zahnbein, und innen der Zahnnerv mit Blutgefäßen.",
    teile: [
      T("Zahnschmelz", "Die äußerste Schicht der Krone, die härteste Substanz des Körpers.", "Schützt den Zahn beim Kauen.", "Säuren aus Zucker greifen ihn an; so entsteht Karies. Fluorid härtet ihn."),
      T("Zahnbein", "Die Hauptmasse des Zahns unter dem Schmelz (Dentin).", "Trägt die Krone; es enthält feine Kanälchen.", "Liegt es frei, wird der Zahn empfindlich auf Kälte."),
      T("Zahnmark", "Das weiche Innere mit Nerv und Blutgefäßen (Pulpa).", "Versorgt den Zahn und meldet Schmerz.", "Ist es entzündet, hilft oft eine Wurzelkanalbehandlung."),
      T("Wurzelkanal", "Der Kanal in der Wurzel, in dem Nerv und Gefäße verlaufen.", "Verbindet das Zahnmark mit dem Kiefer."),
      T("Wurzel", "Der Teil des Zahns im Kieferknochen.", "Verankert den Zahn."),
      T("Zahnhals", "Der Übergang von Krone zu Wurzel am Zahnfleischrand.", "Hier liegt der Schmelz dünn.", "Zieht sich das Zahnfleisch zurück, liegt der Zahnhals frei und wird empfindlich."),
      T("Zahnfleisch", "Die Schleimhaut um den Zahnhals.", "Dichtet den Zahn gegen Bakterien ab."),
      T("Kieferknochen", "Der Knochen, in dem die Wurzeln sitzen.", "Hält die Zähne.", "Bei Parodontitis baut er sich ab; Zähne können dann locker werden."),
      T("Wurzelhaut", "Feine Fasern zwischen Wurzel und Knochen.", "Federn den Kaudruck ab und halten den Zahn."),
      T("Nerv und Blutgefäße", "Feine Nerven und Gefäße, die durch die Wurzelspitze in den Zahn ziehen.", "Versorgen das Zahnmark und melden Schmerz."),
    ],
  },
  haut: {
    titel: "Die Haut",
    einleitung: "Die Haut ist das größte Organ des Körpers. Sie hat drei Schichten: die Oberhaut als Schutzschicht, die Lederhaut mit Gefäßen, Nerven, Haaren und Drüsen, und darunter das Unterhautfettgewebe.",
    teile: [
      T("Oberhaut", "Die äußere, dünne Schicht (Epidermis).", "Schützt vor Keimen, Wasserverlust und UV-Licht; sie erneuert sich etwa alle vier Wochen.", "Hier entstehen die meisten Hautkrebsformen; Veränderungen von Malen sollten untersucht werden."),
      T("Lederhaut", "Die mittlere, feste Schicht aus Bindegewebe (Dermis).", "Gibt der Haut Festigkeit und Elastizität und enthält Gefäße und Nerven."),
      T("Unterhaut", "Die tiefste Schicht aus Fettgewebe (Subkutis).", "Speichert Energie, polstert und hält warm."),
      T("Haar und Haarwurzel", "Das Haar wächst aus einer Einstülpung der Haut (Haarfollikel).", "Schützt und fühlt feinste Berührungen."),
      T("Talgdrüse", "Kleine Drüse am Haar.", "Fettet Haut und Haar.", "Verstopft sie, entstehen Mitesser und Pickel."),
      T("Schweißdrüse", "Knäuelförmige Drüse in der Lederhaut.", "Kühlt den Körper durch Schweiß."),
      T("Blutgefäße", "Feine Arterien und Venen in der Lederhaut.", "Versorgen die Haut und regeln die Körpertemperatur."),
      T("Nervenendigungen", "Sinneskörperchen für Druck, Wärme, Kälte und Schmerz.", "Machen die Haut zum Tastorgan."),
      T("Pigmentzellen", "Zellen in der unteren Oberhaut (Melanozyten).", "Bilden den braunen Farbstoff, der vor UV-Licht schützt.", "Aus ihnen können Muttermale und selten schwarzer Hautkrebs entstehen."),
      T("Schweißpore", "Die winzige Öffnung der Schweißdrüse an der Hautoberfläche.", "Hier tritt der Schweiß aus."),
      T("Lamellenkörperchen", "Zwiebelartig geschichtete Fühler tief in der Haut.", "Spüren Druck und Vibration."),
    ],
  },
  skelett: {
    titel: "Das Skelett",
    einleitung: "Rund 206 Knochen geben dem Körper Halt, schützen die Organe und bilden mit den Gelenken das Gerüst für jede Bewegung. Im Knochenmark entstehen die Blutzellen.",
    teile: [
      T("Schädel", "Die knöcherne Kapsel um das Gehirn und das Gesicht.", "Schützt Gehirn und Sinnesorgane."),
      T("Wirbelsäule", "24 bewegliche Wirbel mit Bandscheiben dazwischen.", "Trägt den Oberkörper und schützt das Rückenmark.", "Bandscheiben können sich vorwölben und auf Nerven drücken (Bandscheibenvorfall)."),
      T("Schlüsselbein", "Der S-förmige Knochen zwischen Brustbein und Schulter.", "Verbindet den Arm mit dem Rumpf.", "Bricht häufig bei Stürzen auf die Schulter."),
      T("Brustkorb", "12 Rippenpaare mit Brustbein.", "Schützt Herz und Lunge und bewegt sich beim Atmen."),
      T("Oberarmknochen", "Der lange Knochen des Oberarms.", "Verbindet Schulter und Ellenbogen."),
      T("Becken", "Ein kräftiger Knochenring.", "Trägt den Rumpf und verbindet ihn mit den Beinen."),
      T("Oberschenkelknochen", "Der längste und stärkste Knochen des Körpers.", "Trägt das Körpergewicht.", "Im Alter bricht er bei Osteoporose oft am Hals (Schenkelhalsbruch)."),
      T("Kniescheibe", "Ein flacher Knochen vor dem Knie.", "Lenkt die Kraft des Oberschenkelmuskels um."),
      T("Schienbein", "Der kräftige vordere Unterschenkelknochen.", "Trägt das Gewicht zum Fuß."),
      T("Wadenbein", "Der dünne äußere Unterschenkelknochen.", "Stabilisiert das Sprunggelenk."),
      T("Hand- und Fußknochen", "Viele kleine Knochen in Hand und Fuß.", "Ermöglichen feine Bewegungen und federn beim Gehen."),
      T("Unterkiefer", "Der bewegliche Knochen des Kiefers.", "Trägt die unteren Zähne; einziger beweglicher Knochen des Schädels."),
      T("Halswirbelsäule", "Die sieben obersten Wirbel.", "Tragen den Kopf und machen ihn beweglich.", "Verspannungen und Verschleiß hier verursachen oft Nacken- und Kopfschmerzen."),
      T("Elle und Speiche", "Die zwei Knochen des Unterarms.", "Ermöglichen, die Hand zu drehen.", "Bei Stürzen auf die Hand bricht oft die Speiche nahe dem Handgelenk."),
      T("Kreuzbein", "Der dreieckige Knochen am unteren Ende der Wirbelsäule.", "Verbindet die Wirbelsäule mit dem Becken."),
    ],
  },
  verdauung: {
    titel: "Die Verdauung",
    einleitung: "Die Nahrung wandert vom Mund über die Speiseröhre in den Magen und dann durch rund sieben Meter Darm. Leber, Gallenblase und Bauchspeicheldrüse liefern Säfte, die die Nahrung zerlegen.",
    teile: [
      T("Speiseröhre", "Ein Muskelschlauch vom Rachen zum Magen.", "Transportiert die Nahrung in Wellen nach unten.", "Steigt Magensäure zurück, entsteht Sodbrennen."),
      T("Magen", "Ein dehnbarer Muskelsack im Oberbauch.", "Durchmischt die Nahrung mit Magensäure und beginnt die Eiweißverdauung."),
      T("Leber", "Das größte innere Organ, rechts im Oberbauch.", "Entgiftet das Blut, bildet Galle und speichert Energie.", "Alkohol, Übergewicht und Viren können sie schädigen; Blutwerte zeigen das früh."),
      T("Gallenblase", "Ein kleiner Beutel unter der Leber.", "Speichert Galle, die Fett verdauen hilft.", "Gallensteine können krampfartige Schmerzen machen."),
      T("Bauchspeicheldrüse", "Eine längliche Drüse hinter dem Magen.", "Bildet Verdauungssäfte und das Hormon Insulin."),
      T("Dünndarm", "Der längste Darmabschnitt, etwa fünf Meter.", "Hier werden die Nährstoffe ins Blut aufgenommen."),
      T("Dickdarm", "Der etwa 1,5 Meter lange Endabschnitt.", "Entzieht dem Stuhl Wasser.", "Die Darmspiegelung zur Vorsorge findet hier Polypen, bevor daraus Krebs wird."),
      T("Blinddarm", "Ein kleiner Anhang am Beginn des Dickdarms.", "Gehört zum Abwehrsystem des Darms.", "Entzündet er sich, schmerzt meist der rechte Unterbauch."),
      T("Mastdarm", "Der letzte Abschnitt des Darms.", "Sammelt den Stuhl bis zur Entleerung."),
      T("Mundhöhle mit Zunge", "Der Beginn des Verdauungswegs.", "Zähne zerkleinern, Speichel beginnt die Verdauung von Stärke."),
      T("Rachen", "Der Raum hinter Mund und Nase.", "Leitet die Nahrung beim Schlucken in die Speiseröhre."),
      T("Milz", "Ein faustgroßes Organ links oben im Bauch.", "Filtert alte Blutzellen aus und gehört zur Abwehr."),
      T("Zwölffingerdarm", "Der erste Abschnitt des Dünndarms direkt hinter dem Magen.", "Hier münden Galle und Bauchspeichel.", "Ein Geschwür hier macht oft Schmerzen im nüchternen Zustand."),
    ],
  },
  niere: {
    titel: "Nieren und Harnwege",
    einleitung: "Die zwei Nieren liegen hinten im Bauchraum links und rechts der Wirbelsäule. Sie filtern täglich rund 180 Liter Blut und bilden daraus etwa 1,5 Liter Urin, der über die Harnleiter in die Blase fließt.",
    teile: [
      T("Niere", "Ein bohnenförmiges Organ, etwa faustgroß.", "Filtert Abfallstoffe aus dem Blut, regelt Wasserhaushalt und Blutdruck.", "Bluthochdruck und Diabetes sind die häufigsten Ursachen für eine schwächer werdende Niere."),
      T("Nierenbecken", "Der Sammelraum innen in der Niere.", "Sammelt den Urin und leitet ihn in den Harnleiter."),
      T("Harnleiter", "Ein dünner Schlauch von jeder Niere zur Blase.", "Transportiert den Urin.", "Bleibt ein Nierenstein hier stecken, entstehen heftige Koliken."),
      T("Harnblase", "Ein dehnbarer Muskelsack im Becken.", "Speichert den Urin."),
      T("Harnröhre", "Der Ausgang der Blase.", "Leitet den Urin nach außen."),
      T("Nebenniere", "Eine kleine Drüse auf jeder Niere.", "Bildet Stresshormone wie Adrenalin und Cortisol."),
      T("Nierenarterie", "Das Blutgefäß von der Bauchschlagader zur Niere.", "Bringt das Blut zum Filtern."),
      T("Nierenrinde", "Die äußere Schicht der Niere.", "Hier sitzen die winzigen Filter (Nierenkörperchen), die das Blut reinigen."),
      T("Nierenmark", "Die innere Schicht mit kegelförmigen Pyramiden.", "Sammelt und konzentriert den Urin."),
    ],
  },
  gehirn: {
    titel: "Das Gehirn",
    einleitung: "Das Gehirn steuert Denken, Fühlen, Bewegung und alle Körperfunktionen. Es besteht aus dem Großhirn mit vier Lappen, dem Kleinhirn und dem Hirnstamm, der in das Rückenmark übergeht.",
    teile: [
      T("Stirnlappen", "Der vordere Teil des Großhirns.", "Plant, entscheidet und steuert Bewegungen und Persönlichkeit."),
      T("Scheitellappen", "Der obere hintere Teil des Großhirns.", "Verarbeitet Berührung und Lage des Körpers im Raum."),
      T("Schläfenlappen", "Der seitliche Teil des Großhirns.", "Hören, Sprache verstehen und Gedächtnis."),
      T("Hinterhauptslappen", "Der hintere Teil des Großhirns.", "Sehen: Hier entstehen die Bilder."),
      T("Kleinhirn", "Der kleinere Teil unter dem Großhirn.", "Koordiniert Bewegungen und Gleichgewicht.", "Ist es gestört, wird der Gang unsicher."),
      T("Hirnstamm", "Die Verbindung zwischen Gehirn und Rückenmark.", "Steuert Atmung, Herzschlag und Schlucken."),
      T("Rückenmark", "Ein Nervenstrang in der Wirbelsäule.", "Leitet Signale zwischen Gehirn und Körper."),
    ],
  },
};

/** Kurzname für Punkte und Knöpfe */
export const THEMA_KURZ: Record<ErklaerThema, string> = {
  auge: "Auge", ohr: "Ohr", lunge: "Lunge", herz: "Herz", muskeln: "Muskeln", mund: "Mund und Kiefer", zahn: "Zahn",
  haut: "Haut", skelett: "Skelett", verdauung: "Verdauung", niere: "Nieren", gehirn: "Gehirn",
};

/** Immer nur das Nötigste: welche Themen eine Fachrichtung am Menschen sieht (erstes = wichtigstes).
 *  Fächer ohne Eintrag sehen alle Themen. */
export const FACH_THEMEN: Record<string, ErklaerThema[]> = {
  zahn: ["mund", "zahn"],
  augen: ["auge"],
  hno: ["ohr", "mund"],
  logo: ["mund", "ohr"],
  kardio: ["herz"],
  pneumo: ["lunge"],
  gastro: ["verdauung"],
  uro: ["niere"],
  neuro: ["gehirn"],
  psych: ["gehirn"],
  haut: ["haut"],
  aesthetik: ["haut", "muskeln"],
  ortho: ["skelett", "muskeln"],
  physio: ["muskeln", "skelett"],
  ergo: ["muskeln", "skelett"],
  podo: ["skelett", "haut"],
  chirurgie: ["haut", "verdauung", "skelett"],
  kinder: ["ohr", "lunge", "haut", "mund"],
  radiologie: ["skelett", "lunge", "gehirn"],
};

export const ALLE_THEMEN: ErklaerThema[] = ["gehirn", "auge", "ohr", "mund", "zahn", "herz", "lunge", "verdauung", "niere", "haut", "muskeln", "skelett"];
export const themenFuerFach = (fach?: string | null): ErklaerThema[] => (fach && FACH_THEMEN[fach]) || ALLE_THEMEN;
