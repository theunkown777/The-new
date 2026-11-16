import type { Instrumentation } from "next";

// Fehler auf dem Server in das eigene Fehlerlog schreiben (kein fremder Dienst).
// Gespeichert wird nur Bereinigtes (lib/fehlerlog.ts): die Route als Ort, die gekürzte Meldung,
// höchstens drei Stack-Zeilen und die ID der Praxis. Ansicht: /betrieb (nur Sorrida-Team).
// Die Arbeit liegt in lib/fehlerSpeicher.ts und wird nur in der Node-Laufzeit geladen: Dort gibt es die Datenbank.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { serverFehlerMelden } = await import("./lib/fehlerSpeicher");
      await serverFehlerMelden(error, request, context);
    } catch {
      // Das Protokollieren darf nie selbst einen Fehler auslösen.
    }
  }
};
