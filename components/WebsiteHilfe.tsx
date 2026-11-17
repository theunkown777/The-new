"use client";

import { usePathname } from "next/navigation";
import { FragSorrida } from "@/components/FragSorrida";
import { HilfeZeiger } from "@/components/HilfeZeiger";
import { websiteChatErlaubt } from "@/lib/hilfeZeiger";

// Frag Sorrida auf der öffentlichen Website (Startseite und Unterseiten). Nicht in der App (die hat ihre eigene
// Fassung im Layout), nicht auf Patientenseiten (/p, /portal, /a, /t), nicht auf der Demnächst-Seite und nicht in
// eingebetteten Fenstern. Ohne KI, ohne Speicher im Browser.
export function WebsiteHilfe() {
  const pfad = usePathname() ?? "/";
  if (!websiteChatErlaubt(pfad)) return null;
  return (
    <>
      <FragSorrida modus="website" />
      <HilfeZeiger />
    </>
  );
}
