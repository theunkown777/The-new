"use client";

import { useEffect, useRef } from "react";

/** Merkt sich, ob ein Hinweis zugeklappt wurde. Ohne JavaScript bleibt der Hinweis offen und bedienbar. */
export function HinweisMerker({ id }: { id: string }) {
  const anker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const details = anker.current?.closest("details");
    if (!details) return;
    const schluessel = `sorrida-hinweis-${id}`;
    try {
      if (window.localStorage.getItem(schluessel) === "zu") details.open = false;
    } catch {
      // Speicher gesperrt: Der Hinweis bleibt offen.
    }
    const merken = () => {
      try {
        if (details.open) window.localStorage.removeItem(schluessel);
        else window.localStorage.setItem(schluessel, "zu");
      } catch {
        // nichts zu tun
      }
    };
    details.addEventListener("toggle", merken);
    return () => details.removeEventListener("toggle", merken);
  }, [id]);
  return <span ref={anker} hidden />;
}
