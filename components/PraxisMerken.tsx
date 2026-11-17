"use client";

import { useState } from "react";
import { gemerktePraxenLesen, gemerktePraxenSchreiben } from "@/lib/geraeteSpeicher";
import { merken, type NeuePraxis } from "@/lib/meinePraxen";
import type { GeraetUi } from "@/lib/portalI18n";

type Texte = Pick<GeraetUi, "merken" | "merkenHinweis" | "gemerkt" | "voll" | "nichtMoeglich" | "liste">;

/**
 * Fuß des Portals: „Diese Praxis auf diesem Gerät merken“. Erst der Klick liest und schreibt den Speicher des
 * Browsers; beim Laden der Seite passiert nichts. Gespeichert wird nur, was die Portalseite ohnehin zeigt
 * (lib/meinePraxen.ts). Ob der Knopf erscheint, entscheidet der Server (lib/meinePraxenSchutz.ts).
 */
export function PraxisMerken({ eintrag, t, listeHref }: { eintrag: NeuePraxis; t: Texte; listeHref: string }) {
  const [stand, setStand] = useState<"offen" | "gemerkt" | "voll" | "fehler">("offen");

  function klick() {
    const lese = gemerktePraxenLesen();
    if (!lese.verfuegbar) return setStand("fehler");
    const r = merken(lese.praxen, eintrag);
    if (r.art === "voll") return setStand("voll");
    if (r.art === "ungueltig") return setStand("fehler");
    setStand(gemerktePraxenSchreiben(r.praxen) ? "gemerkt" : "fehler");
  }

  return (
    <div className="!mt-5 rounded-2xl bg-white px-4 py-4 text-center" data-testid="praxis-merken">
      {stand === "gemerkt" ? (
        <p className="text-sm font-medium text-salbei-800" role="status" data-testid="praxis-gemerkt">
          ✓ {t.gemerkt}
        </p>
      ) : (
        <>
          <button type="button" onClick={klick} className="btn-secondary min-h-[44px] w-full sm:w-auto" data-testid="praxis-merken-knopf">
            {t.merken}
          </button>
          <p className="mt-2 text-xs text-slate-600">{t.merkenHinweis}</p>
        </>
      )}
      {(stand === "voll" || stand === "fehler") && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {stand === "voll" ? t.voll : t.nichtMoeglich}
        </p>
      )}
      <a href={listeHref} className="mt-3 inline-block py-1 text-sm font-medium text-salbei-700 underline" data-testid="meine-praxen-link">
        {t.liste}
      </a>
    </div>
  );
}
