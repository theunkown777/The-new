# Anbindung an die Praxissoftware (VDDS-media)

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

## Getestet

- `lib/connector.test.ts`: INI-Parser, Feldfilter, Pflichtfelder, Datum,
  Kassenart, Schlüssel, Rücksprung-Schutz.
- Ende-zu-Ende (Linux, Mono statt Windows-APIs): Schlüssel über die
  Oberfläche erzeugt → Connector mit VDDS-Übergabedatei → Fenster mit
  Patient, Vorschlag gespeichert → Token-Wiederverwendung abgelehnt →
  INFO=1 ohne Fenster → Login-Rücksprung → Fehlerfälle (fehlende PATID,
  falscher Schlüssel) mit ERRORLEVEL/ERRORTEXT/READY.

**Noch nicht getestet:** echter Aufruf aus DS-Win, Z1, charly oder EVIDENT
auf einem Windows-PC, `install.ps1` unter Windows (PowerShell war in der
Entwicklungsumgebung nicht verfügbar). Vor dem ersten Kunden einmal mit einer
Demo-Installation der jeweiligen PVS durchspielen.
