# Anbindung an die Praxissoftware (VDDS-media und GDT)

Sorrida öffnet sich als eigenes Fenster aus der Praxissoftware (PVS) heraus –
mit dem dort gewählten Patienten und den Reitern **Neuer Bericht**,
**Neuer Vorschlag** und **Verlauf**. Grundlage ist der Branchenstandard
**VDDS-media 1.4** des Verbands Deutscher Dental-Software-Unternehmen, über
den PVS seit Jahren Bild- und Multimediaprogramme anbinden.

## Welche Praxissoftware?

KZBV-Abrechnungsstatistik 2024 (KCH, laut Sekundärquellen):

| PVS | Anteil | VDDS-media |
| --- | --- | --- |
| DS-Win (Dampsoft) | ca. 35 % | ja, Einrichtung über VDDS-Schaltfläche in der Titelzeile (Dampsoft-Doku) |
| CGM Z1 / Z1.PRO | ca. 24 % | ja (u. a. Medit-Integration über VDDS) |
| charly (solutio) | ca. 10 % | VDDS-Standard, Menüpfad beim Hersteller erfragen |
| EVIDENT | ca. 7 % | ja, Modul „Schnittstellen VDDS“ |

Damit sind rund drei Viertel der Praxen über einen einzigen Mechanismus
erreichbar. Menüpfade außer bei DS-Win sind nicht aus Herstellerunterlagen
belegt und stehen deshalb bewusst allgemein in der App
(`lib/pvsGuides.ts`).

## Ablauf

```
PVS ──(Übergabedatei .ini, Tabelle 3)──▶ SorridaConnector.exe
                                          │ POST /api/connector/launch
                                          │ Authorization: Bearer sor_conn_…
                                          │ Body: [PATIENT] mit 11 erlaubten Feldern
                                          ▼
                                   Sorrida-Server: Patient anlegen/aktualisieren
                                   (eindeutig je Praxis + PVS + PATID),
                                   Einmal-Token (5 min) erzeugen
                                          │ { url: /embed/launch?t=… }
                                          ▼
                     Edge im App-Modus (eigenes Fenster) ─▶ /embed/patient/[id]
                                          │
SorridaConnector schreibt ERRORLEVEL, ERRORTEXT und zuletzt READY=1 in die Übergabedatei
```

- **Datensparsam:** Der Connector schickt nur PVS, PATID, PATSHOWNR,
  LASTNAME, FIRSTNAME, TITLE, BIRTHDAY, SEX, INSURANCESTATUS, INSURANCE,
  INFO. Adresse, Telefon, E-Mail und Versichertennummer verlassen den PC
  nicht; der Server verwirft sie zusätzlich (`lib/connector.ts`).
- **Keine Patientendaten in URLs:** Das Fenster lädt über ein kurzlebiges
  Einmal-Token, das nur ein angemeldeter Nutzer derselben Praxis einlösen
  kann.
- **Connector-Schlüssel** je PC, nur als Hash gespeichert, widerrufbar
  (Einstellungen → Praxissoftware). Ein Schlüssel kann Patienten
  anlegen/aktualisieren und Start-Tokens erzeugen, aber nichts lesen.
- **INFO=1** (Infomodus) aktualisiert nur Stammdaten, ohne Fenster.
- **Zeichensatz:** gültiges UTF-8 wird erkannt, sonst Windows-Standard
  (ANSI), wie in der Spezifikation vorgesehen.

## Installation auf einem Praxis-PC

1. In Sorrida unter **Einstellungen → Praxissoftware** einen Schlüssel für den
   PC erzeugen und den angezeigten Befehl kopieren.
2. `SorridaConnector.cs` und `install.ps1` (aus `public/connector/`, in der
   App zum Download) in einen Ordner legen.
3. PowerShell **als Administrator** öffnen und den Befehl ausführen. Das
   Skript übersetzt den Connector mit dem in Windows enthaltenen
   .NET-Framework-Compiler (`csc.exe`), schreibt
   `%ProgramData%\Sorrida\connector.ini` und registriert Sorrida in
   `%WINDIR%\VDDS_MMI.INI` (`[BVS] NAMEn=SORRIDA`, Sektion `[SORRIDA]` mit
   `PATDATIMPORT`, `VERSION=1.4`, `STAGES=1`, `SUPPORTINFO=1`).
4. In der PVS unter den VDDS-Einstellungen „Sorrida (Bericht & Vorschlag)“
   aktivieren.

Entfernen: `uninstall.ps1` als Administrator.

## Arztpraxen (GDT 2.1 / 3.0)

- Die Praxissoftware schreibt eine GDT-Anforderung (6301/6302) und startet
  `SorridaConnector.exe` (mit Pfad oder über `GDTFILE`).
- Zeichensatz nach Feld 9206 (1 = DIN 66003, 2 = CP437, 3 = ISO 8859-1,
  4 = ISO 8859-15); fehlt 9206, wird zwischen UTF-8, CP437 und Windows-1252
  anhand der Umlaute unterschieden.
- Weitergegeben werden nur 8000, 8315, 8316, 9206, 9218, 3000, 3101, 3102,
  3103, 3110. Geschlecht als 1/2 (GDT 2.1) oder M/W/D/X (GDT 3.0).
- Die Anforderungsdatei wird nach dem Lesen gelöscht (GDT-Regel); Dateien
  älter als 5 Minuten (`MAXALTER`) werden abgelehnt. So öffnet eine alte Datei
  nie einen falschen Patienten.
