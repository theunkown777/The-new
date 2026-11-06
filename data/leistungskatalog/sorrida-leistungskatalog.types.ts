// Typen des Sorrida-Leistungskatalogs (Struktur aus build_katalog.py, Version 2.0).

export type KostentraegerCode = "GKV" | "GKV_EA" | "IND" | "PKV" | "SZ";
export type HwgVorherNachher = "ja" | "prüfen" | "nein";

export interface Leistung {
  /** stabiler Slug aus Bereich und Name, z. B. "orthopaedie-unfallchirurgie-kreuzband-op" */
  id: string;
  bereich: string;
  kategorie: string;
  /** Name in Laiensprache */
  name: string;
  fachbegriff: string;
  synonyme: string[];
  beschreibung: string;
  behandler: string;
  kostentraeger: string;
  kostentraeger_code: KostentraegerCode;
  /** Gebührenordnung, nur intern/Admin anzeigen */
  gebuehrenordnung: string;
  invasivitaet: "nicht-invasiv" | "minimal-invasiv" | "operativ";
  ausfallzeit: string;
  ust_pflichtig: boolean;
  /** Vorher-Nachher-Bilder: "ja" = verboten (§ 11 HWG), "prüfen" = nur mit Admin-Freigabe */
  hwg_vorher_nachher: HwgVorherNachher;
  hinweis: string;
}

export interface Leistungskatalog {
  meta: {
    projekt: string;
    version: string;
    erstellt: string;
    anzahl: number;
    legende: {
      kostentraeger: Record<KostentraegerCode, string>;
      invasivitaet: Record<string, string>;
      ausfallzeit: Record<string, string>;
      hwg_vorher_nachher: Record<HwgVorherNachher, string>;
    };
    /** Hinweis zu Gebührenziffern; nur intern anzeigen */
    hinweis: string;
  };
  leistungen: Leistung[];
}
