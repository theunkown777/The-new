"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KV_BEZIRKE } from "@/lib/amtlich/gliederung";

/** KV-Bezirk der Praxis wählen: bestimmt die regionalen KV-Ziffern im Leistungsverzeichnis und beim Sitzungstyp. */
export function KvBezirkWahl({ wert, admin }: { wert: string | null; admin: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <label className="text-xs text-slate-600" data-testid="kv-bezirk">
      KV-Bezirk der Praxis{" "}
      <select className="input ml-1 inline-block w-auto py-1 text-xs" value={wert ?? ""} disabled={!admin} aria-label="KV-Bezirk"
        onChange={async (e) => {
          setStatus("…");
          const res = await fetch("/api/praxis/kv-bezirk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kvBezirk: e.target.value || null }) }).catch(() => null);
          setStatus(res?.ok ? "gespeichert" : "nicht gespeichert");
          router.refresh();
        }}>
        <option value="">nicht gewählt (keine regionalen Ziffern)</option>
        {KV_BEZIRKE.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
      {status && <span className="ml-2 text-salbei-700">{status}</span>}
    </label>
  );
}
