# Gestaltung der App für die Praxis

Dieses Blatt gilt für alles unter `app/(app)` (die App für die Praxis). Website und Patientenseiten haben ihre eigene Gestaltung. Die Farbe Grau ist aber auch auf der Website die warme Tinte: Der Rahmen der öffentlichen Seiten (Journal-Rahmen, Startseite, Anmeldung, 404) trägt die Klasse `website` mit denselben warmen slate-Werten wie die App. Die Patientenseiten bleiben vorerst beim gewohnten Grau.

Ziel: Jede neue Seite sieht aus wie die vorhandenen, ohne dass jemand Farben oder Formen neu erfindet.

## So wirkt es technisch

- Der Rahmen `app/(app)/layout.tsx` trägt die Klasse `praxis-app`. Nur darin gelten die Regeln der App.
- Farben und Rundungen sind Variablen in `app/globals.css`. `tailwind.config.ts` verweist darauf.
- Jede Farbstufe gibt es in drei Rollen:
  - `--slate-500` für Schrift und Symbole (`text-`, `fill-`, `stroke-`)
  - `--slate-fl-500` für Flächen (`bg-`)
  - `--slate-li-500` für Linien (`border-`, `divide-`, `ring-`)
- Außerhalb der App stehen in den Variablen die gewohnten Werte; nur auf der Website (`.website`) ist Grau ebenfalls warm. In der App stehen dort die Werte unten.
- Wer in der App `text-slate-600` schreibt, bekommt deshalb warme Tinte statt kühlem Grau. Nichts muss umbenannt werden.
- `lib/gestaltung.test.ts` prüft die Kontraste aus `app/globals.css`, hell und dunkel. Wer Farbwerte ändert, lässt diesen Test laufen.

## Farben

| Rolle | Wert | Klasse in der App |
|---|---|---|
| Papier (Seite) | `#F5F2EE` | kommt vom Rahmen |
| Dunkleres Papier (Seitenleiste, Füllflächen) | `#ECE5DC` | `bg-slate-100` |
| Karte, Feld | `#FFFFFF` | `card`, `bg-white`, `input` |
| Tinte (Überschrift, wichtiger Text) | `#24201F` | `text-slate-900` |
| Text | `#3F3834` | `text-slate-700` |
| Text, zurückgenommen | `#524A45` | `text-slate-600` |
| Kleiner Text, Platzhalter | `#6B625B` | `text-slate-500` |
| Haarlinie | `#DCD2C6` | `border-slate-200` |
| Starke Linie (Felder, zweite Knöpfe) | `#C4B6A6` | `border-slate-300` |
| Bordeaux (einziger Akzent) | `#5A1D1D` | `btn-primary`, `text-brand-700` |
| Salbei (Kasse, Erledigtes) | `#557350` | `text-salbei-600`, `emerald-*`, `green-*` |

- Bordeaux ist der einzige Akzent: erster Knopf, Links, aktiver Menüpunkt, Fokusring.
- Salbei steht nur für die Kassenleistung und für Erledigtes. `emerald-*` und `green-*` ergeben in der App Salbei.
- Gelb (`amber-*`) und Rot (`red-*`) bleiben Hinweisen und Fehlern vorbehalten.
- Kleiner Text ist `text-slate-500`, nie `text-slate-400`. `slate-400` ist nur für Symbole und Trennzeichen.

## Schrift

- Überschrift der Seite: `<h1 className="font-display text-3xl text-slate-900">` (Cormorant).
- Überschrift eines Abschnitts: `<h2 className="font-semibold text-slate-900">` (Open Sans).
- Text: Open Sans, 15 px, `text-sm` in Karten und Listen.
- Zahlen in Kennzahlen: `tabular-nums`.
- Eine Seite hat genau eine `h1`. Danach folgen `h2`, dann `h3`. Keine Ebene überspringen.

## Abstände

- Raster 4 px, üblich sind 8, 12, 16 und 24 px (`gap-2`, `gap-3`, `gap-4`, `gap-6`).
- Karte: 24 px innen (`card`). Listen in Karten: `card p-0`, die Zeilen bringen `px-5 py-3` mit.
- Zwischen Abschnitten einer Seite: `mb-8` oder `space-y-6`.
- Der Inhalt endet am Handy über der unteren Leiste. Das regelt der Rahmen (`praxis-inhalt`).

