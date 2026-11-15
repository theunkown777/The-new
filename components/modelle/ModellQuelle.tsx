import { ANATOMIE_QUELLE } from "@/lib/modelle/drei/anatomie";

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
    {children}
  </a>
);

/**
 * Lizenzvermerk unter jedem 3D-Modell: vollständig, mit Links, umbrechend statt abgeschnitten.
 * Der Wortlaut ohne Links steht in ANATOMIE_QUELLE (lib/modelle/drei/anatomie.ts) und muss dazu passen.
 */
export function ModellQuelle({ className = "" }: { className?: string }) {
  return (
    <p className={`mt-1.5 px-1 text-[11px] leading-snug text-slate-500 [overflow-wrap:anywhere] ${className}`} data-testid="modell-quelle" aria-label={ANATOMIE_QUELLE}>
      3D-Anatomie: bearbeitet nach BodyParts3D, © The Database Center for Life Science, lizenziert unter{" "}
      <A href="https://creativecommons.org/licenses/by-sa/2.1/jp/">CC BY-SA 2.1 Japan</A> (aktuelle Fassung der Datenbank: CC Attribution 4.0
      International). Kopf: nach „Infinite, 3D Head Scan“ von Lee Perry-Smith, <A href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</A>.
      Die Modelle sind vereinfacht und ergänzt; <A href="/lizenzen">Einzelheiten</A>. Die bearbeiteten Modelle stehen unter{" "}
      <A href="https://creativecommons.org/licenses/by-sa/4.0/deed.de">CC BY-SA 4.0</A>.
    </p>
  );
}
