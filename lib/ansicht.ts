// Dunkle Ansicht der App (Beta). Gespeichert wird nur eine ausdrücklich gewählte Einstellung, im Browser der
// Praxis (localStorage, kein Cookie, nichts geht an den Server). Ohne Wahl bleibt die App hell.

/** Schlüssel im localStorage. */
export const ANSICHT_SCHLUESSEL = "sorrida-ansicht";

export type Ansicht = "hell" | "dunkel";

/** Gespeicherten Wert lesen; alles Unbekannte ist „hell“. */
export const ansichtAus = (wert: string | null | undefined): Ansicht => (wert === "dunkel" ? "dunkel" : "hell");

/** Was beim Umschalten gespeichert wird: „dunkel“ als Wert, „hell“ löscht den Eintrag wieder. */
export const ansichtSpeicherwert = (ansicht: Ansicht): string | null => (ansicht === "dunkel" ? "dunkel" : null);

/**
 * Kleines Skript für den Anfang des App-Layouts: setzt die Klasse „dunkel“ am html-Element, bevor das erste Bild
 * gezeichnet wird (kein Aufblitzen). Lädt nichts nach und liest nur den einen Schlüssel.
 */
export const ANSICHT_SKRIPT = `try{if(localStorage.getItem(${JSON.stringify(ANSICHT_SCHLUESSEL)})==="dunkel")document.documentElement.classList.add("dunkel")}catch(e){}`;
