"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Ansicht /betrieb: Fehlereintrag als erledigt markieren oder wieder öffnen (nur Sorrida-Team). */
export function FehlerErledigtButton({ id, erledigt }: { id: string; erledigt: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        data-testid="fehler-erledigt"
        className={erledigt ? "btn-secondary" : "btn-primary"}
        onClick={async () => {
          setBusy(true);
          setFehler(false);
          const res = await fetch(`/api/fehler/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erledigt: !erledigt }) }).catch(() => null);
          setBusy(false);
          if (!res?.ok) { setFehler(true); return; }
          router.refresh();
        }}
      >
        {erledigt ? "Wieder öffnen" : "Erledigt"}
      </button>
      {fehler && <span role="alert" className="text-sm text-red-700">Das hat nicht geklappt. Bitte noch einmal versuchen.</span>}
    </span>
  );
}
