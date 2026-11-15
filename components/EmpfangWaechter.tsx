"use client";

import { useEffect, useState } from "react";

// Patientenansicht beenden: Übergabe-Cookie löschen lassen, dann die Seite ganz neu laden. Danach
// zeigt das Tablet nur noch die Sperre („Bitte geben Sie das Tablet zurück“).
async function sperren() {
  await fetch("/api/empfang/patient/fertig", { method: "POST" }).catch(() => null);
  window.location.replace("/uebergabe");
}

/**
 * Wacht über die Patientenansicht am Empfangs-Tablet: sperrt nach „Fertig“, nach einigen Minuten ohne
 * Eingabe und spätestens, wenn das Übergabe-Token abläuft. Der Server prüft das Token ohnehin bei jedem
 * Schritt; der Wächter sorgt nur dafür, dass der Bildschirm rechtzeitig leer wird.
 */
export function EmpfangWaechter({ restSekunden, leerlaufMinuten }: { /** So lange gilt das Übergabe-Token noch (vom Server gerechnet, unabhängig von der Uhr des Tablets) */ restSekunden: number; leerlaufMinuten: number }) {
  const [rest, setRest] = useState<number | null>(null);

  useEffect(() => {
    let letzte = Date.now();
    let gesperrt = false;
    const bis = Date.now() + restSekunden * 1000;
    const aktiv = () => { letzte = Date.now(); };
    const ereignisse = ["pointerdown", "keydown", "input", "touchstart", "wheel", "scroll"] as const;
    for (const e of ereignisse) window.addEventListener(e, aktiv, { capture: true, passive: true });
    // Vollbild beim ersten Tippen, wo der Browser es erlaubt (nur ein Komfort, kein Schutz).
    const vollbild = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => undefined); };
    window.addEventListener("pointerup", vollbild, { once: true });
    const takt = setInterval(() => {
      const jetzt = Date.now();
      const ruhe = leerlaufMinuten * 60_000 - (jetzt - letzte);
      const ende = bis - jetzt;
      const knapp = Math.min(ruhe, ende);
      setRest(knapp <= 30_000 ? Math.max(0, Math.ceil(knapp / 1000)) : null);
      if (knapp <= 0 && !gesperrt) { gesperrt = true; void sperren(); }
    }, 1000);
    return () => {
      clearInterval(takt);
      for (const e of ereignisse) window.removeEventListener(e, aktiv, { capture: true });
      window.removeEventListener("pointerup", vollbild);
    };
  }, [restSekunden, leerlaufMinuten]);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {rest !== null && <span className="text-xs text-amber-800" role="status" data-testid="uebergabe-countdown">Sperrt in {rest} s</span>}
      <EmpfangFertig />
    </div>
  );
}

export function EmpfangFertig({ gross = false }: { gross?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={gross ? "btn btn-primary w-full px-6 py-3 text-base sm:w-auto" : "btn btn-secondary"} disabled={busy} onClick={() => { setBusy(true); void sperren(); }} data-testid={gross ? "uebergabe-fertig" : "uebergabe-fertig-oben"}>
      {gross ? "Fertig – Tablet zurückgeben" : "Fertig"}
    </button>
  );
}
