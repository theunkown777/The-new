"use client";

import { useState } from "react";

/** Eine oder mehrere amtliche Leistungen in den eigenen Abrechnungskatalog übernehmen. */
export function LeistungUebernehmen({ ids, label = "übernehmen", klein = true }: { ids: string[]; label?: string; klein?: boolean }) {
  const [status, setStatus] = useState<"idle" | "laeuft" | "ok" | "fehler">("idle");
  const [info, setInfo] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={status === "laeuft" || status === "ok"}
        className={klein ? "text-xs text-brand-700 underline disabled:text-salbei-700 disabled:no-underline" : "btn-secondary py-1.5 text-sm"}
        onClick={async () => {
          setStatus("laeuft");
          const res = await fetch("/api/amtliche-leistungen/uebernehmen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
          const d = await res?.json().catch(() => null);
          if (res?.ok) {
            setStatus("ok");
            setInfo(ids.length > 1 ? `${d.uebernommen} übernommen${d.schonVorhanden ? `, ${d.schonVorhanden} waren schon da` : ""}` : d.uebernommen ? "im Katalog" : "schon im Katalog");
          } else {
            setStatus("fehler");
            setInfo(d?.error ?? "nicht möglich");
          }
        }}
      >
        {status === "ok" ? "✓" : label}
      </button>
      {info && <span className={`text-xs ${status === "fehler" ? "text-red-700" : "text-salbei-700"}`}>{info}</span>}
    </span>
  );
}
