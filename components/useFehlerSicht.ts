"use client";

import { useEffect, useRef } from "react";

/**
 * Eine Fehlermeldung sichtbar machen: in die Mitte scrollen und den Fokus darauf setzen.
 * Sonst steht sie oben außerhalb des Bildschirms, und wer unten auf den Knopf tippt, sieht keine Reaktion.
 * Die Meldung braucht tabIndex={-1}.
 */
export function useFehlerSicht<T extends HTMLElement = HTMLParagraphElement>(fehler: string | null) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!fehler || !ref.current) return;
    const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    ref.current.scrollIntoView({ block: "center", behavior: ruhig ? "auto" : "smooth" });
    ref.current.focus({ preventScroll: true });
  }, [fehler]);
  return ref;
}
