import { kennzeile, type PraxisKennzeichen } from "@/lib/praxisKennung";

// Kennung der Praxis auf den Seiten, die Patienten sehen (Portal und Unterseiten, Anamnesebogen /a, Buchungsseite /t):
// ein Farbstreifen der Gruppe (Zahn, Arzt, Therapie) und unter dem Praxisnamen Fach und Ort. So lassen sich
// Hausarzt und Zahnarzt auf einem Gerät auseinanderhalten. Die Farbe sagt nur, welche Art Praxis es ist.
// Patientenseiten bleiben hell (wie das Portal); die Farben erreichen dort genug Kontrast.

/** Farbstreifen über die ganze Breite, ganz oben auf der Seite. */
export function PraxisStreifen({ k }: { k: Pick<PraxisKennzeichen, "farbe" | "gruppe"> }) {
  return <div className="h-1.5 w-full" style={{ backgroundColor: k.farbe }} aria-hidden="true" data-testid="praxis-streifen" data-gruppe={k.gruppe} />;
}

/** „Hausarztpraxis · Münster“: Fach und Ort, auf Deutsch wie in den Angaben der Praxis. */
export function PraxisKennzeile({ k, className = "" }: { k: Pick<PraxisKennzeichen, "fachKurz" | "ort">; className?: string }) {
  const zeile = kennzeile(k);
  if (!zeile) return null;
  return (
    <span className={`block text-xs text-slate-600 ${className}`} lang="de" data-testid="praxis-kennzeile">
      {zeile}
    </span>
  );
}

/**
 * Kopf für Unterseiten: Streifen, Monogramm in der Farbe der Gruppe, Praxisname, Fach und Ort.
 * `breite` passt den inneren Rahmen an die Seite an (max-w-xl, max-w-2xl, max-w-5xl).
 */
export function PraxisBand({ k, breite = "max-w-xl" }: { k: PraxisKennzeichen; breite?: string }) {
  return (
    <div data-testid="praxis-band" data-gruppe={k.gruppe}>
      <PraxisStreifen k={k} />
      <div className={`mx-auto flex items-center gap-3 px-4 pt-4 ${breite}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: k.farbe }} aria-hidden="true">
          {k.monogramm}
        </span>
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="block text-sm font-medium text-slate-800">{k.name}</span>
          <PraxisKennzeile k={k} />
        </span>
      </div>
    </div>
  );
}
