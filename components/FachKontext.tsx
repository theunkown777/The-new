"use client";

import { createContext, useContext } from "react";
import { appTextFuer } from "@/lib/fachText";

// Fach der angemeldeten Praxis für die Bausteine der App. app/(app)/layout.tsx setzt es einmal; feste Texte laufen
// dann über useAppText() in die Wörter des Fachs (Kunde, Klientin, Apotheke …). Ohne Fach bleibt jeder Text, wie er ist.
const Kontext = createContext<string | null>(null);

export function FachKontext({ fach, children }: { fach: string | null; children: React.ReactNode }) {
  return <Kontext.Provider value={fach}>{children}</Kontext.Provider>;
}

/** Fach der Praxis oder null (außerhalb der App). */
export const useFach = (): string | null => useContext(Kontext);

/** Schreibt einen festen deutschen Text in die Wörter des Fachs (lib/fachText.ts, appTextFuer). */
export const useAppText = (): ((text: string) => string) => appTextFuer(useContext(Kontext));
