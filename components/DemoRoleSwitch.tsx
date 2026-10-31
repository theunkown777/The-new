"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

// Gastzugang: zwischen Geschäftsführung und Mitarbeiterin der eigenen Demo-Praxis wechseln.
export function DemoRoleSwitch({ role }: { role: string }) {
  const [busy, setBusy] = useState(false);
  const zu = role === "admin" ? "mitarbeiter" : "geschaeftsfuehrung";
  return (
    <button
      type="button"
      disabled={busy}
      data-testid="demo-rollenwechsel"
      className="font-medium underline disabled:opacity-60"
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/demo/wechsel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zu }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const r = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
          if (r && !r.error) {
            window.location.assign("/dashboard");
            return;
          }
        }
        setBusy(false);
      }}
    >
      {busy ? "Wechselt …" : role === "admin" ? "Als Mitarbeiterin ansehen" : "Zurück zur Geschäftsführung"}
    </button>
  );
}
