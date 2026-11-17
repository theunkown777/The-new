import type { HilfeAnker } from "@/lib/hilfeAnker";
import type { MenueRechte } from "@/lib/rollen";

// „Frag Sorrida“: Form eines Eintrags der Wissenssammlung. Wer hier etwas ergänzt: kurze Sätze, Sie-Form,
// nichts versprechen, was nicht gebaut ist. Keine Abrechnungs-, Rechts- oder Medizinauskunft.

export type HilfeArt = "bedienung" | "fehler" | "praxismanager" | "website";

export interface HilfeEintrag {
  id: string;
  frage: string;
  /** Zwei bis vier kurze Sätze. Platzhalter: {P} = Wort für Patienten im Fach, {A} = Behandlung bzw. Wort des Fachs. */
  antwort: string;
  /** Menüpfad, wie er in der App steht (Platzhalter wie oben). */
  pfad: string;
  /** Seite in der App (bzw. auf der Website). */
  href: string;
  stichwoerter: string[];
  /** Nur für Zahnarztpraxen bzw. nur für die übrigen Fächer; ohne Angabe für alle. */
  nur?: "zahn" | "andere";
  /** Bedienelement für „Zeig mir wo“ (lib/hilfeAnker.ts). Ohne Angabe zeigt Sorrida den Menüpunkt der Seite. */
  anker?: HilfeAnker;
  /** Nur sichtbar, wenn das Konto dieses Recht hat (wie lib/suche.ts). */
  recht?: keyof MenueRechte;
  /** Seiten, auf denen die Frage naheliegt („Fragen zu dieser Seite“), z. B. "/patients/[id]". */
  seiten?: string[];
  /** Ohne Angabe: bedienung. */
  art?: HilfeArt;
  /** Meldungen der App, wörtlich wie im Code (lib/hilfeSuche.test.ts prüft das). */
  meldungen?: string[];
}

export const HILFE_HINWEIS =
  "Frag Sorrida erklärt die Bedienung der Software. Es gibt keine Auskunft zu Abrechnung im Einzelfall, Recht oder Medizin und ersetzt nicht die Beratung durch Kammer, KV oder KZV, Steuerberatung oder Kanzlei.";

export const WEBSITE_HINWEIS =
  "Frag Sorrida beantwortet Fragen zu Sorrida aus festen Texten dieser Website. Es gibt keine Auskunft zu Abrechnung im Einzelfall, Recht oder Medizin. Bitte keine Patientendaten eingeben.";
