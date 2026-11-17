"use client";

import { UMRISS, KOERPER_HOEHE } from "@/lib/modelle/koerper";
import { ZAEHNE, GEBISS_BREITE, GEBISS_HOEHE } from "@/lib/modelle/gebiss";
import { ortGueltig, type Ansicht, type KurzArt } from "@/lib/kurzcheck";
import { KOPF_PUNKTE, koerperPunkte, type FigurPunkt } from "./figurPunkte";

const HAUT = "#EAD3C0";
const AN = { flaeche: "#C2410C", rand: "#7C2D12" };
/** Angaben des Patienten in der Akte: eigene Farbe (Violett), nicht das Orange der Praxis-Markierungen */
export const PATIENT = { flaeche: "#7B5CD6", rand: "#4C3594" };

type Name = (ort: string) => string;
const deutsch: Name = (o) => o;

function Punkte({ punkte, gewaehlt, onToggle, name, farbe }: { punkte: FigurPunkt[]; gewaehlt: string[]; onToggle?: (ort: string) => void; name: Name; farbe: typeof AN }) {
  return (
    <>
      {punkte.map((p) => {
        const an = gewaehlt.includes(p.ort);
        if (!onToggle && !an) return null;
        return (
          <g key={`${p.ort}-${p.x}-${p.y}`} role={onToggle ? "button" : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={onToggle ? name(p.ort) : undefined} aria-pressed={onToggle ? an : undefined}
            className={onToggle ? "kurz-punkt cursor-pointer outline-none" : undefined} data-ort={p.ort} data-an={an || undefined}
            onClick={onToggle ? () => onToggle(p.ort) : undefined}
            onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(p.ort); } } : undefined}>
            {an && <circle cx={p.x} cy={p.y} r={p.r + 6} fill={farbe.flaeche} opacity={0.18} className="kurz-puls" />}
            <circle cx={p.x} cy={p.y} r={an ? p.r * 0.72 : p.r * 0.5} fill={an ? farbe.flaeche : "#FFFFFF"} fillOpacity={an ? 0.92 : 0.55} stroke={an ? farbe.rand : "#B08968"} strokeWidth={an ? 3 : 1.5} strokeDasharray={an ? undefined : "4 4"} />
            {onToggle && <circle className="kurz-ring" cx={p.x} cy={p.y} r={Math.max(p.r, 14)} fill="transparent" stroke="transparent" strokeWidth={3} />}
          </g>
        );
      })}
    </>
  );
}

/** Körper von vorn oder hinten mit Stellen zum Antippen. Ohne onToggle nur Anzeige. */
export function KoerperFigur({ ansicht, gewaehlt, onToggle, klein = false, art = "koerper", name = deutsch, label, patient = false }: { ansicht: Ansicht; gewaehlt: string[]; onToggle?: (ort: string) => void; klein?: boolean; art?: KurzArt; name?: Name; label?: string; patient?: boolean }) {
  return (
    <svg viewBox={`40 0 320 ${KOERPER_HOEHE - 40}`} className={klein ? "h-40 w-auto" : "mx-auto h-[min(58vh,30rem)] w-auto max-w-full"} role="group" aria-label={label ?? (ansicht === "vorn" ? "Körper von vorn" : "Körper von hinten")} data-testid={`kurz-figur-${ansicht}`}>
      <g strokeLinecap="round" fill="none" aria-hidden="true">{UMRISS.map((u, i) => <path key={i} d={u.d} strokeWidth={u.breite} stroke={HAUT} />)}</g>
      {ansicht === "hinten" && <path d="M200 140V360" stroke="#D9BCA5" strokeWidth={3} strokeLinecap="round" aria-hidden="true" />}
      <Punkte punkte={onToggle || ansicht === "hinten" ? koerperPunkte(art, ansicht) : [...koerperPunkte(art, ansicht), { ort: "bauch", x: 200, y: 302, r: 30 }]} gewaehlt={gewaehlt} onToggle={onToggle} name={name} farbe={patient ? PATIENT : AN} />
    </svg>
  );
}

