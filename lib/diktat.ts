// Diktat: Wo wird die Sprache erkannt? Bevorzugt auf dem Gerät (neuere Chrome-Versionen können das,
// die Aufnahme verlässt den Rechner dann nicht). Der Weg über den Sprachdienst des Browsers
// (Aufnahme geht an Google bzw. Apple) ist nur offen, wenn die Praxisleitung ihn erlaubt hat.

export type LokalStatus = "available" | "downloadable" | "downloading" | "unavailable" | "unbekannt";

export type DiktatModus =
  | "ohne" // Browser kann gar kein Diktat
  | "lokal" // Erkennung auf dem Gerät, sofort nutzbar
  | "ladbar" // Erkennung auf dem Gerät möglich, Sprachpaket muss einmal geladen werden
  | "cloud" // nur über den Sprachdienst des Browsers, von der Praxis erlaubt
  | "aus"; // nur über den Sprachdienst möglich, von der Praxis nicht erlaubt

export function diktatModus(a: { unterstuetzt: boolean; lokal: LokalStatus; cloudErlaubt: boolean }): DiktatModus {
  if (!a.unterstuetzt) return "ohne";
  if (a.lokal === "available") return "lokal";
  if (a.lokal === "downloadable" || a.lokal === "downloading") return "ladbar";
  return a.cloudErlaubt ? "cloud" : "aus";
}

export const DIKTAT_SPRACHE = "de-DE";

/** Fragt den Browser, ob er Deutsch auf dem Gerät erkennen kann. Ältere Browser kennen die Abfrage nicht. */
export async function lokalStatus(SR: unknown): Promise<LokalStatus> {
  const verfuegbar = (SR as { available?: (o: object) => Promise<string> } | null)?.available;
  if (typeof verfuegbar !== "function") return "unbekannt";
  try {
    const s = await verfuegbar.call(SR, { langs: [DIKTAT_SPRACHE], processLocally: true });
    return s === "available" || s === "downloadable" || s === "downloading" || s === "unavailable" ? s : "unbekannt";
  } catch {
    return "unbekannt";
  }
}

/** Lädt das Sprachpaket für die Erkennung auf dem Gerät. true, wenn es danach nutzbar ist. */
export async function lokalLaden(SR: unknown): Promise<boolean> {
  const laden = (SR as { install?: (o: object) => Promise<boolean> } | null)?.install;
  if (typeof laden !== "function") return false;
  try {
    return (await laden.call(SR, { langs: [DIKTAT_SPRACHE], processLocally: true })) === true;
  } catch {
    return false;
  }
}
