// Einrichtung je Praxissoftware. Menüpfade nur dort, wo eine Herstellerquelle
// vorliegt - sonst der allgemeine VDDS-media-Weg, statt Pfade zu raten.
// Die Namen der Programme stehen nur als Überschrift der jeweiligen Anleitung. Keine Anleitung ist bisher in einer
// Praxis geprüft; die Seite zeigt deshalb bei jeder Anleitung den Vermerk PVS_GUIDE_VERMERK. Marktanteile nennt die
// App nicht (keine belegte eigene Quelle).

/** Sichtbarer Vermerk an jeder Anleitung, solange es je Programm kein Testprotokoll aus einer Praxis gibt. */
export const PVS_GUIDE_VERMERK = "Nach Unterlagen des Herstellers. Von uns noch nicht in einer Praxis geprüft.";
/** Für Anleitungen, deren Quelle nicht der Hersteller des Programms ist (Beschreibung der Schnittstelle, Unterlagen Dritter). */
export const PVS_GUIDE_VERMERK_OHNE_HERSTELLER = "Nach der Beschreibung der Schnittstelle, ohne Unterlagen des Herstellers. Von uns noch nicht in einer Praxis geprüft.";
/** Vermerk über allen Anleitungen. */
export const PVS_GUIDES_HINWEIS = "Diese Anleitungen stammen aus Unterlagen der Hersteller und aus der Beschreibung der Schnittstelle. Von uns ist noch keine in einer Praxis geprüft.";
/** Der Vermerk einer Anleitung: mit Unterlagen des Herstellers oder ohne. */
export const guideVermerk = (g: { hersteller: boolean }) => (g.hersteller ? PVS_GUIDE_VERMERK : PVS_GUIDE_VERMERK_OHNE_HERSTELLER);

export const PVS_GUIDES = [
  {
    name: "DS-Win (Dampsoft)",
    hersteller: true,
    steps: [
      "In der Titelzeile von DS-Win auf die VDDS-Schaltfläche klicken. Es öffnet sich „VDDS-Schnittstellen-Einrichtung“.",
      "Häkchen setzen und in der linken Liste „Sorrida (Bericht & Vorschlag)“ wählen.",
      "In der Patienteninformation erscheint eine Schaltfläche für Sorrida. Ein Klick öffnet „Behandlung abschließen“ für den aktuellen Patienten.",
    ],
    source: "Dampsoft, Einbindung der VDDS-media-Schnittstelle in DS-WIN-PLUS",
  },
  {
    name: "CGM Z1 / Z1.PRO",
    hersteller: false,
    steps: [
      "Bietet Ihr Z1 die Schnittstelle VDDS-media an, lassen sich dort externe Programme eintragen.",
      "In den VDDS-/Multimedia-Einstellungen von Z1 „Sorrida (Bericht & Vorschlag)“ als Programm aktivieren.",
      "Den genauen Menüpunkt nennt der CGM-Support bzw. Ihr CGM-Vertriebspartner.",
    ],
    source: "VDDS-Integration laut Medit-Support für CGM Z1",
  },
  {
    name: "charly (solutio)",
    hersteller: false,
    steps: [
      "Bietet Ihr charly die Schnittstelle VDDS-media an, lassen sich dort externe Programme eintragen.",
      "In der Schnittstellenverwaltung „Sorrida (Bericht & Vorschlag)“ als VDDS-Programm hinzufügen.",
      "Bei Fragen zur Einrichtung hilft der solutio-Support.",
    ],
    source: "VDDS-media-Standard",
  },
  {
    name: "EVIDENT",
    hersteller: true,
    steps: [
      "Nach den Unterlagen des Herstellers gibt es die VDDS-Schnittstellen als Softwaremodul. Fragen Sie den Hersteller, ob das Modul bei Ihnen freigeschaltet ist.",
      "EVIDENT einmal per Rechtsklick „Als Administrator ausführen“ starten und unter VDDS „Sorrida (Bericht & Vorschlag)“ wählen.",
      "Danach soll sich Sorrida aus der Patientenansicht über VDDS starten lassen.",
    ],
    source: "EVIDENT, Schnittstellen VDDS; Medit-Support zur VDDS-Einrichtung in EVIDENT",
  },
  {
    name: "Berichte zurück in die Zahnarzt-Software",
    hersteller: false,
    steps: [
      "VDDS-media überträgt keine Texte zurück in die Karteikarte. Deshalb legt Sorrida freigegebene Berichte als PDF in einen Ordner (Installationsbefehl mit -Ablage).",
      "Der Dateiname beginnt mit der Patientennummer aus Ihrer Praxissoftware, dann Name und Datum, z. B. 4711_Müller_2026-11-08_Bericht.pdf.",
      "Diesen Ordner als Eingangs- oder Importordner Ihrer Dokumentenablage eintragen oder die PDF in die Patientenakte ziehen. Ob Ihre Software Dateien automatisch nach Patientennummer zuordnet, sagt der Support Ihrer Praxissoftware.",
    ],
    source: "VDDS-media 1.4 (kein Textrückweg vorgesehen)",
  },
  {
    name: "Andere Systeme mit VDDS-media",
    hersteller: false,
    steps: [
      "Bietet Ihre Praxissoftware VDDS-media an, erscheint Sorrida nach der Installation in ihrer VDDS-Programmliste.",
      "Ohne VDDS-media: Sorrida im Browser öffnen und den Patienten dort auswählen.",
    ],
    source: "VDDS-media 1.4",
  },
  {
    name: "Arztpraxen mit GDT",
    hersteller: false,
    steps: [
      "Den Installationsbefehl für Arztpraxen (GDT) ausführen. -GdtFile ist die Datei, in die Ihre Praxissoftware den Patienten schreibt, -GdtImport der Ordner, aus dem sie Ergebnisse einliest. Beide Pfade sind frei wählbar. Den Rückweg (-GdtImport) nur an einem PC einrichten.",
      "In der Geräte- bzw. GDT-Verwaltung Ihrer Praxissoftware ein Gerät „Sorrida“ anlegen. Programm: „C:\\Program Files\\Sorrida\\SorridaConnector.exe“. Übergabedatei: wie bei -GdtFile. Satzart: „Neue Untersuchung anfordern“ (6302) oder „Stammdaten übermitteln“ (6301). GDT-Kennung des Geräts: z. B. SORRIDA.",
      "Als Importordner für Ergebnisse dieses Geräts den Ordner von -GdtImport eintragen. Freigegebene Berichte und angenommene Vorschläge legt Sorrida dort beim nächsten Abgleich als Datei ab (Satzart 6310). Von dort kann Ihre Praxissoftware sie in die Karteikarte einlesen. Liest Ihre Praxissoftware nur einen festen Dateinamen, diesen mit -GdtName angeben.",
      "Aus der Patientenakte das Gerät „Sorrida“ aufrufen. Übernommen werden nur Patientennummer, Name, Geburtsdatum und Geschlecht; Adresse und Versichertendaten werden verworfen. Die Anforderungsdatei wird nach dem Lesen gelöscht, damit nie eine alte Akte geöffnet wird.",
      "Den genauen Menüpunkt für GDT-Geräte nennt der Support Ihrer Praxissoftware.",
    ],
    source: "GDT 2.1 und 3.0 (Qualitätsring Medizinische Software)",
  },
] as const;

