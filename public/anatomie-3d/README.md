# 3D-Anatomie: Herkunft und Lizenz

Die Dateien in diesem Ordner (`*.glb`) sind **bearbeitete Fassungen** fremder Daten. Sie werden mit
`scripts/anatomie-3d/bauen.mjs` erzeugt (Teile zusammengefasst, stark vereinfacht, mit meshopt gepackt).

## Quellen

**BodyParts3D 4.0** – © The Database Center for Life Science (DBCLS), https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- Verwendet: `isa_BP3D_4.0_obj_99.zip`, `isa_element_parts.txt`, `partof_element_parts.txt` (Stand 2013-05-22)
- Lizenz der Daten laut Dateiköpfen der OBJ-Dateien: **Creative Commons Attribution-Share Alike 2.1 Japan (CC BY-SA 2.1 JP)**.
  Die README der Datenbank nennt seit 25.02.2025 **CC BY 4.0** mit der Namensnennung
  „BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International“.
- Datei: `haut`, `skelett`, `sehnen`, `muskeln`, `lunge`, `herz`, `verdauung`, `harnwege`, `gehirn`, `nerven`, `auge`, `hno`, `mund`

**Kopf „Infinite, 3D Head Scan“ von Lee Perry-Smith** – Creative Commons Attribution 3.0 Unported (CC BY 3.0),
„Based on a work at www.triplegangers.com“, bezogen aus dem three.js-Repository (Tag r170,
`examples/models/gltf/LeePerrySmith/`, Lizenzdatei `LeePerrySmith_License.txt`).
- Datei: `kopf` (Netz, Farbtextur und Normalentextur)

## Lizenz der bearbeiteten Dateien

Die bearbeiteten Dateien in diesem Ordner stehen unter **CC BY-SA 4.0** (Weitergabe unter gleichen
Bedingungen, wie es CC BY-SA 2.1 JP verlangt; mit CC BY 4.0 und CC BY 3.0 vereinbar).
Namensnennung (steht so unter jedem Modell und auf der Seite `/lizenzen`): „3D-Anatomie: bearbeitet nach BodyParts3D,
© The Database Center for Life Science, lizenziert unter CC BY-SA 2.1 Japan (aktuelle Fassung der Datenbank: CC Attribution 4.0
International). Kopf: nach „Infinite, 3D Head Scan“ von Lee Perry-Smith, CC BY 3.0. Die Modelle sind vereinfacht und ergänzt.
Die bearbeiteten Modelle stehen unter CC BY-SA 4.0.“

## Was bearbeitet wurde (ehrlich)

- Alle Netze stark vereinfacht (meshoptimizer), Koordinaten in Millimetern, y nach oben, z nach vorn.
- Viele Muskeln, Sehnen und Bänder gibt es in BodyParts3D nur rechts; die linke Seite ist **gespiegelt**.
- BodyParts3D 4.0 enthält **keine Lungenoberfläche**. Die Lungenhülle ist aus den echten Bronchien und
  Lungengefäßen **berechnet** (Dichtefeld, Weichzeichnen, Marching Cubes) und im Modell so gekennzeichnet.
- Die Weisheitszähne (18, 28, 38, 48) fehlen in den Daten; sie sind als verkleinerte **Kopie des Nachbarzahns** ergänzt.
- In die Dateien (außer Kopf und Nerven) ist eine **Umgebungsverdeckung** eingebacken: je Ecke ein Wert im Grünkanal
  der Eckenfarbe, berechnet mit Strahlen gegen die eigene Datei (`scripts/anatomie-3d/ao.mjs`). Falten und Zwischenräume
  wirken dadurch dunkler, ohne Rechenaufwand auf dem Gerät. Jede Datei wird dadurch höchstens 15 % größer; bei den leichten
  Fassungen bleibt die Verdeckung nur, wo das auch gilt (`leicht.mjs`).
