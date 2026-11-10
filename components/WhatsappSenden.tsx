"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WhatsappArt } from "@/lib/whatsapp";

// Knopf „Per WhatsApp“. Ohne WhatsApp Business öffnet sich WhatsApp auf diesem Gerät mit Empfänger
// und fertigem Text, die Praxis tippt dort auf „Senden“. Mit WhatsApp Business (direkt) verschickt
// Sorrida selbst. Das Fenster wird sofort beim Klick geöffnet, damit der Browser es nicht blockiert.
export function WhatsappSenden({ art, id, label, className, direkt = false }: { art: WhatsappArt; id: string; label: string; className?: string; direkt?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    const fenster = direkt ? null : window.open("", "_blank");
    setBusy(true);
    setMsg(null);
    let res: Response | null = null;
    try { res = await fetch("/api/nachrichten/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ art, id }) }); } catch { /* unten */ }
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      fenster?.close();
      return setMsg({ ok: false, text: j.error ?? "WhatsApp konnte nicht geöffnet werden." });
    }
    if (j.weg === "api") {
      fenster?.close();
      setMsg({ ok: true, text: "Per WhatsApp verschickt." });
    } else if (fenster) {
      fenster.location.href = j.link;
      setMsg({ ok: true, text: j.hinweis ?? "WhatsApp ist geöffnet. Dort bitte auf „Senden“ tippen.", link: j.link });
    } else {
      setMsg({ ok: true, text: j.hinweis ?? "Der Text ist fertig.", link: j.link });
    }
    router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={send} disabled={busy} data-testid={`whatsapp-${art}`}>{busy ? "Öffnet …" : label}</button>
      {msg && (
        <span className={`max-w-xs text-xs ${msg.ok ? "text-emerald-700" : "text-amber-800"}`} data-testid="whatsapp-meldung">
          {msg.text}
          {msg.link && <> <a className="underline" href={msg.link} target="_blank" rel="noreferrer" data-testid="whatsapp-link">WhatsApp öffnen</a></>}
        </span>
      )}
    </span>
  );
}