export type AnbindungGruppe = "zahn" | "arzt" | "andere";

/**
 * Wie eine Praxis ihre Software anbindet: Zahnmedizin über VDDS-media, Arztpraxen über GDT. Alle anderen (Therapie,
 * Hebamme, Heilpraktik, Apotheke, Pflege, Fachgeschäft) und Praxen ohne Fachangabe arbeiten im Browser neben ihrer
 * Software; GDT ist dort nur eine Möglichkeit. Zahnmedizin ist nie die stille Vorgabe.
 */
export function anbindungGruppe(fach: string | null | undefined, systemGruppe: (f: string) => string): AnbindungGruppe {
  if (!fach) return "andere";
  const g = systemGruppe(fach);
  return g === "zahn" ? "zahn" : g === "arzt" ? "arzt" : "andere";
}

/** GDT ohne die Wörter der Arztpraxis, für Software außerhalb der Arzt- und Zahnarztpraxis. */
const GDT_NEUTRAL = {
  name: "Software mit GDT",
  hersteller: false,
  steps: [
    "Den Installationsbefehl mit GDT ausführen. -GdtFile ist die Datei, in die Ihre Software die gewählte Akte schreibt, -GdtImport der Ordner, aus dem sie Ergebnisse einliest. Beide Pfade sind frei wählbar. Den Rückweg (-GdtImport) nur an einem PC einrichten.",
    "In der Geräte- bzw. GDT-Verwaltung Ihrer Software ein Gerät „Sorrida“ anlegen. Programm: „C:\\Program Files\\Sorrida\\SorridaConnector.exe“. Übergabedatei: wie bei -GdtFile. Satzart: „Neue Untersuchung anfordern“ (6302) oder „Stammdaten übermitteln“ (6301). GDT-Kennung des Geräts: z. B. SORRIDA.",
    "Als Importordner für Ergebnisse dieses Geräts den Ordner von -GdtImport eintragen. Freigegebene Berichte und angenommene Vorschläge legt Sorrida dort beim nächsten Abgleich als Datei ab (Satzart 6310). Von dort kann Ihre Software sie einlesen. Liest Ihre Software nur einen festen Dateinamen, diesen mit -GdtName angeben.",
    "Aus der Akte das Gerät „Sorrida“ aufrufen. Übernommen werden nur Nummer, Name, Geburtsdatum und Geschlecht; Adresse und Versichertendaten werden verworfen. Die Anforderungsdatei wird nach dem Lesen gelöscht, damit nie eine alte Akte geöffnet wird.",
    "Den genauen Menüpunkt für GDT-Geräte nennt der Support Ihrer Software.",
  ],
  source: "GDT 2.1 und 3.0 (Qualitätsring Medizinische Software)",
} as const;

type Anleitung = { name: string; hersteller: boolean; steps: readonly string[]; source: string };

/** Die Anleitungen für eine Gruppe: Zahnmedizin die Wege über VDDS-media, Arztpraxen GDT, alle anderen GDT in neutralen Worten. */
export function pvsGuidesFuer(gruppe: AnbindungGruppe): readonly Anleitung[] {
  if (gruppe === "zahn") return PVS_GUIDES.filter((g) => !/GDT/.test(g.name));
  if (gruppe === "arzt") return PVS_GUIDES.filter((g) => /GDT/.test(g.name));
  return [GDT_NEUTRAL];
}