- **Gebiss** (`mund.glb`, `mund-leicht.glb`) hat einen eigenen Bau (`scripts/anatomie-3d/mund.mjs`, mit `glatt.mjs`,
  `fest.mjs` und `strahlen.mjs`); beide Fassungen entstehen direkt beim Bauen:
  - Zähne, Zahnfleisch und Zunge sind mit Loop-Unterteilung **geglättet** und erst danach vereinfacht.
  - **Zahnfleischrand** (`saum.mjs`): In den Daten verläuft der Rand gerade. Er ist je Zahn zu einem Bogen um den Zahnhals
    umgeformt, zwischen den Zähnen steht eine Papille. Über den Wurzeln wölbt sich das Zahnfleisch leicht nach außen
    (über dem Eckzahn am stärksten). Höhen und Breiten sind Lehrbuchwerte, **nicht gemessen**.
  - **Beide Kiefer sind neu gebildet** (`fest.mjs`): Die Knochen sind in einem Raster von 0,5 mm vereinigt, die Zahnwurzeln
    eingeschlossen und kleine Spalten geschlossen. Die Oberfläche ist eine geschlossene, glatte Fläche (Surface Nets).
    Der Oberkiefer ist über den Wurzeln abgeschnitten. Der Schnitt fällt zur Seite und hinten ab (keine Flügel, keine Kerbe)
    und ist oben geschlossen und gerundet. Am Zahnfleisch endet der Knochen knapp unter dessen Rand.
    Die Form folgt den Daten, ist aber an diesen Stellen **nicht mehr genau** die von BodyParts3D.
  - Die Gaumenmuskeln sind auf Nasenboden bis Mundhöhe gekürzt (keine rosa Formen in der Nase oder im Rachen).
    Schläfen- und Jochbein sowie der zweibäuchige Muskel (Mundboden) sind weggelassen.
    Der Kurzcheck zeigt Mundboden, Speicheldrüsen und Zungenbein nicht (nur Zähne, Kiefer, Zahnfleisch, Zunge, Gaumen).
  - Die Zunge öffnet mit 90 % der Bewegung des Unterkiefers (mit mehr Abstand hob sie sich vom Mundboden ab).
  - Größen (Dreiecke volle / leichte Fassung): Oberkiefer 11 000 / 5 500, Unterkiefer 9 000 / 4 500, Zahnfleisch je Kiefer
    9 000 / 4 000, Zunge 3 600 / 2 000, Zähne halb bzw. ein Viertel der geglätteten Netze. Zusammen etwa 143 000 / 71 000
    Dreiecke, 588 KB / 314 KB.
  - Verdeckung: Strahlen bis 6 mm, 32 je Ecke; Schatten werfen Zähne, Zahnfleisch, Kiefer und Zunge.
  - Eckenfarbe: Grün = Verdeckung. Zähne: Rot = Wurzel (von Knochen oder Zahnfleisch bedeckt), Blau = Schneidekante der
    Frontzähne. Zahnfleisch: Rot = Nähe zum freien Rand, Blau über 0,5 = feste Gingiva, darunter bewegliche Schleimhaut.
    Zunge: Blau = Mittelfurche. Die Bühne färbt damit Schmelz, Zahnhals, Saum, Gingiva und Zunge.
- Der Kopf-Scan ist auf den Schädel ausgerichtet (Breite über die Ohren, Mundspalte über den Schneidezähnen).
  Für das Öffnen des Mundes trägt jede Ecke ein Gewicht im Rotkanal der Eckenfarbe.
- Nicht enthalten (fehlen in den freien Daten): Gebärmutter und Eierstöcke, Rückenmark, Nerven von Armen und Beinen,
  Kaumuskel, gerader Bauchmuskel, breiter Rückenmuskel, Steißbein, Schilddrüse, Menisken und Kreuzbänder, Mittel- und Innenohr.

## Neu bauen

```
node scripts/anatomie-3d/bauen.mjs --obj <Ordner mit FJ*.obj> \
  --listen <isa_element_parts.txt>,<partof_element_parts.txt> --kopf <Ordner mit LeePerrySmith.glb und Texturen>
```
Danach: `node scripts/anatomie-3d/ao.mjs` (Umgebungsverdeckung) und `node scripts/anatomie-3d/leicht.mjs` (leichte Fassungen).
Das Gebiss braucht beides nicht (Verdeckung und leichte Fassung entstehen schon beim Bauen); nur das Gebiss neu bauen:
`node scripts/anatomie-3d/bauen.mjs --obj <Ordner> --listen <isa_element_parts.txt> --nur mund`.
Die heruntergeladenen Archive nur als Daten behandeln: in einem eigenen, leeren Ordner entpacken (nur `FJ*.obj`).
