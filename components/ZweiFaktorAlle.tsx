"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZweiFaktorAlle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [an, setAn] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/settings/zwei-faktor", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ require2faAll: !an }) });
    setBusy(false);
    if (res.ok) { setAn(!an); router.refresh(); }
  }
  return (
    <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-slate-700">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={an} disabled={busy} onChange={toggle} data-testid="zwei-faktor-alle" />
      <span>Auch für Mitarbeitende verlangen (für Admins immer Pflicht)</span>
    </label>
  );
}
