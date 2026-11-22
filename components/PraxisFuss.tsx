import { leseStammdaten } from "@/lib/praxisStammdaten";
import { einrichtungWoerter, fachWoerter } from "@/lib/fachWoerter";

/**
 * Fuß der Seiten, die Patienten sehen (Portal samt Unterseiten, Patienten-Link, Anamnesebogen, Buchungsseite für neue
 * Patienten, Empfangs-Tablet): wer der Anbieter ist (die Praxis),
 * ihre Angaben, soweit hinterlegt, und wer die Seite technisch bereitstellt (Sorrida). Gezeigt wird nur, was die
 * Praxis unter Einstellungen → Angaben der Praxis eingetragen hat; es gibt keine Platzhalter.
 */
export function PraxisFuss({ name, stammdaten, className = "", ohneLinks = false, fach }: { name: string; stammdaten: unknown; className?: string; /** Empfangs-Tablet: Angaben zeigen, aber nichts verlinken (das Gerät bleibt in der Patientenansicht) */ ohneLinks?: boolean; /** Fach der Praxis: „des Fachgeschäfts“, „für die Beratung“ (ohne Angabe Praxis und Behandlung) */ fach?: string | null }) {
  const s = leseStammdaten(stammdaten);
  const derPraxis = einrichtungWoerter(fach).derGen;
  const { abschluss } = fachWoerter(fach);
  const wofuer = abschluss === "Behandlung" ? "zur Behandlung und Abrechnung" : `für ${abschluss === "Einsatz" || abschluss === "Besuch" ? "den" : "die"} ${abschluss} und die Abrechnung`;
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
      {ohneLinks && <p data-testid="praxis-fuss-ohne-links">Impressum und Datenschutzhinweise {derPraxis} erhalten Sie am Empfang.</p>}
      {!ohneLinks && (s.impressumUrl || s.datenschutzUrl || s.berufsordnungUrl) && (
        <p>
          {s.impressumUrl && <a href={s.impressumUrl} target="_blank" rel="noopener noreferrer" className={a}>Impressum {derPraxis}</a>}
          {s.impressumUrl && (s.datenschutzUrl || s.berufsordnungUrl) && " · "}
          {s.datenschutzUrl && <a href={s.datenschutzUrl} target="_blank" rel="noopener noreferrer" className={a}>Datenschutzhinweise {derPraxis}</a>}
          {s.datenschutzUrl && s.berufsordnungUrl && " · "}
          {s.berufsordnungUrl && <a href={s.berufsordnungUrl} target="_blank" rel="noopener noreferrer" className={a}>Berufsordnung</a>}
        </p>
      )}
      <p>
        Ihre Angaben gehen an {name} und werden dort {wofuer} verwendet. Technische Bereitstellung im Auftrag {derPraxis}:{" "}
        {ohneLinks ? "Sorrida." : <>Sorrida (<a href="/impressum" target="_blank" rel="noopener noreferrer" className={a}>Impressum</a>).</>}
      </p>
    </div>
  );
}
