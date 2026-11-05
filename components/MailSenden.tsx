"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NachrichtArt } from "@/lib/kontakt";

// Knopf „Per E-Mail“: verschickt erst nach Klick und zeigt ehrlich, was passiert ist.
export function MailSenden({ art, id, label, className }: { art: NachrichtArt; id: string; label: string; className?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const res = await fetch("/api/nachrichten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ art, id }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Per E-Mail verschickt." } : { ok: false, text: j.error ?? "Versand fehlgeschlagen." });
    if (res.ok) router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={send} disabled={busy} data-testid={`mail-${art}`}>{busy ? "Sendet …" : label}</button>
      {msg && <span className={`max-w-xs text-xs ${msg.ok ? "text-emerald-700" : "text-amber-800"}`} data-testid="mail-meldung">{msg.text}</span>}
    </span>
  );
}
