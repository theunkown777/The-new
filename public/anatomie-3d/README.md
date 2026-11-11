# 3D-Anatomie: Herkunft und Lizenz

Die Dateien in diesem Ordner (`*.glb`) sind **bearbeitete Fassungen** fremder Daten. Sie werden mit
`scripts/anatomie-3d/bauen.mjs` erzeugt (Teile zusammengefasst, stark vereinfacht, mit meshopt gepackt).

## Quellen

**BodyParts3D 4.0** – © The Database Center for Life Science (DBCLS), https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
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
Namensnennung: „Anatomie: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 JP · Kopf: Lee Perry-Smith, CC BY 3.0“.

## Was bearbeitet wurde (ehrlich)

- Alle Netze stark vereinfacht (meshoptimizer), Koordinaten in Millimetern, y nach oben, z nach vorn.
- Viele Muskeln, Sehnen und Bänder gibt es in BodyParts3D nur rechts; die linke Seite ist **gespiegelt**.
- BodyParts3D 4.0 enthält **keine Lungenoberfläche**. Die Lungenhülle ist aus den echten Bronchien und
  Lungengefäßen **berechnet** (Dichtefeld, Weichzeichnen, Marching Cubes) und im Modell so gekennzeichnet.
- Die Weisheitszähne (18, 28, 38, 48) fehlen in den Daten; sie sind als verkleinerte **Kopie des Nachbarzahns** ergänzt.
- Der Kopf-Scan ist auf den Schädel ausgerichtet (Breite über die Ohren, Mundspalte über den Schneidezähnen).
  Für das Öffnen des Mundes trägt jede Ecke ein Gewicht im Rotkanal der Eckenfarbe.
- Nicht enthalten (fehlen in den freien Daten): Gebärmutter und Eierstöcke, Rückenmark, Nerven von Armen und Beinen,
  Kaumuskel, gerader Bauchmuskel, breiter Rückenmuskel, Steißbein, Schilddrüse, Menisken und Kreuzbänder, Mittel- und Innenohr.

## Neu bauen

```
node scripts/anatomie-3d/bauen.mjs --obj <Ordner mit FJ*.obj> \
  --listen <isa_element_parts.txt>,<partof_element_parts.txt> --kopf <Ordner mit LeePerrySmith.glb und Texturen>
```
Die heruntergeladenen Archive nur als Daten behandeln: in einem eigenen, leeren Ordner entpacken (nur `FJ*.obj`).
