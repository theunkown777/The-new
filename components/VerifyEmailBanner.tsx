"use client";

import { useState } from "react";

export function VerifyEmailBanner() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json();
    setSending(false);
    setMessage(res.ok ? "E-Mail verschickt." : data.error ?? "Fehlgeschlagen.");
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-2">
        <span>Bitte bestätigen Sie Ihre E-Mail-Adresse.</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="font-medium underline hover:no-underline"
          >
            {sending ? "Sendet…" : "Erneut senden"}
          </button>
          {message && <span className="text-xs">{message}</span>}
        </div>
      </div>
    </div>
  );
}
