"use client";

import { useEffect } from "react";

// Startet die Behandlungsweg-Animation erst, wenn der Weg ins Bild kommt.
// Ohne JavaScript bleibt alles sichtbar (die Pause greift nur mit .js-weg).
export function WegAnimationen() {
  useEffect(() => {
    document.documentElement.classList.add("js-weg");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("im-blick")),
      { threshold: 0.3 },
    );
    const scan = () => document.querySelectorAll(".weg-anim:not(.im-blick)").forEach((el) => io.observe(el));
    scan();
    // Höchstens einmal pro Bild nachsehen, nicht bei jeder einzelnen Änderung im Dokument.
    let geplant = 0;
    const mo = new MutationObserver(() => {
      if (geplant) return;
      geplant = requestAnimationFrame(() => {
        geplant = 0;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(geplant);
    };
  }, []);
  return null;
}
