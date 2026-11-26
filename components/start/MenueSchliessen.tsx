"use client";

import { useEffect } from "react";

// Das Handy-Menü in der Kopfzeile ist ein <details> (geht auch ohne JavaScript). Mit JavaScript schließt es sich
// wie erwartet: mit Escape (der Fokus geht zurück auf den Menüknopf), beim Tippen daneben und nach der Wahl eines Links.
export function MenueSchliessen() {
  useEffect(() => {
    const offene = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("details.j-menue[open]"));
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      for (const m of offene()) {
        m.open = false;
        m.querySelector("summary")?.focus();
      }
    };
    const tippen = (e: PointerEvent) => {
      const ziel = e.target instanceof Node ? e.target : null;
      for (const m of offene()) if (!ziel || !m.contains(ziel)) m.open = false;
    };
    const klick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest(".j-menue-liste a") : null;
      const m = link?.closest<HTMLDetailsElement>("details.j-menue");
      if (m) m.open = false;
    };
    document.addEventListener("keydown", taste);
    document.addEventListener("pointerdown", tippen);
    document.addEventListener("click", klick);
    return () => {
      document.removeEventListener("keydown", taste);
      document.removeEventListener("pointerdown", tippen);
      document.removeEventListener("click", klick);
    };
  }, []);
  return null;
}
