// Teile des Mundes im räumlichen Gebiss (echte Daten aus BodyParts3D): Was ist das und wozu dient es?
// Kennung „mund:…“; Zähne behalten ihre FDI-Nummer.

export interface MundTeil { id: string; name: string; was: string }

export const MUND_TEILE: MundTeil[] = [
  { id: "mund:oberkiefer", name: "Oberkiefer und harter Gaumen", was: "Der Oberkiefer trägt die oberen Zähne und bildet mit dem Gaumenbein den harten Gaumen, das Dach der Mundhöhle. Er ist fest mit dem Schädel verbunden und bewegt sich beim Kauen nicht." },
  { id: "mund:unterkiefer", name: "Unterkiefer", was: "Der Unterkiefer ist der einzige bewegliche Knochen des Schädels. Er trägt die unteren Zähne und öffnet und schließt den Mund über die beiden Kiefergelenke vor den Ohren." },
  { id: "mund:zahnfleisch", name: "Zahnfleisch", was: "Das Zahnfleisch umschließt die Zahnhälse und schützt den Kieferknochen. Gesundes Zahnfleisch ist blassrosa und blutet beim Putzen nicht." },
  { id: "mund:zunge", name: "Zunge", was: "Die Zunge ist ein kräftiger Muskel. Sie schmeckt, schiebt die Nahrung beim Kauen zwischen die Zähne, formt den Bissen und hilft beim Sprechen und Schlucken." },
  { id: "mund:gaumen", name: "Weicher Gaumen", was: "Der weiche Gaumen schließt hinten an den harten Gaumen an. Seine Muskeln heben ihn beim Schlucken an, damit keine Nahrung in die Nase gelangt." },
  { id: "mund:zaepfchen", name: "Zäpfchen", was: "Das Zäpfchen hängt in der Mitte am Ende des weichen Gaumens. Es hilft beim Schlucken und beim Sprechen." },
  { id: "mund:mundboden", name: "Mundboden und Zungenmuskeln", was: "Mehrere Muskeln spannen sich zwischen Unterkiefer und Zungenbein und bilden den Mundboden. Sie tragen die Zunge, helfen beim Öffnen des Mundes und beim Schlucken." },
  { id: "mund:speicheldruesen", name: "Speicheldrüsen", was: "Unter der Zunge und am Unterkiefer liegen Speicheldrüsen. Speichel spült die Zähne, schützt den Zahnschmelz und macht die Nahrung gleitfähig." },
  { id: "mund:zungenbein", name: "Zungenbein", was: "Das Zungenbein ist ein kleiner, hufeisenförmiger Knochen am Hals. An ihm setzen die Muskeln von Zunge und Mundboden an." },
  { id: "mund:kiefergelenk", name: "Kiefergelenk", was: "Das Kiefergelenk liegt direkt vor dem Ohr. Hier dreht und gleitet der Unterkiefer beim Öffnen des Mundes. Beschwerden zeigen sich als Knacken, Schmerz vor dem Ohr oder eingeschränkte Mundöffnung." },
  { id: "mund:gesicht", name: "Gesicht und Lippen", was: "Lippen und Wangen schließen die Mundhöhle nach außen ab. Beim Öffnen des Mundes gehen Unterlippe und Kinn mit dem Unterkiefer mit." },
];

export const mundTeil = (id: string) => MUND_TEILE.find((t) => t.id === id) ?? null;

/** Hinweis zu Teilen, die in den freien 3D-Daten fehlen. */
export const MUND_HINWEIS = "Zähne, Kiefer, Zunge und Gaumen stammen aus anatomischen Scandaten. Die Weisheitszähne fehlen dort; sie sind als Kopie des Nachbarzahns ergänzt. Der Kaumuskel (Masseter) ist in den freien Daten nicht enthalten.";
