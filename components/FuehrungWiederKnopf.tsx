"use client";

import { FUEHRUNG_WIEDER_EREIGNIS } from "@/lib/rundgang";

/**
 * Gastzugang: blendet die weggeklickte Führung (components/DemoFuehrung.tsx) wieder ein. Fasst den Speicher des
 * Browsers nicht selbst an, sondern meldet nur ein Ereignis; die Führung merkt sich den Stand wie bisher.
 */
export function FuehrungWiederKnopf({ className = "font-medium underline" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      data-testid="demo-fuehrung-wieder"
      onClick={(e) => {
        // Im aufgeklappten „Mehr“: Menü schließen, der Fokus geht danach an die Leiste der Führung.
        e.currentTarget.closest("details")?.removeAttribute("open");
        window.dispatchEvent(new Event(FUEHRUNG_WIEDER_EREIGNIS));
      }}
    >
      Führung wieder einblenden
    </button>
  );
}
