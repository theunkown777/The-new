"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalLinkButton } from "@/components/PortalLinkButton";

export function InvoiceActions({ id, status, patientId, firstName, practiceName }: { id: string; status: string; patientId: string; firstName: string; practiceName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [remind, setRemind] = useState(false);

  async function act(action: "bezahlt" | "storniert" | "offen" | "erinnert") {
    if (action === "storniert" && !confirm("Rechnung stornieren?")) return;
    setBusy(true);
    await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy(false);
    router.refresh();
  }

  const btn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-600 hover:text-brand-700 disabled:opacity-50";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {(status === "OFFEN" || status === "GEMELDET") && (
        <>
          <button type="button" className={`${btn} ${status === "GEMELDET" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}`} disabled={busy} onClick={() => act("bezahlt")} data-testid="invoice-paid">
            {status === "GEMELDET" ? "Eingang bestätigen" : "Bezahlt"}
          </button>
          {status === "OFFEN" && (
            <button type="button" className={btn} disabled={busy} onClick={() => setRemind((r) => !r)}>
              Erinnern
            </button>
          )}
          <button type="button" className={btn} disabled={busy} onClick={() => act("storniert")}>
            Stornieren
          </button>
        </>
      )}
      {(status === "BEZAHLT" || status === "STORNIERT") && (
        <button type="button" className={btn} disabled={busy} onClick={() => act("offen")}>
          Wieder öffnen
        </button>
      )}
      {remind && (
        <div className="mt-2 w-full text-left">
          <PortalLinkButton patientId={patientId} firstName={firstName} practiceName={practiceName} label="Portal-Link für die Erinnerung erstellen" className="btn-primary" onCreated={() => act("erinnert")} />
        </div>
      )}
    </div>
  );
}
