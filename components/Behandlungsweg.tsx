import { STATIONEN } from "@/lib/journey";

// Sorridas Signatur: Die fünf Stationen des Behandlungswegs liegen auf dem
// Lächelbogen aus dem Logo. Erreichte Stationen in Bordeaux, die aktuelle
// mit Ring, offene hell. Varianten: "mini" für Listenzeilen, "gross" mit
// Beschriftung für Detailansicht, Portal und Website.

const P0 = [8, 8], P1 = [100, 46], P2 = [192, 8];
const pt = (t: number) => [
  (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0],
  (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1],
];
const PATH = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;

export function Behandlungsweg({
  erreicht,
  aktuell,
  abgelehnt = false,
  size = "mini",
  labels = STATIONEN as readonly string[],
  className = "",
}: {
  erreicht: number;
  aktuell: number | null;
  abgelehnt?: boolean;
  size?: "mini" | "gross";
  labels?: readonly string[];
  className?: string;
}) {
  const frac = Math.max(0, Math.min(1, (erreicht - 1) / 4));
  const gross = size === "gross";
  const title = `Behandlungsweg: ${erreicht} von 5 Stationen${abgelehnt ? " (abgelehnt)" : ""}`;
  return (
    <div className={`relative ${gross ? "w-full" : "w-[7.5rem] shrink-0"} ${className}`} role="img" aria-label={title} title={title} data-testid="behandlungsweg">
      <svg viewBox="0 0 200 40" className="block h-auto w-full overflow-visible" aria-hidden="true">
        <path d={PATH} fill="none" stroke="currentColor" className="text-slate-200" strokeWidth={gross ? 2 : 3} strokeLinecap="round" />
        {erreicht > 1 && (
          <path d={PATH} fill="none" pathLength={1} strokeDasharray={`${frac} 1`} className={abgelehnt ? "stroke-slate-400" : "stroke-brand-600"} strokeWidth={gross ? 2.5 : 3.5} strokeLinecap="round" />
        )}
        {[0, 1, 2, 3, 4].map((i) => {
          const [x, y] = pt(i / 4);
          const done = i < erreicht;
          const cur = aktuell === i;
          const r = gross ? 5 : 7;
          return (
            <g key={i}>
              {cur && <circle cx={x} cy={y} r={r + 4} className="fill-brand-100" />}
              <circle
                cx={x}
                cy={y}
                r={r}
                strokeWidth={2}
                className={
                  abgelehnt && done ? "fill-slate-400 stroke-slate-400" : done ? (i === 4 ? "fill-salbei-600 stroke-salbei-600" : "fill-brand-600 stroke-brand-600") : cur ? "fill-white stroke-brand-600" : "fill-white stroke-slate-300"
                }
              />
            </g>
          );
        })}
      </svg>
      {gross && (
        <div className="relative mt-1 h-10">
          {labels.map((l, i) => {
            const [x] = pt(i / 4);
            return (
              <span
                key={l}
                className={`absolute -translate-x-1/2 whitespace-nowrap text-center text-[11px] sm:text-xs ${i < erreicht ? "font-semibold text-slate-800" : aktuell === i ? "font-semibold text-brand-700" : "text-slate-400"}`}
                style={{ left: `${(x / 200) * 100}%`, top: `${i === 0 || i === 4 ? -18 : i === 2 ? 0 : -8}px` }}
              >
                {l}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Kleines Lächelbogen-Ornament für Abschnittsüberschriften. */
export function Laechelbogen({ className = "h-2 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 8" className={className} aria-hidden="true">
      <path d="M2 2 Q20 10 38 2" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
