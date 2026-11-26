"use client";

import { useEffect } from "react";

// Startet die Behandlungsweg-Animation erst, wenn der Weg ins Bild kommt.
// Ohne JavaScript bleibt alles sichtbar (die Pause greift nur mit .js-weg).

/** Blätter, die selbst einblenden: das Handybild im Auftakt und alles mit .j-ein. */
const BLATT = ".j-blatt-ein, .j-ein";
/** Nach diesem Anteil seiner Dauer ist ein Blatt mit der Auslauf-Kurve praktisch angekommen (Auftakt: 0,25 s + 0,5 s). */
const BLATT_LIEGT = 0.45;

/** Millisekunden, bis das Blatt liegt, auf dem der Weg steht; 0, wenn es schon liegt oder der Weg auf keinem steht. */
function restBisBlattLiegt(blatt: Element | null): number {
  if (!blatt || typeof blatt.getAnimations !== "function") return 0;
  let rest = 0;
  for (const lauf of blatt.getAnimations()) {
    const zeit = lauf.effect?.getComputedTiming();
    if (lauf.playState !== "running" || !zeit || typeof zeit.duration !== "number") continue;
    rest = Math.max(rest, (zeit.delay ?? 0) + zeit.duration * BLATT_LIEGT - Number(lauf.currentTime ?? 0));
  }
  return rest;
}

export function WegAnimationen() {
  useEffect(() => {
    const html = document.documentElement;
    // Kam das Skript zu spät (app/layout.tsx hat schon alles gezeigt), wird nichts mehr versteckt.
    if (html.classList.contains("ein-aus")) html.classList.add("ein-bereit");
    else html.classList.add("js-weg", "js-ein", "ein-bereit");
    // Der Weg zeichnet sich nicht auf einem Blatt, das noch halb durchsichtig ist: Er wartet, bis es liegt.
    const wartend = new Set<Element>();
    const uhren = new Set<number>();
    const wegStarten = (weg: Element) => {
      const blatt = weg.closest(BLATT);
      if (blatt?.matches(".j-ein:not(.ist-da)")) {
        wartend.add(weg);
        return;
      }
      wartend.delete(weg);
      const rest = restBisBlattLiegt(blatt);
      if (rest <= 0) {
        weg.classList.add("im-blick");
        return;
      }
      const uhr = window.setTimeout(() => {
        uhren.delete(uhr);
        weg.classList.add("im-blick");
      }, rest);
      uhren.add(uhr);
    };
    // Abschnitte einmal einblenden, sobald sie ins Bild kommen; danach nicht mehr beobachten
    const ein = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("ist-da");
        ein.unobserve(e.target);
        wartend.forEach((weg) => e.target.contains(weg) && wegStarten(weg));
      }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        wegStarten(e.target);
      }),
      { threshold: 0.3 },
    );
    const gesehen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll(".weg-anim:not(.im-blick)").forEach((el) => {
        if (gesehen.has(el)) return;
        gesehen.add(el);
        io.observe(el);
      });
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
      uhren.forEach((uhr) => window.clearTimeout(uhr));
    };
  }, []);
  return null;
}