## Formen

- Felder und Knöpfe: 6 px Rundung. Karten und Kästen: 10 px. Das ergibt sich aus `rounded-lg`, `rounded-xl` und `rounded-2xl`.
- Runde Formen (`rounded-full`) nur für Zähler, Statuspunkte und Schalter.
- Karten haben eine Haarlinie, keinen Schatten. Schatten nur für das, was schwebt: Dialog, Menü, Suchfeld.
- Klassen: `card`, `btn btn-primary`, `btn btn-secondary`, `input`, `label`.
- Höchstens ein `btn-primary` je Ansicht. Alles Weitere ist `btn-secondary` oder ein Link.
- `select`, Datum, Uhrzeit und mehrzeiliger Text bekommen die Klasse `input`. Den Pfeil am Auswahlfeld zeichnet die App selbst.
- Kästchen und Auswahlpunkte brauchen keine Klasse. Größe bei Bedarf mit `h-4 w-4` oder `h-5 w-5`.

## Bausteine

| Baustein | Datei | Wofür |
|---|---|---|
| Leerer Zustand | `components/Leer.tsx` | Liste ohne Einträge: Symbol, ein Satz, höchstens ein Knopf |
| Hilfe am Ort | `components/Hinweis.tsx` | Erklärtext hinter „?“, beim ersten Besuch offen |
| Haken | `components/Haken.tsx` | Bestätigung nach dem Speichern, zeichnet sich einmal |
| Verlaufslinie | `components/Verlauf.tsx` | Kleine Linie neben einer Kennzahl, 8 bis 12 Abschnitte |
| Vergleich | `lib/analytics.ts` (`veraenderung`, `vergleichSatz`) | „+4 Punkte gegenüber den 30 Tagen davor“ |
| Untere Leiste | `components/UntereLeiste.tsx` | Vier Ziele am Handy und Tablet |
| Führung im Gastzugang | `components/DemoFuehrung.tsx` | Drei Schritte zum Mitklicken, nur in Demo-Praxen; „Rundgang in N Stationen“ (am Handy „Rundgang“) startet den Rundgang. Die Funktion heißt überall „Rundgang“. Beim Laden hält ein unsichtbarer Platzhalter (dieselbe Leiste) den Platz frei, damit nichts verrutscht |
| Rundgang | `components/AppRundgang.tsx`, `components/RundgangKarte.tsx` | Hauptseiten der Reihe nach, Stand in der Adresse (`?rundgang=n`), nach Rechten gefiltert. Texte in `lib/rundgang.ts` |
| Rundgang der Website | `components/start/Rundgang.tsx`, `components/RundgangKarte.tsx` | 8 Stationen auf der Startseite. Am Desktop steht die Karte je Station links oder rechts (`seite` in `lib/rundgang.ts`), neben dem, was die Station beschreibt |
| Mail-Hülle | `lib/email.ts` (`mailHuelle`, `mailKnopf`) | Jede Mail im selben Kleid |
| PDF-Kopf und -Fuß | `lib/pdf.ts` (`pdfKopf`, `pdfFuss`) | Jedes PDF mit gleichem Kopf und Seitenzahl |

## Bewegung

- Kurz und mit Grund: 150 bis 200 ms für Knöpfe, Karten, Hinweise und Dialoge.
- Klassen: `ein-dialog` (Dialog), `ein-schleier` (abgedunkelter Hintergrund), `haken` (Haken), `verlauf-linie` (Verlaufslinie).
- Wer im Gerät „Bewegung reduzieren“ gewählt hat, sieht keine Bewegung. Das regelt eine Stelle in `app/globals.css`.
- Kurven und Dauern stehen als Variablen oben in `app/globals.css` (`--ease-out`, `--ease-in-out`, `--dauer-kurz` und weitere). Keine eigenen Werte an der Stelle.
- Hover gilt nur bei echter Maus (`hoverOnlyWhenSupported` in `tailwind.config.ts`). Am Handy und Tablet bleibt nach einem Tipp keine Hover-Farbe stehen.
- Die Website behält bei „Bewegung reduzieren“ weiches Einblenden und Farbwechsel, nur der Ortswechsel entfällt. Dort gibt es zum Einblenden beim Hineinscrollen die Klassen `j-ein` und `j-staffel` (beschrieben in `app/globals.css`).

