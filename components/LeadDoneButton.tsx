"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LeadDoneButton({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={done ? "btn-secondary" : "btn-primary"}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !done }) });
        setBusy(false);
        router.refresh();
      }}
    >
      {done ? "Wieder öffnen" : "Erledigt"}
    </button>
  );
}
