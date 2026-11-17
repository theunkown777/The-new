import { quelleKurz, quellenListe, type NutzenQuellen } from "@/lib/nutzenQuelle";

/**
 * Kleiner Link „Quelle: IGeL-Monitor (abgerufen am 17.11.2026)“ direkt hinter dem Text im Kasten „Zum Nutzen“ (Website,
 * Editor, Patientenansicht). Ohne Quelle zeigt er nichts. Mehrere Quellen gleichen Namens werden durchnummeriert, in der
 * Reihenfolge des Satzes. Der Tag des Abrufs steht sichtbar dabei (auch auf Geräten ohne Tooltip), einmal, wenn alle
 * Quellen am selben Tag gelesen wurden. `link={false}` nur, wo der Kasten selbst in einem Knopf steht (Editor): Ein
 * Link darf nicht in einem <button> stehen; dort steht die Quelle als Text, die Adresse im Tooltip.
 */
export function NutzenQuelleLink({
  quelle,
  label = "Quelle:",
  abgerufen = "abgerufen am",
  link = true,
}: {
  quelle?: NutzenQuellen | null;
  label?: string;
  /** Wort vor dem Tag des Abrufs, in der Sprache der Ansicht */
  abgerufen?: string;
  link?: boolean;
}) {
  const liste = quellenListe(quelle);
  if (!liste.length) return null;
  const einTag = liste.every((q) => q.stand === liste[0].stand);
  return (
    <>
      {" "}
      {label}{" "}
      {liste.map((q, i) => {
        const kurz = quelleKurz(q);
        const gleich = liste.filter((x) => quelleKurz(x) === kurz);
        const nr = gleich.length > 1 ? ` ${gleich.indexOf(q) + 1}` : "";
        const text = `${kurz}${nr}`;
        const titel = `${q.titel ? `${q.titel}, ` : ""}${q.name}, abgerufen am ${q.stand}`;
        return (
          <span key={q.url}>
            {i > 0 && ", "}
            {link ? (
              <a href={q.url} target="_blank" rel="noopener noreferrer" className="underline" title={titel}>
                {text}
              </a>
            ) : (
              <span title={`${titel}, ${q.url}`}>{text}</span>
            )}
            {!einTag && ` (${abgerufen} ${q.stand})`}
          </span>
        );
      })}
      {einTag && ` (${abgerufen} ${liste[0].stand})`}
    </>
  );
}
