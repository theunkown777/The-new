import { cookies, headers } from "next/headers";
import { fachText } from "@/lib/fachText";
import { GERAET_UI, pickPortalLang, portalDir } from "@/lib/portalI18n";
import { darfAufGeraetMerken } from "@/lib/meinePraxenSchutz";
import { GemerktEntfernen } from "@/components/PraxisMerken";

/**
 * „Dieser Link ist nicht mehr gültig“ für das Portal und alle Unterseiten (Fragen, Modell, Termin, …): abgelaufen oder
 * von der Praxis durch einen neuen Link ersetzt (jede neue Nachricht oder Freigabe erzeugt einen neuen Link). Auf dem
 * Gerät des Patienten (keine Praxis-Sitzung) dazu der Hinweis, den neuen Link zu merken, das Entfernen dieses Links
 * und der Weg zu „Meine Praxen auf diesem Gerät“.
 */
export async function PortalUngueltig({ token, lang, fach }: { token: string; lang?: string; fach?: string | null }) {
  const sprache = pickPortalLang(lang, (await headers()).get("accept-language"));
  const g = GERAET_UI[sprache];
  const d = (s: string) => (sprache === "de" ? fachText(s, fach) : s);
  const aufGeraet = /^[A-Za-z0-9_-]{20,128}$/.test(token) && darfAufGeraetMerken((await cookies()).getAll().map((c) => c.name));
  return (
    <main className="min-h-screen bg-[#F5F2EE]" lang={sprache} dir={portalDir(sprache)} data-testid="portal-ungueltig">
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{g.ungueltigTitel}</h1>
        <p className="mt-3 text-slate-600">{d(g.ungueltigText)}</p>
        {aufGeraet && (
          <>
            <p className="mt-3 text-slate-600" data-testid="portal-ungueltig-hinweis">{d(g.ungueltigHinweis)}</p>
            <GemerktEntfernen token={token} t={{ ungueltigEntfernen: g.ungueltigEntfernen, ungueltigEntfernt: g.ungueltigEntfernt, ungueltigNichtGemerkt: g.ungueltigNichtGemerkt, nichtMoeglich: g.nichtMoeglich }} />
            <p className="mt-4">
              <a href={sprache === "de" ? "/meine-praxen" : `/meine-praxen?lang=${sprache}`} className="ziel min-h-[44px] text-sm font-medium text-brand-700 underline" data-testid="portal-ungueltig-liste">{g.liste}</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
