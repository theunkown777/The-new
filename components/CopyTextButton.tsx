"use client";

import { useState } from "react";

export function CopyTextButton({ text, label = "Text kopieren" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("error");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
    >
      {state === "done" ? "Kopiert" : state === "error" ? "Bitte manuell markieren" : label}
    </button>
  );
}
