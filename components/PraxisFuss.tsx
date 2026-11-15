import { leseStammdaten } from "@/lib/praxisStammdaten";

/**
 * Fuß der Seiten, die Patienten sehen (Portal, Patienten-Link, Anamnesebogen): wer der Anbieter ist (die Praxis),
 * ihre Angaben, soweit hinterlegt, und wer die Seite technisch bereitstellt (Sorrida). Gezeigt wird nur, was die
 * Praxis unter Einstellungen → Angaben der Praxis eingetragen hat; es gibt keine Platzhalter.
 */
export function PraxisFuss({ name, stammdaten, className = "" }: { name: string; stammdaten: unknown; className?: string }) {
  const s = leseStammdaten(stammdaten);
  const anschrift = [s.strasse, s.plzOrt].filter(Boolean).join(", ");
  const kontakt = [s.telefon ? `Telefon ${s.telefon}` : "", s.email].filter(Boolean).join(" · ");
  const beruf = [s.berufsbezeichnung, s.kammer ? `Kammer: ${s.kammer}` : "", s.aufsicht ? `Aufsicht: ${s.aufsicht}` : ""].filter(Boolean).join(" · ");
  const a = "underline";
  return (
    <div className={`space-y-1 text-center text-xs text-slate-500 [overflow-wrap:anywhere] ${className}`} lang="de" data-testid="praxis-fuss">
      <p>
        Dieses Angebot stammt von <b className="font-semibold text-slate-600">{name}</b>
        {s.inhaber && s.inhaber !== name ? ` (${s.inhaber})` : ""}.
      </p>
      {anschrift && <p>{anschrift}</p>}
      {kontakt && <p>{kontakt}</p>}
      {beruf && <p>{beruf}</p>}
      {(s.impressumUrl || s.datenschutzUrl || s.berufsordnungUrl) && (
        <p>
          {s.impressumUrl && <a href={s.impressumUrl} target="_blank" rel="noopener noreferrer" className={a}>Impressum der Praxis</a>}
          {s.impressumUrl && (s.datenschutzUrl || s.berufsordnungUrl) && " · "}
          {s.datenschutzUrl && <a href={s.datenschutzUrl} target="_blank" rel="noopener noreferrer" className={a}>Datenschutzhinweise der Praxis</a>}
          {s.datenschutzUrl && s.berufsordnungUrl && " · "}
          {s.berufsordnungUrl && <a href={s.berufsordnungUrl} target="_blank" rel="noopener noreferrer" className={a}>Berufsordnung</a>}
        </p>
      )}
      <p>
        Ihre Angaben gehen an {name} und werden dort zur Behandlung und Abrechnung verwendet. Technische Bereitstellung im Auftrag der Praxis:
        Sorrida (<a href="/impressum" target="_blank" rel="noopener noreferrer" className={a}>Impressum</a>).
      </p>
    </div>
  );
}
