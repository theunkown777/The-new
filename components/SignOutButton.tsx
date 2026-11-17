"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "text-sm font-medium text-brand-100 hover:text-white" }: { className?: string }) {
  return (
    <button
      onClick={() => {
        // Angefangene Vorschläge dieses Tabs nicht für die nächste Person liegen lassen.
        try {
          for (const k of Object.keys(window.sessionStorage)) if (k.startsWith("sorrida:entwurf:")) window.sessionStorage.removeItem(k);
        } catch { /* egal */ }
        signOut({ callbackUrl: "/login" });
      }}
      className={className}
      data-hilfe="abmelden"
    >
      Abmelden
    </button>
  );
}