- **Rückweg:** Mit `GDTIMPORT` holt der Connector freigegebene Berichte und
  angenommene Vorschläge (`GET /api/connector/ergebnisse`), legt sie als
  6310-Datei in den Importordner (erst `.tmp`, dann umbenannt) und bestätigt
  sie (`POST`). Jede Datei wird genau einmal geliefert (`GdtAuslieferung`,
  Reservierung 5 Minuten). Eine Windows-Aufgabe ruft `--abholen` alle
  2 Minuten auf. Absender (8316) ist die Kennung, unter der die
  Praxissoftware Sorrida führt (8315 des Aufrufs). Von Hand heruntergeladene
  Dateien zählen als geliefert.

## Eigene Domain im Vorschau-Modus

`/api/connector/*` ist vom Vorschau-Schloss ausgenommen (eigene Anmeldung
mit Praxis-Schlüssel). Die Start-Adresse trägt einen signierten,
10 Minuten gültigen Passierschein (`vp`), den die Middleware gegen das
Vorschau-Cookie tauscht.

## Zahnarztpraxen: Rückweg

VDDS-media sieht keinen Textrückweg in die Karteikarte vor. Mit `ABLAGE`
(`install.ps1 -Ablage`) legt der Connector freigegebene Berichte als PDF in
einen Ordner, Dateiname `Patientennummer_Name_Datum_Bericht_….pdf`, genau
einmal je Bericht (gleiches Verfahren wie bei GDT, Art `bericht-pdf`). Die
Praxis bindet den Ordner in ihre Dokumentenablage ein. Ob die jeweilige
Praxissoftware Dateien automatisch nach Patientennummer zuordnet, ist
herstellerabhängig.

## Diagnose

- `SorridaConnector.exe --test`: Verbindung, Schlüssel, Edge, VDDS-Eintrag,
  GDT-Ordner; läuft am Ende von `install.ps1`.
- Protokoll ohne Patientendaten: `%LOCALAPPDATA%\Sorrida\connector.log`.
- In Sorrida je Schlüssel: zuletzt verbunden, Connector-Version, Rückweg
  aktiv, GDT-Kennung.
- Verständliche Meldungen für Firewall, Proxy (407, `PROXY=`), Zertifikat
  bzw. TLS-prüfende Virenscanner, falsche Adresse (404) und Zeitüberschreitung;
  ein Netzfehler wird einmal wiederholt.

## Getestet auf Windows (GitHub Actions, `.github/workflows/connector-windows.yml`)

Echter Windows-Rechner, echter Sorrida-Server mit Test-Datenbank:
`install.ps1` in Windows PowerShell 5.1 mit dem .NET-4-Compiler →
VDDS_MMI.INI-Eintrag → Windows-Aufgabe → Verbindungstest → Aufruf mit allen
Beispieldateien (VDDS mit Pfad, GDT über `GDTFILE`) → Patienten und Umlaute
in der Datenbank → Start-Adresse mit Passierschein → veraltete Datei
abgelehnt → Rückweg GDT 6310 und PDF-Ablage → nichts doppelt →
`uninstall.ps1` räumt vollständig auf. Läuft bei jeder Änderung am Connector.

Gefunden und behoben dadurch:
- `install.ps1` brach unter Windows PowerShell 5.1 sofort ab (`$PSScriptRoot`
  ist im Parameterblock leer).
- Der .NET-4-Compiler hätte die Meldungen ohne `/codepage:65001` als
  Zeichensalat übersetzt.
- Übergabedateien in UTF-8 mit BOM: Die Windows-Funktion übersah `[PATIENT]`
  und hängte einen zweiten Abschnitt an. Jetzt schreibt der Connector die
  Rückmeldung selbst, mit gleichem Zeichensatz, BOM und gleichen Zeilenenden.
- GDT-Absenderkennung galt je PC statt je Praxissoftware (falsche Kennung,
  wenn eine Praxis zwei Programme nutzt).
- `uninstall.ps1` ließ den VDDS-Eintrag stehen (PowerShell übergibt `$null`
  als leeren Text, daher `[NullString]::Value`) und meldete gesperrte
  Dateien nicht.

## Getestet unter Linux

- `lib/connector.test.ts`, `lib/gdtExport.test.ts`, `lib/vorschau.test.ts`.
- Beispieldateien je Praxissoftware in `lib/__fixtures__/pvs/` (DS-Win
  CP1252, Z1 UTF-8 mit BOM, charly nur LF, EVIDENT Kleinschreibung, INFO=1,
  Medistar CP437, TURBOMED ISO 8859-1, ALBIS ohne 9206, x.isynet GDT 3.0,
  CGM M1 nur LF). Aufbau nach Spezifikation, keine Herstellerdateien.
- Ende-zu-Ende mit dem echten Connector (unter Mono übersetzt, C# 5 wie
  `csc.exe` von .NET 4): alle zehn Dateien → Patienten mit richtigen
  Umlauten → Fenster über die Vorschau-Domain → Anmeldung → Patientenfenster;
  Bericht freigegeben → `--abholen` → gültige 6310-Datei (Zeilenlängen und
  8100 geprüft) → zweiter Abruf liefert nichts doppelt.

**Noch nicht getestet:** der Aufruf aus der Oberfläche der echten
Programme (DS-Win, Z1, charly, EVIDENT, Medistar, TURBOMED, ALBIS usw.) und
das Einlesen der 6310-Datei bzw. der PDF durch die jeweilige
Praxissoftware. Diese Programme sind lizenzpflichtig und lassen sich nicht
automatisiert testen. Alles auf Sorrida-Seite ist auf Windows geprüft.
Vor dem ersten Kunden einmal mit einer Demo-Installation der jeweiligen
Praxissoftware durchspielen.
