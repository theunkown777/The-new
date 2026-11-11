import { Behandlungsweg } from "@/components/Behandlungsweg";
import { WegBand } from "@/components/start/WegBand";

// "Ein Weg, zwei Seiten": oben der Behandlungsweg über die volle Breite mit dem, was Praxis und Patient
// an jeder Station tun; darunter die Arbeitsliste der Praxis mit dem nächsten Schritt je Patient.
// Die Patientenansicht steht im Auftakt der Seite.

const STATIONEN_TEXT: [string, string, string][] = [
  ["Gespräch", "Wählt Befund oder Anlass mit einem Klick", "Hört zu, fragt nach"],
  ["Vorschlag", "Kasse zuerst, Alternativen begründet, Link per SMS", "Bekommt den Link aufs Handy"],
  ["Entscheidung", "Sieht die Antwort und ob Raten gewünscht sind", "Vergleicht zu Hause, tippt eine Antwort"],
  ["Vereinbart", "Erstellt Vereinbarung und Rechnung mit einem Klick", "Weiß vorher, was die Kasse zahlt"],
  ["Bezahlt", "Zahlungseingang bestätigen, nichts abtippen", "Zahlt per GiroCode aus der Banking-App"],
];

const LISTE: [string, number, number, string, "aktiv" | "achtung" | "warten" | "erledigt"][] = [
  ["Weber, Martina", 3, 3, "Rückruf gewünscht: heute anrufen", "achtung"],
  ["Yılmaz, Elif", 0, 0, "Anamnese liegt vor: Vorschlag erstellen", "aktiv"],
  ["Schulz, Peter", 2, 2, "Link seit Tagen ungeöffnet: kurz anrufen", "achtung"],
  ["Nowak, Piotr", 2, 2, "Vorschlag angesehen: Rückmeldung abwarten", "warten"],
  ["Krüger, Anna", 4, 4, "Vereinbart: Rechnung erstellen", "aktiv"],
  ["Haddad, Omar", 5, -1, "Abgeschlossen", "erledigt"],
];
const TONE = { aktiv: "text-brand-700", achtung: "text-red-800", warten: "text-tinte-2", erledigt: "text-salbei-700" };

export function ZweiAnsichten() {
  return (
    <section className="j-ein" aria-labelledby="ansichten" data-testid="zwei-ansichten">
      <div className="grid gap-6 lg:grid-cols-12">
        <h2 id="ansichten" className="j-schau text-[clamp(2.6rem,5.5vw,4.6rem)] lg:col-span-7">
          Ein Weg, <em>zwei Seiten.</em>
        </h2>
        <p className="j-text max-w-md self-end text-lg lg:col-span-4 lg:col-start-9">
          Praxis und Patient sehen denselben Weg vom Gespräch bis zur Zahlung. Jeder mit seinem nächsten Schritt, nichts geht verloren.
        </p>
      </div>

      {/* Fünf Stationen auf dem Lächelbogen, jede genau über ihrer Spalte */}
      <div className="mt-14">
        <WegBand stationen={STATIONEN_TEXT} />
      </div>

      {/* Die Arbeitsliste der Praxis */}
      <div className="mt-20 grid gap-10 lg:grid-cols-12" data-testid="praxis-zu-patient">
        <div className="lg:col-span-4" data-testid="seite-praxis">
          <p className="j-marke text-brand-700">Für die Praxis</p>
          <h3 className="j-titel mt-3 text-[2.2rem] text-tinte">Heute: wer als Nächstes dran ist</h3>
          <p className="j-text mt-4">
            Keine Spalten voller Statusangaben. Jeder Patient steht auf seinem Weg, daneben, was jetzt zu tun ist. Rot heißt: heute.
          </p>
          <p className="mt-6 text-[15px] text-tinte-2">
            Der Patient bekommt seinen Weg per SMS oder QR-Code, <span className="text-salbei-700">ohne App und ohne Konto</span>, so wie ganz oben gezeigt.
          </p>
        </div>
        <div className="lg:col-span-8">
          <ul className="j-blatt border border-linie bg-[#FBF9F6]" aria-hidden="true">
            {LISTE.map(([name, erreicht, aktuell, text, tone]) => (
              <li key={name} className="grid items-center gap-x-6 gap-y-1 border-b border-linie px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,11rem)_7.5rem_minmax(0,1fr)]">
                <span className="flex items-center gap-3">
                  <span className="j-titel grid h-9 w-9 place-items-center rounded-full border border-linie text-lg text-brand-700">{name.charAt(0)}</span>
                  <span className="font-medium text-tinte">{name}</span>
                </span>
                <Behandlungsweg erreicht={erreicht} aktuell={aktuell < 0 ? null : aktuell} className="hidden sm:block" />
                <span className={`text-[15px] ${TONE[tone]}`}>{tone === "achtung" && "● "}{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-tinte-2">Aus der Demo-Praxis: erfundene Beispielpatienten.</p>
        </div>
      </div>
    </section>
  );
}
