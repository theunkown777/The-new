// Ohne Server-Abhängigkeiten, damit auch die Einstellungsseite (Browser) die Kennungen lesen kann.
/**
 * GDT-Kennungen je Praxissoftware, unter denen Sorrida dort eingerichtet ist ({"GDT-MEDISTAR":"SORRIDA"}).
 * Gespeichert in ConnectorKey.gdtKennung; ältere Einträge sind eine einzelne Kennung ohne Zuordnung.
 */
export function kennungenLesen(wert: string | null | undefined): Record<string, string> {
  if (!wert) return {};
  try {
    const o = JSON.parse(wert);
    if (o && typeof o === "object" && !Array.isArray(o)) return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  } catch {}
  return { "*": wert };
}
export function kennungMerken(wert: string | null | undefined, quelle: string, kennung: string): string {
  const m = kennungenLesen(wert);
  delete m["*"];
  m[quelle] = kennung;
  return JSON.stringify(m);
}
