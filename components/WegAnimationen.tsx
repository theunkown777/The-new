"use client";

import { useEffect } from "react";

// Startet die Behandlungsweg-Animation erst, wenn der Weg ins Bild kommt.
// Ohne JavaScript bleibt alles sichtbar (die Pause greift nur mit .js-weg).
export function WegAnimationen() {
  useEffect(() => {
    document.documentElement.classList.add("js-weg", "js-ein");
    // Abschnitte einmal einblenden, sobald sie ins Bild kommen; danach nicht mehr beobachten
    const ein = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("ist-da");
        ein.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("im-blick")),
      { threshold: 0.3 },
    );
    const scan = () => {
      document.querySelectorAll(".weg-anim:not(.im-blick)").forEach((el) => io.observe(el));
      document.querySelectorAll(".j-ein:not(.ist-da)").forEach((el) => ein.observe(el));
    };
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
      ein.disconnect();
      mo.disconnect();
      cancelAnimationFrame(geplant);
    };
  }, []);
  return null;
}
