"use client";

import { useState } from "react";

// Gastzugang: Portal-Link eines Beispielpatienten erzeugen und die
// Patientenansicht in einem neuen Tab öffnen (wie ein Patient, der den Link per SMS bekommt).
export function DemoPatientButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      data-testid="demo-patientenansicht"
      className="font-medium underline disabled:opacity-60"
      onClick={async () => {
        setBusy(true);
        const tab = window.open("", "_blank");
        const res = await fetch("/api/demo/patientenansicht", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (res.ok && data.url) {
          if (tab) tab.location.href = data.url;
          else window.location.assign(data.url);
        } else tab?.close();
      }}
    >
      {busy ? "Link wird erzeugt …" : "Patientenansicht öffnen (Portal-Link eines Beispielpatienten)"}
    </button>
  );
}
