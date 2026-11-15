import { ZWECKBESTIMMUNG, ZWECK_TITEL } from "@/lib/zweckbestimmung";

/**
 * Zweckbestimmung im gleichen Wortlaut an jeder Stelle (lib/zweckbestimmung.ts).
 * `klein`: Fuß der Website. Sonst als Abschnitt im Fließtext; `ohneTitel`, wenn die Seite die Überschrift selbst setzt.
 */
export function Zweckbestimmung({ klein = false, ohneTitel = false, className = "" }: { klein?: boolean; ohneTitel?: boolean; className?: string }) {
  if (klein)
    return (
      <div className={`space-y-1.5 text-xs text-tinte-2 ${className}`} data-testid="zweckbestimmung">
        <p className="font-semibold">{ZWECK_TITEL}</p>
        {ZWECKBESTIMMUNG.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    );
  return (
    <div className={`space-y-3 ${className}`} data-testid="zweckbestimmung">
      {!ohneTitel && <p className="font-semibold">{ZWECK_TITEL}</p>}
      {ZWECKBESTIMMUNG.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
