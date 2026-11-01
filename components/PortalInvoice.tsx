"use client";

import { useState } from "react";
import type { InvoiceView } from "@/lib/invoices";
import type { PortalUi } from "@/lib/portalI18n";

export type PortalInvoiceData = {
  id: string;
  title: string;
  number: string;
  amount: string;
  amountPlain: string;
  status: string;
  tone: InvoiceView["tone"];
  reported: boolean;
  wantsInstallments: boolean;
  reference: string;
  qr: string | null;
  /** Fälligkeit für das Datumsfeld, z. B. ["12", "Nov."]. */
  due: [string, string];
};

export type PortalText = Omit<PortalUi, "hello" | "summary" | "nextDue" | "proposalDoc" | "valid">;
type Text = PortalText;

function CopyRow({ label, value, raw, t }: { label: string; value: string; raw?: string; t: Pick<Text, "copy" | "copied"> }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-all font-medium text-slate-900">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-salbei-600 hover:text-salbei-700"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(raw ?? value);
            setDone(true);
            setTimeout(() => setDone(false), 1800);
          } catch {
            /* Zwischenablage gesperrt: Text bleibt markierbar */
          }
        }}
      >
        {done ? t.copied : t.copy}
      </button>
    </div>
  );
}

// Eine offene Rechnung im Patientenportal: Status, Bezahldaten mit GiroCode,
// "Ich habe überwiesen" und Ratenanfrage.
export function PortalInvoice({ token, inv, bank, t, startOpen }: { token: string; inv: PortalInvoiceData; bank: { name: string; iban: string } | null; t: Text; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [reported, setReported] = useState(inv.reported);
  const [raten, setRaten] = useState(inv.wantsInstallments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "gezahlt" | "raten") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/portal/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: inv.id, action }) });
    setBusy(false);
    if (!res.ok) return setError(t.failed);
    if (action === "gezahlt") setReported(true);
    else setRaten(true);
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" data-testid="portal-invoice">
      {/* Sorrida-Rechnungskarte: Datumsfeld "zahlbar bis" links, Betrag rechts, Status als Satz */}
      <div className="flex items-start gap-3">
        <div className={`grid w-14 shrink-0 place-items-center rounded-xl py-1.5 text-center ${inv.tone === "red" && !reported ? "bg-red-50 text-red-800" : "bg-[#F5F2EE] text-salbei-800"}`} aria-hidden="true">
          <span className="font-display text-2xl leading-none">{inv.due[0]}</span>
          <span className="text-[11px] uppercase tracking-wide">{inv.due[1]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{inv.title}</p>
          <p className="text-xs text-slate-500">{t.invoiceNo} {inv.number}</p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-slate-900">{inv.amount}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`text-sm ${reported ? "text-sky-800" : inv.tone === "red" ? "font-medium text-red-700" : "text-slate-600"}`} data-testid="invoice-status">{reported && !inv.reported ? t.reportedLabel : inv.status}</span>
        {!reported && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-full bg-salbei-600 px-4 py-2 text-sm font-semibold text-white hover:bg-salbei-700">
            {open ? t.hide : t.pay}
          </button>
        )}
      </div>

      {open && !reported && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {bank ? (
            <>
              <p className="text-xs leading-relaxed text-slate-500">{t.howTo}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                {inv.qr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inv.qr} alt="GiroCode" width={160} height={160} className="mx-auto h-40 w-40 rounded-xl border border-slate-200 p-1 sm:mx-0" data-testid="girocode" />
                )}
                <div>
                  <CopyRow label={t.recipient} value={bank.name} t={t} />
                  <CopyRow label={t.iban} value={bank.iban} raw={bank.iban.replace(/\s/g, "")} t={t} />
                  <CopyRow label={t.amount} value={inv.amountPlain} t={t} />
                  <CopyRow label={t.reference} value={inv.reference} t={t} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">{t.noBank}</p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => send("gezahlt")} className="rounded-xl bg-salbei-600 px-4 py-3 text-sm font-semibold text-white hover:bg-salbei-700 disabled:opacity-60">
              {t.reported}
            </button>
            <button type="button" disabled={busy || raten} onClick={() => send("raten")} className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:border-salbei-600 disabled:opacity-60">
              {raten ? "✓ " + t.installments : t.installments}
            </button>
          </div>
          {raten && <p className="mt-2 text-xs text-slate-600">{t.installmentsDone}</p>}
        </div>
      )}
      {reported && <p className="mt-3 text-sm text-sky-800">{t.reportedDone}</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