/** Kopf von vorn (Augen- und HNO-Praxis), wenn kein 3D-Modell möglich oder gewünscht ist. Punkte nur für die Stellen dieser Art. */
export function KopfFigur({ art, gewaehlt, onToggle, klein = false, name = deutsch, label = "Kopf von vorn", patient = false }: { art: KurzArt; gewaehlt: string[]; onToggle?: (ort: string) => void; klein?: boolean; name?: Name; label?: string; patient?: boolean }) {
  // „Beide Augen“ und „Beide Ohren“ leuchten an beiden Stellen
  const an = gewaehlt.flatMap((o) => (o === "auge:B" ? ["auge:R", "auge:L"] : o === "ohr:B" ? ["ohr:R", "ohr:L"] : [o]));
  const punkte = KOPF_PUNKTE.filter((p) => ortGueltig(art, p.ort));
  return (
    <svg viewBox="0 0 300 340" className={klein ? "h-40 w-auto" : "mx-auto h-[min(52vh,26rem)] w-auto max-w-full"} role="group" aria-label={label} data-testid="kurz-figur-kopf">
      <g aria-hidden="true" fill={HAUT} stroke="#D9BCA5" strokeWidth={2}>
        <path d="M118 262 L112 330 H188 L182 262 Z" />
        <ellipse cx={46} cy={152} rx={16} ry={30} /><ellipse cx={254} cy={152} rx={16} ry={30} />
        <path d="M150 14 C 215 14 246 64 246 132 C 246 200 214 268 150 272 C 86 268 54 200 54 132 C 54 64 85 14 150 14 Z" />
      </g>
      <g aria-hidden="true" fill="none" stroke="#B08968" strokeWidth={2} strokeLinecap="round">
        <path d="M100 128 Q116 118 132 128 Q116 136 100 128 Z M168 128 Q184 118 200 128 Q184 136 168 128 Z" />
        <path d="M146 140 L140 172 Q150 178 160 172 L154 140" />
        <path d="M130 212 Q150 222 170 212" />
      </g>
      <Punkte punkte={punkte} gewaehlt={an} onToggle={onToggle} name={name} farbe={patient ? PATIENT : AN} />
    </svg>
  );
}

/** Zahnbogen (Oberkiefer oben, Unterkiefer unten) mit Zähnen zum Antippen. Ohne onToggle nur Anzeige. */
export function ZahnBogen({ gewaehlt, onToggle, klein = false, name = (o) => `Zahn ${o.slice(5)}`, beschriftung = { oben: "Oberkiefer", unten: "Unterkiefer", rechts: "rechts", links: "links" }, label = "Gebiss: Oberkiefer oben, Unterkiefer unten", patient = false }: { gewaehlt: string[]; onToggle?: (ort: string) => void; klein?: boolean; name?: Name; beschriftung?: { oben: string; unten: string; rechts: string; links: string }; label?: string; patient?: boolean }) {
  const farbe = patient ? PATIENT : AN;
  return (
    <svg viewBox={`0 0 ${GEBISS_BREITE} ${GEBISS_HOEHE}`} className={klein ? "h-40 w-auto" : "mx-auto h-[min(56vh,30rem)] w-auto max-w-full"} role="group" aria-label={label} data-testid="kurz-zahnbogen">
      <g aria-hidden="true" fontSize={12} fill="#8b8378" textAnchor="middle">
        <text x={200} y={236}>{beschriftung.oben}</text><text x={200} y={338}>{beschriftung.unten}</text>
        <text x={30} y={290} fontSize={11}>{beschriftung.rechts}</text><text x={370} y={290} fontSize={11}>{beschriftung.links}</text>
      </g>
      {ZAEHNE.map((z) => {
        const ort = `zahn:${z.fdi}`, an = gewaehlt.includes(ort);
        return (
          <g key={z.fdi} role={onToggle ? "button" : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={onToggle ? name(ort) : undefined} aria-pressed={onToggle ? an : undefined} className={onToggle ? "kurz-punkt cursor-pointer outline-none" : undefined} data-ort={ort} data-an={an || undefined}
            onClick={onToggle ? () => onToggle(ort) : undefined}
            onKeyDown={onToggle ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(ort); } } : undefined}>
            <path d={z.form.d} fill={an ? farbe.flaeche : "#FFFDF6"} stroke={an ? farbe.rand : "#A2946F"} strokeWidth={an ? 2.4 : 1.2} strokeLinejoin="round" />
            {onToggle && <path className="kurz-ring" d={z.form.d} fill="transparent" stroke="transparent" strokeWidth={8} />}
          </g>
        );
      })}
    </svg>
  );
}
