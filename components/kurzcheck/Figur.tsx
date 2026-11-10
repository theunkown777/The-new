"use client";

import { UMRISS, KOERPER_BREITE, KOERPER_HOEHE } from "@/lib/modelle/koerper";
import { ZAEHNE, GEBISS_BREITE, GEBISS_HOEHE } from "@/lib/modelle/gebiss";
import { REGIONEN } from "@/lib/kurzcheck";

const HAUT = "#EAD3C0";
const AN = { flaeche: "#C2410C", rand: "#7C2D12" };

/** Körper von vorn oder hinten mit Regionen zum Antippen. Ohne onToggle nur Anzeige. */
export function KoerperFigur({ ansicht, gewaehlt, onToggle, klein = false }: { ansicht: "vorn" | "hinten"; gewaehlt: string[]; onToggle?: (ort: string) => void; klein?: boolean }) {
  // Von vorn liegt die rechte Körperseite links im Bild, von hinten rechts.
  const punkte = REGIONEN.filter((r) => r.ansicht === ansicht).flatMap((r) =>
    r.paarig
      ? [{ ort: `${r.id}:${ansicht === "vorn" ? "R" : "L"}`, name: `${r.name} ${ansicht === "vorn" ? "rechts" : "links"}`, x: r.bei[0], y: r.bei[1], r: r.r },
         { ort: `${r.id}:${ansicht === "vorn" ? "L" : "R"}`, name: `${r.name} ${ansicht === "vorn" ? "links" : "rechts"}`, x: KOERPER_BREITE - r.bei[0], y: r.bei[1], r: r.r }]
      : [{ ort: r.id, name: r.name, x: r.bei[0], y: r.bei[1], r: r.r }],
  );
  return (
    <svg viewBox={`40 0 320 ${KOERPER_HOEHE - 40}`} className={klein ? "h-40 w-auto" : "mx-auto h-[min(58vh,30rem)] w-auto max-w-full"} role="group" aria-label={ansicht === "vorn" ? "Körper von vorn" : "Körper von hinten"} data-testid={`kurz-figur-${ansicht}`}>
      <defs>
        <radialGradient id={`kurz-glanz-${ansicht}`} cx="40%" cy="30%" r="80%"><stop offset="0%" stopColor="#F6E6D8" /><stop offset="100%" stopColor={HAUT} /></radialGradient>
      </defs>
      <g stroke={`url(#kurz-glanz-${ansicht})`} strokeLinecap="round" fill="none">{UMRISS.map((u, i) => <path key={i} d={u.d} strokeWidth={u.breite} stroke={HAUT} />)}</g>
      {ansicht === "hinten" && <path d="M200 140V360" stroke="#D9BCA5" strokeWidth={3} strokeLinecap="round" />}
      {punkte.map((p) => {
        const an = gewaehlt.includes(p.ort);
        if (!onToggle && !an) return null;
        return (
          <g key={p.ort} role={onToggle ? "button" : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={p.name} aria-pressed={onToggle ? an : undefined} className={onToggle ? "cursor-pointer outline-none" : undefined} data-ort={p.ort} data-an={an || undefined}
            onClick={onToggle ? () => onToggle(p.ort) : undefined}
            onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(p.ort); } } : undefined}>
            {an && <circle cx={p.x} cy={p.y} r={p.r + 6} fill={AN.flaeche} opacity={0.18} className="kurz-puls" />}
            <circle cx={p.x} cy={p.y} r={an ? p.r * 0.72 : p.r * 0.5} fill={an ? AN.flaeche : "#FFFFFF"} fillOpacity={an ? 0.92 : 0.55} stroke={an ? AN.rand : "#B08968"} strokeWidth={an ? 3 : 1.5} strokeDasharray={an ? undefined : "4 4"} />
            {onToggle && <circle cx={p.x} cy={p.y} r={p.r} fill="transparent" />}
          </g>
        );
      })}
    </svg>
  );
}

/** Zahnbogen (Oberkiefer oben, Unterkiefer unten) mit Zähnen zum Antippen. Ohne onToggle nur Anzeige. */
export function ZahnBogen({ gewaehlt, onToggle, klein = false }: { gewaehlt: string[]; onToggle?: (ort: string) => void; klein?: boolean }) {
  return (
    <svg viewBox={`0 0 ${GEBISS_BREITE} ${GEBISS_HOEHE}`} className={klein ? "h-40 w-auto" : "mx-auto h-[min(56vh,30rem)] w-auto max-w-full"} role="group" aria-label="Gebiss: Oberkiefer oben, Unterkiefer unten" data-testid="kurz-zahnbogen">
      <g aria-hidden="true" fontSize={12} fill="#8b8378" textAnchor="middle">
        <text x={200} y={236}>Oberkiefer</text><text x={200} y={338}>Unterkiefer</text>
        <text x={30} y={290} fontSize={11}>rechts</text><text x={370} y={290} fontSize={11}>links</text>
      </g>
      {ZAEHNE.map((z) => {
        const ort = `zahn:${z.fdi}`, an = gewaehlt.includes(ort);
        return (
          <g key={z.fdi} role={onToggle ? "button" : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={`Zahn ${z.fdi}, ${z.name}`} aria-pressed={onToggle ? an : undefined} className={onToggle ? "cursor-pointer outline-none" : undefined} data-ort={ort} data-an={an || undefined}
            onClick={onToggle ? () => onToggle(ort) : undefined}
            onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(ort); } } : undefined}>
            <path d={z.form.d} fill={an ? AN.flaeche : "#FFFDF6"} stroke={an ? AN.rand : "#A2946F"} strokeWidth={an ? 2.4 : 1.2} strokeLinejoin="round" />
            {onToggle && <path d={z.form.d} fill="transparent" stroke="transparent" strokeWidth={8} />}
          </g>
        );
      })}
    </svg>
  );
}
