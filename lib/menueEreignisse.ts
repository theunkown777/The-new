// Ereignisse zwischen Menü am Handy (components/MobileNav.tsx), unterer Leiste und „Zeig mir wo“
// (components/HilfeZeiger.tsx). Eigene Datei ohne Abhängigkeiten, damit auch die Website sie nutzen kann,
// ohne das Menü der App mitzuladen.

/** Die untere Leiste und „Zeig mir wo“ öffnen das Menü am Handy über dieses Ereignis. */
export const MENUE_UMSCHALTEN = "sorrida:menue-umschalten";
/** Meldet, ob das Menü am Handy gerade offen ist (detail: boolean). */
export const MENUE_ZUSTAND = "sorrida:menue-zustand";
