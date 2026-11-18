"use client";

import { useState } from "react";
import { FUEHRUNG_SCHRITT_EREIGNIS } from "@/lib/rundgang";

/**
 * Gastzugang: Portal-Link eines Beispielpatienten erzeugen und die Patientenansicht in einem neuen Tab öffnen
 * (wie ein Patient, der den Link per SMS bekommt). Gemeinsam für den Knopf im Hinweis oben und Schritt 2 der Führung:
 * Klappt es, meldet ein Ereignis der Führung, dass Schritt 2 erledigt ist. Bei Netzfehlern schließt sich der leere Tab.
 */
export async function patientenansichtOeffnen(): Promise<boolean> {
  const tab = window.open("", "_blank");
  try {
    const res = await fetch("/api/demo/patientenansicht", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (res.ok && data.url) {
      if (tab) tab.location.href = data.url;
      else window.location.assign(data.url);
      window.dispatchEvent(new CustomEvent(FUEHRUNG_SCHRITT_EREIGNIS, { detail: 2 }));
      return true;
    }
  } catch {
    // Keine Verbindung: unten aufräumen.
  }
  tab?.close();
  return false;
}

export function DemoPatientButton({ personPl = "Patienten" }: { personPl?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      data-testid="demo-patientenansicht"
      className="font-medium underline disabled:opacity-60"
      onClick={async () => {
        setBusy(true);
        try {
          await patientenansichtOeffnen();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Link wird erzeugt …" : `Ansicht für ${personPl} öffnen (Beispiel-Link)`}
    </button>
  );
}
