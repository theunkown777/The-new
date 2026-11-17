// Adresse einer Anfrage vor allem anderen prüfen (proxy.ts). Rein, ohne Next und ohne Datenbank, damit testbar.
//
// 1. Ein Null-Zeichen (%00) in Pfad oder Abfrage-Teil gehört in keine echte Adresse. Die Datenbank nimmt es nicht an
//    und meldet einen Serverfehler. Solche Anfragen enden deshalb gleich mit 400.
// 2. Steht ein Parameter mehrfach im Abfrage-Teil (?lang=a&lang=b), liefert Next den Seiten eine Liste statt eines
//    Textes. Die Seiten erwarten überall einen Text. Für Seiten wird deshalb auf die Adresse mit dem jeweils ersten
//    Wert weitergeleitet. Schnittstellen lesen mit searchParams.get() ohnehin nur den ersten Wert.

export type AdressPruefung = { art: "ok" } | { art: "ungueltig" } | { art: "doppelt"; search: string };

export function adressePruefen(pathname: string, search: string): AdressPruefung {
  if (pathname.includes("\0") || /%00/i.test(pathname) || search.includes("\0") || /%00/i.test(search)) return { art: "ungueltig" };
  if (!search || search === "?") return { art: "ok" };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return { art: "ok" };
  }
  const gesehen = new Set<string>();
  let doppelt = false;
  const einmal = new URLSearchParams();
  for (const [k, v] of params) {
    if (gesehen.has(k)) { doppelt = true; continue; }
    gesehen.add(k);
    einmal.append(k, v);
  }
  if (!doppelt) return { art: "ok" };
  const neu = einmal.toString();
  return { art: "doppelt", search: neu ? `?${neu}` : "" };
}

/** Wert eines Parameters als Text: Liste → erster Eintrag, alles andere außer Text → undefined. */
export function einWert(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

/** Seitenzahl aus der Adresse: ganze Zahl von 1 bis 100.000, sonst 1. Eine riesige Zahl wäre kein gültiger Versatz. */
export function seiteAus(v: unknown): number {
  const n = Math.floor(Number(einWert(v)));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100_000) : 1;
}
