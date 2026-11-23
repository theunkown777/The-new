import { isDental } from "@/lib/specialties";

// Welche Einstellungsseiten ein Fach öffnen darf. Die Seiten leiten sonst weiter; die Regel steht hier, damit
// lib/einstellungsSeiten.test.ts sie direkt prüft.

export type EinstellungsSeite = "lexikon" | "billing" | "proposals";

/**
 * Leistungslexikon (PZR, Füllungen, Prothetik), Punktwerte (GOZ/BEMA) und Vorschlagspreise der Zahn-Vorschläge
 * gibt es nur in der Zahnmedizin. Die Ratenzahlung im persönlichen Link liegt außerhalb der Zahnmedizin unter
 * Fachgebiet und Leistungen (ratenzahlungAuf).
 */
export function darfSeite(fach: string | null | undefined, seite: EinstellungsSeite): boolean {
  switch (seite) {
    case "lexikon":
    case "billing":
    case "proposals":
      return isDental(fach);
  }
}

/** Wo die Einstellung zur Ratenzahlung steht: Zahnmedizin bei den Vorschlagspreisen, sonst unter Fachgebiet und Leistungen. */
export const ratenzahlungAuf = (fach: string | null | undefined): "/settings/proposals" | "/settings/fachgebiet" =>
  darfSeite(fach, "proposals") ? "/settings/proposals" : "/settings/fachgebiet";
