"use client";

import { usePathname } from "next/navigation";
import { FragSorrida } from "@/components/FragSorrida";
import { HilfeZeiger } from "@/components/HilfeZeiger";
import { websiteChatErlaubt } from "@/lib/hilfeZeiger";

// Frag Sorrida auf der öffentlichen Website. Eingehängt nur in der Startseite (app/page.tsx) und im Rahmen der
// Unterseiten (JournalRahmen), nicht im Root-Layout: Auf der Vorschau-Domain schreibt proxy.ts gesperrte Seiten auf
// /demnaechst um, die Adresse im Browser bleibt aber „/“. Am Pfad allein ließe sich das nicht erkennen; die
// Demnächst-Seite rendert keinen dieser Rahmen, also auch kein Frag Sorrida. Die Prüfung des Pfads bleibt als zweite
// Sicherung (keine App, keine Patientenseiten). Ohne KI, ohne Speicher im Browser. lib/websiteHilfeOrt.test.ts prüft das.
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
