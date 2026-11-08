// Einrichtung je Praxissoftware. Marktanteile laut KZBV-Abrechnungsstatistik
// 2024 (KCH, Sekundärquellen). Menüpfade nur dort, wo eine Herstellerquelle
// vorliegt - sonst der allgemeine VDDS-media-Weg, statt Pfade zu raten.
export const PVS_GUIDES = [
  {
    name: "DS-Win (Dampsoft)",
    share: "ca. 35 %",
    steps: [
      "In der Titelzeile von DS-Win auf die VDDS-Schaltfläche klicken. Es öffnet sich „VDDS-Schnittstellen-Einrichtung“.",
      "Häkchen setzen und in der linken Liste „Sorrida (Bericht & Vorschlag)“ wählen.",
      "In der Patienteninformation erscheint eine Schaltfläche für Sorrida. Ein Klick öffnet „Behandlung abschließen“ für den aktuellen Patienten.",
    ],
    source: "Dampsoft, Einbindung der VDDS-media-Schnittstelle in DS-WIN-PLUS",
  },
  {
    name: "CGM Z1 / Z1.PRO",
    share: "ca. 24 %",
    steps: [
      "Z1 unterstützt VDDS-media für externe Programme (z. B. Bildsoftware).",
      "In den VDDS-/Multimedia-Einstellungen von Z1 „Sorrida (Bericht & Vorschlag)“ als Programm aktivieren.",
      "Den genauen Menüpunkt nennt der CGM-Support bzw. Ihr CGM-Vertriebspartner.",
    ],
    source: "VDDS-Integration laut Medit-Support für CGM Z1",
  },
  {
    name: "charly (solutio)",
    share: "ca. 10 %",
    steps: [
      "charly bindet Bild- und Multimediaprogramme über VDDS-media an.",
      "In der Schnittstellenverwaltung „Sorrida (Bericht & Vorschlag)“ als VDDS-Programm hinzufügen.",
      "Bei Fragen zur Einrichtung hilft der solutio-Support.",
    ],
    source: "VDDS-media-Standard",
  },
  {
    name: "EVIDENT",
    share: "ca. 7 %",
    steps: [
      "EVIDENT bietet VDDS-Schnittstellen als Softwaremodul an.",
      "EVIDENT einmal per Rechtsklick „Als Administrator ausführen“ starten und unter VDDS „Sorrida (Bericht & Vorschlag)“ wählen.",
      "Danach lässt sich Sorrida aus der Patientenansicht über VDDS starten.",
    ],
    source: "EVIDENT, Schnittstellen VDDS; Medit-Support zur VDDS-Einrichtung in EVIDENT",
  },
  {
    name: "Berichte zurück in die Zahnarzt-Software",
    share: "",
    steps: [
      "VDDS-media überträgt keine Texte zurück in die Karteikarte. Deshalb legt Sorrida freigegebene Berichte als PDF in einen Ordner (Installationsbefehl mit -Ablage).",
      "Der Dateiname beginnt mit der Patientennummer aus Ihrer Praxissoftware, dann Name und Datum, z. B. 4711_Müller_2026-11-08_Bericht.pdf.",
      "Diesen Ordner als Eingangs- oder Importordner Ihrer Dokumentenablage eintragen oder die PDF in die Patientenakte ziehen. Ob Ihre Software Dateien automatisch nach Patientennummer zuordnet, sagt der Support Ihrer Praxissoftware.",
    ],
    source: "VDDS-media 1.4 (kein Textrückweg vorgesehen)",
  },
  {
    name: "Andere Systeme mit VDDS-media (z. B. LinuDent)",
    share: "",
    steps: [
      "Jede Praxissoftware mit VDDS-media-Unterstützung findet Sorrida nach der Installation automatisch in ihrer VDDS-Programmliste.",
      "Ohne VDDS-media: Sorrida im Browser öffnen und den Patienten dort auswählen.",
    ],
    source: "VDDS-media 1.4",
  },
  {
    name: "Arztpraxen mit GDT (z. B. Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS)",
    share: "",
    steps: [
      "Den Installationsbefehl für Arztpraxen (GDT) ausführen. -GdtFile ist die Datei, in die Ihre Praxissoftware den Patienten schreibt, -GdtImport der Ordner, aus dem sie Ergebnisse einliest. Beide Pfade sind frei wählbar. Den Rückweg (-GdtImport) nur an einem PC einrichten.",
      "In der Geräte- bzw. GDT-Verwaltung Ihrer Praxissoftware ein Gerät „Sorrida“ anlegen. Programm: „C:\\Program Files\\Sorrida\\SorridaConnector.exe“. Übergabedatei: wie bei -GdtFile. Satzart: „Neue Untersuchung anfordern“ (6302) oder „Stammdaten übermitteln“ (6301). GDT-Kennung des Geräts: z. B. SORRIDA.",
      "Als Importordner für Ergebnisse dieses Geräts den Ordner von -GdtImport eintragen. Freigegebene Berichte und angenommene Vorschläge kommen dann innerhalb von 2 Minuten als Eintrag (Satzart 6310) in die Karteikarte. Liest Ihre Praxissoftware nur einen festen Dateinamen, diesen mit -GdtName angeben.",
      "Aus der Patientenakte das Gerät „Sorrida“ aufrufen. Übernommen werden nur Patientennummer, Name, Geburtsdatum und Geschlecht; Adresse und Versichertendaten werden verworfen. Die Anforderungsdatei wird nach dem Lesen gelöscht, damit nie ein alter Patient geöffnet wird.",
      "Den genauen Menüpunkt für GDT-Geräte nennt der Support Ihrer Praxissoftware.",
    ],
    source: "GDT 2.1 und 3.0 (Qualitätsring Medizinische Software)",
  },
] as const;
