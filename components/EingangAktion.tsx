"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EingangAktion({ id, erledigt }: { id: string; erledigt: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function setzen() {
    setBusy(true);
    await fetch("/api/eingang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, erledigt: !erledigt }) });
    setBusy(false);
    router.refresh();
  }
  return (
    <button type="button" className={erledigt ? "ziel text-xs text-slate-500 underline" : "btn-secondary"} onClick={setzen} disabled={busy} data-testid={erledigt ? "eingang-oeffnen" : "eingang-erledigt"}>
      {erledigt ? "wieder öffnen" : "Erledigt"}
    </button>
  );
}

export function EingangAlle({ anzahl }: { anzahl: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (anzahl < 2) return null;
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={busy}
      data-testid="eingang-alle"
      onClick={async () => {
        if (!confirm(`Alle ${anzahl} Einträge als erledigt abhaken?`)) return;
        setBusy(true);
        await fetch("/api/eingang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alle: true }) });
        setBusy(false);
        router.refresh();
      }}
    >
      Alle abhaken
    </button>
  );
}
