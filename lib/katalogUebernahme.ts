// Abgleich zwischen dem Leistungskatalog und den eigenen Leistungen einer Praxis (Einstellungen → Fachgebiet → „Aus dem
// Leistungskatalog übernehmen“). Ohne Import des Katalogs, damit die Seite im Browser klein bleibt.

export type KatalogVorschlag = {
  name: string;
  kategorie: string;
  kasse: boolean;
  kasseWenn?: string;
  /** Früherer Name, wenn die Leistung im Katalog umbenannt wurde */
  frueher?: string;
  /** Suchwörter, die nicht angezeigt werden (früherer Name, Handelsnamen) */
  suche?: string;
};

type Eigene = { name: string; anlass: string };

/** Schon übernommen, unter dem heutigen oder dem früheren Namen. */
export const schonUebernommen = (k: KatalogVorschlag, eigene: Eigene[]) => eigene.some((c) => c.name === k.name || (!!k.frueher && c.name === k.frueher));

/** Filter im Übernahme-Feld: Name, Kategorie und Suchwörter. */
export const passtZuSuche = (k: KatalogVorschlag, q: string) => {
  const s = q.trim().toLowerCase();
  return !s || `${k.name} ${k.kategorie} ${k.suche ?? ""}`.toLowerCase().includes(s);
};

/**
 * Eigene Leistung, die unter einem früheren Katalognamen oder mit einer früheren Kategorie als Anlass übernommen wurde:
 * Vorschlag mit dem heutigen Namen und der heutigen Kategorie. Null, wenn es nichts zu ändern gibt. Sorrida ändert die Daten
 * der Praxis nicht selbst; die Praxis übernimmt den Vorschlag mit einem Knopf und speichert.
 */
export function neueKatalogBezeichnung(c: Eigene, katalog: KatalogVorschlag[], kategorien: Record<string, string>): { name: string; anlass: string } | null {
  const k = katalog.find((x) => !!x.frueher && x.frueher === c.name && x.name !== c.name);
  const name = k?.name ?? c.name;
  const anlass = Object.prototype.hasOwnProperty.call(kategorien, c.anlass) ? kategorien[c.anlass] : c.anlass;
  return name === c.name && anlass === c.anlass ? null : { name, anlass };
}
