import { quelleKurz, quellenListe, type NutzenQuellen } from "@/lib/nutzenQuelle";

/**
 * Kleiner Link „Quelle: IGeL-Monitor“ direkt hinter dem Text im Kasten „Zum Nutzen“ (Website, Editor, Patientenansicht).
 * Ohne Quelle zeigt er nichts. Mehrere Quellen werden durchnummeriert, in der Reihenfolge des Satzes.
 * `link={false}` nur, wo der Kasten selbst in einem Knopf steht (Editor): Ein Link darf nicht in einem <button> stehen;
 * dort steht die Quelle als Text, die Adresse im Tooltip.
 */
export function NutzenQuelleLink({ quelle, label = "Quelle:", link = true }: { quelle?: NutzenQuellen | null; label?: string; link?: boolean }) {
  const liste = quellenListe(quelle);
  if (!liste.length) return null;
  return (
    <>
      {" "}
      {label}{" "}
      {liste.map((q, i) => {
        const text = `${quelleKurz(q)}${liste.length > 1 ? ` ${i + 1}` : ""}`;
        const titel = `${q.titel ? `${q.titel}, ` : ""}${q.name}, Stand ${q.stand}`;
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
          </span>
        );
      })}
    </>
  );
}
