"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Stammbehandler/in eines Patienten; steuert, in wessen "Mein Bereich" er erscheint. */
export function BehandlerWahl({ patientId, value, team, meId }: { patientId: string; value: string | null; team: { id: string; name: string }[]; meId: string }) {
  const router = useRouter();
  const [v, setV] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function save(next: string) {
    setV(next);
    setState("saving");
    const res = await fetch(`/api/patients/${patientId}/behandler`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ behandlerId: next || null }),
    }).catch(() => null);
    setState(res?.ok ? "idle" : "error");
    if (res?.ok) router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600" data-testid="behandler-wahl">
      <span>Behandelt von</span>
      <select className="input w-auto py-1.5" value={v} onChange={(e) => save(e.target.value)} disabled={state === "saving"}>
        <option value="">noch niemand</option>
        {team.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.id === meId ? " (ich)" : ""}
          </option>
        ))}
      </select>
      {state === "error" && <span className="text-xs text-red-700">nicht gespeichert</span>}
    </label>
  );
}
