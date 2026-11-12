"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, WISHES } from "@/lib/anamnesis";
import type { AnamnesisSummary } from "@/lib/anamnesisView";
import { AnamnesisFlags } from "@/components/AnamnesisFlags";

const fmt = (iso: string) => new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function AnamnesisPanel({ patientId, firstName, summary }: { patientId: string; firstName: string; summary: AnamnesisSummary }) {
  const router = useRouter();
  const [link, setLink] = useState<{ url: string; qr: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/patients/${patientId}/anamnesis`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Link konnte nicht erzeugt werden.");
    setLink(await res.json());
    router.refresh();
  }

  const text = link ? `Guten Tag ${firstName}, bitte füllen Sie vor Ihrem Termin kurz den Anamnesebogen aus: ${link.url}` : "";
  const a = summary.answers;

  return (
    <section id="anamnese" className="card scroll-mt-6 space-y-3" data-testid="anamnesis-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-slate-900">Anamnese</h2>
        <button type="button" className="btn btn-secondary" onClick={create} disabled={busy}>
          {summary.submittedAt ? "Aktualisierung anfordern" : "Anamnesebogen schicken"}
        </button>
      </div>
      {summary.submittedAt ? (
        <AnamnesisFlags flags={summary.flags} submittedAt={summary.submittedAt} />
      ) : (
        <p className="text-sm text-slate-600">
          Noch keine digitale Anamnese. Der Patient füllt sie vor dem Termin auf dem Handy aus, die Angaben stehen dann hier und beim
          Abschluss der Behandlung.
        </p>
      )}
      {summary.open && !link && (
        <p className="text-sm text-slate-500">
          Link verschickt am {fmt(summary.open.createdAt)} · {summary.open.viewedAt ? `geöffnet ${fmt(summary.open.viewedAt)}` : "noch nicht geöffnet"}
        </p>
      )}
      {link && (
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.qr} alt="QR-Code zum Anamnesebogen" width={140} height={140} className="h-36 w-36 shrink-0" />
          <div className="min-w-0 space-y-2 text-sm">
            <code className="block break-all rounded bg-slate-100 p-2 text-xs" data-testid="anamnesis-url">{link.url}</code>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(link.url).catch(() => undefined)}>Link kopieren</button>
              <a className="btn btn-secondary" href={`sms:?&body=${encodeURIComponent(text)}`}>Per SMS</a>
              <a className="btn btn-secondary" href={`mailto:?subject=${encodeURIComponent("Anamnesebogen")}&body=${encodeURIComponent(text)}`}>Per E-Mail</a>
            </div>
            <p className="text-xs text-slate-500">14 Tage gültig, nach dem Absenden verbraucht.</p>
          </div>
        </div>
      )}
      {a && (
        <>
          <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Antworten ausblenden" : "Alle Antworten zeigen"}
          </button>
          {showAll && (
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[1fr_auto]">
              {QUESTIONS.map((q) => (
                <div key={q.key} className="contents">
                  <dt className="text-slate-600">{q.text}</dt>
                  <dd className={a.q[q.key]?.yes ? "font-medium text-slate-900" : "text-slate-500"}>
                    {a.q[q.key]?.yes ? `Ja${a.q[q.key]?.detail ? `: ${a.q[q.key]?.detail}` : ""}` : "Nein"}
                  </dd>
                </div>
              ))}
              {a.wishes.length > 0 && (
                <div className="contents">
                  <dt className="text-slate-600">Wünsche</dt>
                  <dd>{a.wishes.map((w) => WISHES.find((x) => x.key === w)?.text).join(", ")}</dd>
                </div>
              )}
              {a.note && (
                <div className="contents">
                  <dt className="text-slate-600">Hinweis</dt>
                  <dd className="italic">„{a.note}“</dd>
                </div>
              )}
              <div className="contents">
                <dt className="text-slate-600">Bestätigt von</dt>
                <dd>{a.confirmName}</dd>
              </div>
            </dl>
          )}
        </>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
