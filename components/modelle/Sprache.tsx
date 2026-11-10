"use client";

import { createContext, useCallback, useContext } from "react";
import { uebersetze, type ModellTexte } from "@/lib/modelle/i18n/schluessel";

// Sprache der Modelle im Patientenlink. Ohne Wörterbuch (Praxis, Website) bleibt alles deutsch.
const Kontext = createContext<ModellTexte | null>(null);

export function ModellSprache({ texte, children }: { texte?: ModellTexte | null; children: React.ReactNode }) {
  return <Kontext.Provider value={texte ?? null}>{children}</Kontext.Provider>;
}

/** t("Deutscher Text") liefert die Übersetzung oder den deutschen Text. Platzhalter: t("Zahn {nr}", { nr }) */
export function useT() {
  const w = useContext(Kontext);
  return useCallback((de: string, werte?: Record<string, string | number>) => uebersetze(w, de, werte), [w]);
}
