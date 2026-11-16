"use client";

import { useEffect } from "react";

// Empfangsmodus: Wird das Gerät an einen Patienten übergeben, sollen ALLE offenen Fenster und Tabs der Praxis-Ansicht
// auf diesem Gerät sofort leer werden, nicht nur der Tab, in dem der Knopf gedrückt wurde. Der Tab mit der Übergabe
// sagt es den anderen über einen BroadcastChannel (bleibt im Browser, geht an keinen Server). Jeder Tab der
// Praxis-Ansicht hört hier zu, blendet seinen Inhalt aus und lädt die Patientenansicht.

export const EMPFANG_KANAL = "sorrida-empfang";
export const EMPFANG_UEBERGABE = "uebergabe";

/** Allen anderen Tabs dieses Browsers sagen, dass das Gerät jetzt beim Patienten ist. */
export function uebergabeMelden() {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const kanal = new BroadcastChannel(EMPFANG_KANAL);
    kanal.postMessage(EMPFANG_UEBERGABE);
    kanal.close();
  } catch { /* ohne BroadcastChannel bleibt es beim eigenen Tab */ }
}

export function EmpfangWache() {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const kanal = new BroadcastChannel(EMPFANG_KANAL);
    kanal.onmessage = (e) => {
      if (e.data !== EMPFANG_UEBERGABE) return;
      // Sofort nichts mehr zeigen; holt der Browser die Seite über „Zurück“ noch einmal hervor, lädt sie neu.
      document.body.style.visibility = "hidden";
      window.addEventListener("pageshow", (ev) => { if (ev.persisted) window.location.reload(); });
      window.location.replace("/uebergabe");
    };
    return () => kanal.close();
  }, []);
  return null;
}
