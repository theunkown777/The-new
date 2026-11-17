"use client";

import { useCallback, useState } from "react";
import { gemerktePraxenLesen, gemerktePraxenSchreiben } from "@/lib/geraeteSpeicher";
import { entfernen, merken, type MerkWahl, type NeuePraxis } from "@/lib/meinePraxen";
import type { GeraetUi } from "@/lib/portalI18n";

type Texte = Pick<GeraetUi, "merken" | "merkenHinweis" | "gemerkt" | "voll" | "nichtMoeglich" | "nichtGemerkt" | "liste" | "aehnlichFrage" | "aehnlichErsetzen" | "aehnlichBeide">;

/** Setzt den Tastaturfokus auf ein Element, sobald es erscheint (ohne useEffect: beim Laden passiert hier nichts). */
const useFokusBeimErscheinen = () => useCallback((el: HTMLElement | null) => el?.focus(), []);

/**
 * Fuß des Portals: „Diese Praxis auf diesem Gerät merken“. Erst der Klick liest und schreibt den Speicher des
 * Browsers; beim Laden der Seite passiert nichts. Gespeichert wird nur, was die Portalseite ohnehin zeigt
 * (lib/meinePraxen.ts). Ob der Knopf erscheint, entscheidet der Server (lib/meinePraxenSchutz.ts).
 * Steht schon ein gleich benannter Eintrag mit anderem Link auf dem Gerät, fragt der Knopf nach, statt still zu ersetzen.
 */
export function PraxisMerken({ eintrag, t, listeHref }: { eintrag: NeuePraxis; t: Texte; listeHref: string }) {
  const [stand, setStand] = useState<"offen" | "frage" | "gemerkt" | "voll" | "fehler" | "ungueltig">("offen");
  const fokus = useFokusBeimErscheinen();

  function klick(wahl?: MerkWahl) {
    const lese = gemerktePraxenLesen();
    if (!lese.verfuegbar) return setStand("fehler");
    const r = merken(lese.praxen, eintrag, new Date(), wahl);
    if (r.art === "aehnlich") return setStand("frage");
    if (r.art === "voll") return setStand("voll");
    if (r.art === "ungueltig") return setStand("ungueltig");
    setStand(gemerktePraxenSchreiben(r.praxen) ? "gemerkt" : "fehler");
  }

  const fehler = { voll: t.voll, fehler: t.nichtMoeglich, ungueltig: t.nichtGemerkt } as const;

  return (
    <div className="!mt-5 rounded-2xl bg-white px-4 py-4 text-center" data-testid="praxis-merken">
      {stand === "gemerkt" ? (
        // Der Knopf verschwindet; der Fokus geht auf die Meldung, damit er nicht verloren geht.
        <p ref={fokus} tabIndex={-1} className="text-sm font-medium text-salbei-800 outline-none" role="status" data-testid="praxis-gemerkt">
          ✓ {t.gemerkt}
        </p>
      ) : stand === "frage" ? (
        <div role="group" aria-labelledby="praxis-merken-frage" className="space-y-3" data-testid="praxis-merken-frage">
          <p id="praxis-merken-frage" ref={fokus} tabIndex={-1} className="text-sm font-medium text-slate-800 outline-none">
            {t.aehnlichFrage}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => klick("ersetzen")} className="btn-secondary min-h-[44px]" data-testid="praxis-merken-ersetzen">
              {t.aehnlichErsetzen}
            </button>
            <button type="button" onClick={() => klick("beide")} className="btn-secondary min-h-[44px]" data-testid="praxis-merken-beide">
              {t.aehnlichBeide}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => klick()} className="btn-secondary min-h-[44px] w-full sm:w-auto" data-testid="praxis-merken-knopf">
            {t.merken}
          </button>
          <p className="mt-2 text-xs text-slate-600">{t.merkenHinweis}</p>
        </>
      )}
      {(stand === "voll" || stand === "fehler" || stand === "ungueltig") && (
        <p className="mt-2 text-sm text-red-700" role="alert" data-testid="praxis-merken-fehler">
          {fehler[stand]}
        </p>
      )}
      <a href={listeHref} className="mt-3 inline-block py-1 text-sm font-medium text-salbei-700 underline" data-testid="meine-praxen-link">
        {t.liste}
      </a>
    </div>
  );
}

/**
 * Auf der Seite „Dieser Link ist nicht mehr gültig“: den Link auf Wunsch aus der Liste auf diesem Gerät nehmen.
 * Erst der Klick liest den Speicher; der Server erfährt davon nichts. Der Server zeigt den Knopf nur auf Geräten
 * ohne Praxis-Sitzung (wie beim Merken).
 */
export function GemerktEntfernen({ token, t }: { token: string; t: Pick<GeraetUi, "ungueltigEntfernen" | "ungueltigEntfernt" | "ungueltigNichtGemerkt" | "nichtMoeglich"> }) {
  const [stand, setStand] = useState<"offen" | "entfernt" | "nicht" | "fehler">("offen");
  const fokus = useFokusBeimErscheinen();

  function klick() {
    const lese = gemerktePraxenLesen();
    if (!lese.verfuegbar) return setStand("fehler");
    if (!lese.praxen.some((p) => p.token === token)) return setStand("nicht");
    setStand(gemerktePraxenSchreiben(entfernen(lese.praxen, token)) ? "entfernt" : "fehler");
  }

  if (stand === "offen" || stand === "fehler") {
    return (
      <div className="mt-6">
        <button type="button" onClick={klick} className="btn-secondary min-h-[44px]" data-testid="gemerkt-entfernen">
          {t.ungueltigEntfernen}
        </button>
        {stand === "fehler" && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {t.nichtMoeglich}
          </p>
        )}
      </div>
    );
  }
  return (
    <p ref={fokus} tabIndex={-1} className="mt-6 text-sm font-medium text-salbei-800 outline-none" role="status" data-testid="gemerkt-entfernt">
      {stand === "entfernt" ? t.ungueltigEntfernt : t.ungueltigNichtGemerkt}
    </p>
  );
}