## Barrierefreiheit

- Fokus ist überall sichtbar (Bordeaux, 2 px). `focus:outline-none` nur zusammen mit einem eigenen Fokusring.
- Jedes Feld hat eine Beschriftung: `<label htmlFor>` mit `id` am Feld, ein umschließendes `<label>` oder `aria-label`.
- Text hat mindestens 4,5:1 Kontrast. Das gilt auch für Platzhalter und gesperrte Knöpfe.
- Der Sprunglink „Zum Inhalt“ ist das erste Element. Das Ziel ist `<main id="inhalt">`.
- Der aktive Menüpunkt trägt `aria-current="page"`.
- Klickziele sind mindestens 24 px hoch, am Handy 36 px (`ziel`).
- Knöpfe und wichtige Ausgaben bekommen ein `data-testid`.
- Rundgang: Solange eine Karte oder die Einladung unten steht, trägt `<html>` das Merkmal `data-rundgang`, die Höhe der Karte in `--rundgang-hoehe` und den Abstand vom unteren Rand bis zur Oberkante der Karte in `--rundgang-oben`. Belegt die Karte die rechte untere Ecke (Handy, Einladung, Website-Karte rechts), kommt `data-rundgang-ecke` dazu. Fest positionierte Bausteine unten rechts bekommen die Klasse `rundgang-ausweichen`. Dann stehen sie knapp über der Karte, statt sie zu verdecken oder von ihr verdeckt zu werden. So hält es der Knopf „Frag Sorrida“ in App und Website (`components/FragSorrida.tsx`). Steht die Karte links (App am Desktop), bleibt der Knopf unten rechts. Esc beendet den Rundgang überall außer in Eingabefeldern und offenen Dialogen (`aria-modal="true"`).

## Handy (390 px)

- Unten liegt eine feste Leiste: Heute, Patienten, Eingang, Mehr.
- Festgesetzte Elemente am unteren Rand (`fixed bottom-0`, `sticky bottom-0`) rücken von selbst über die Leiste.
- Eingabefelder haben am Handy 16 px Schrift, damit das iPhone nicht hineinzoomt.
- Tabellen bekommen `overflow-x-auto` und eine Mindestbreite.

## Dunkle Ansicht (Beta)

- Schalter unter Einstellungen → Sicherheit. Gespeichert wird nur die ausdrückliche Wahl, im Browser (`localStorage`, Schlüssel `sorrida-ansicht`).
- Die Klasse `dunkel` am `html`-Element setzt andere Werte in dieselben Variablen. Seiten müssen nichts dafür tun.
- Feste Farbwerte in Klammern (`bg-[#F5F2EE]`) folgen der dunklen Ansicht nicht von selbst. Neue Seiten nutzen deshalb die Klassen aus der Tabelle oben.

## So ja

- `text-slate-*`, `bg-slate-*`, `border-slate-*` und `brand-*` statt fester Farbwerte.
- `card` für jeden Kasten mit Inhalt.
- Sätze statt Etiketten: „Rückruf gewünscht: heute anrufen“.
- Kennzahlen mit Vergleich zum Zeitraum davor: nur Zahl und Richtung.
- Leere Listen mit `Leer`, Dauer-Erklärungen mit `Hinweis`.

## So nicht

- Kein kühles Grau als Seitenhintergrund, keine eigenen Schatten an Karten.
- Keine zweite Akzentfarbe. Kein Farbverlauf.
- Kein Rot oder Grün für Geldbeträge. Keine Wertung an Kennzahlen („gut“, „schlecht“).
- Kein `text-slate-400` für Text.
- Keine Bilder, Schriften oder Skripte von fremden Servern. Symbole sind eingebettete SVG.
- Keine Wörter wie „Empfehlung“, „beste“ oder „optimal“ für Leistungen. Vorausgewählt ist die Kassen- bzw. Regelleistung.
- Die 3D-Modelle werden nicht beworben und nicht neu verlinkt.
