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
      "Installationsbefehl wie oben ausführen und zusätzlich -GdtFile \"C:\\GDT\\SORR.GDT\" anhängen (Pfad frei wählbar).",
      "In der Geräte- bzw. GDT-Verwaltung Ihrer Praxissoftware ein neues Gerät „Sorrida“ anlegen: Programm „C:\\Program Files\\Sorrida\\SorridaConnector.exe“, Übergabedatei wie oben, Satzart „Stammdaten übermitteln“ (6311).",
      "Aus der Patientenakte das Gerät „Sorrida“ aufrufen. Übernommen werden nur Patientennummer, Name, Geburtsdatum und Geschlecht; Adresse und Versichertendaten werden verworfen.",
      "Den genauen Menüpunkt für GDT-Geräte nennt der Support Ihrer Praxissoftware.",
    ],
    source: "GDT 2.1 (Qualitätsring Medizinische Software)",
  },
] as const;
