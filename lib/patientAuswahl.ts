// Auswahl eines Patienten in langen Listen (neuer Vorschlag, neuer Bericht).
// Eine Praxis hat schnell einige tausend Patienten; eine Auswahlliste mit allen ist dann nicht mehr bedienbar.
// Ab AUSWAHL_GRENZE Einträgen erscheint ein Suchfeld, und die Liste zeigt höchstens AUSWAHL_MAX Treffer.

export const AUSWAHL_GRENZE = 25;
export const AUSWAHL_MAX = 50;

type Person = { id: string; firstName: string; lastName: string };

/** Klein, ohne Akzente und Umlautpunkte, ß als ss: „Müller“ findet man auch mit „muller“. */
export const suchform = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

/**
 * Kürzt die Liste auf die Treffer der Suche (jedes Wort muss in Vor- oder Nachname vorkommen).
 * Der gerade gewählte Patient bleibt immer in der Liste, sonst würde die Auswahl beim Tippen springen.
 */
export function patientenFiltern<T extends Person>(alle: readonly T[], suche: string, gewaehlt: string, max = AUSWAHL_MAX): { liste: T[]; weitere: number } {
  const teile = suchform(suche).split(/[\s,;]+/).filter(Boolean);
  const treffer = teile.length
    ? alle.filter((p) => { const name = suchform(`${p.lastName} ${p.firstName}`); return teile.every((t) => name.includes(t)); })
    : alle;
  const liste = treffer.slice(0, max);
  const fest = gewaehlt && !liste.some((p) => p.id === gewaehlt) ? alle.find((p) => p.id === gewaehlt) : undefined;
  return { liste: fest ? [fest, ...liste] : liste, weitere: Math.max(0, treffer.length - max) };
}
