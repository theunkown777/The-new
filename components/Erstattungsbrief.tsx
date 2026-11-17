"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BAUSTEINE, GEBUEHRENORDNUNGEN, HINWEIS_ENTWURF, HINWEIS_KRANKHEITSFALL_GOAE, MAX_POSTEN, briefDateiname, type BausteinKey, type Gebuehrenordnung } from "@/lib/erstattungsbrief";

// Begleitbrief für die Versicherung: Die Praxis trägt die beanstandeten Posten
// ein, wählt je Posten feste Begründungen und lädt ein PDF herunter. Sorrida
// verschickt nichts. Rechnungen in Sorrida enthalten keine einzelnen Posten –
// deshalb werden sie hier von Hand aus der Rechnung übernommen.

export interface BriefVorgaben {
  patientName: string;
  rechnungNummer: string;
  rechnungDatum: string;
  versicherung: string;
  versicherungsnummer: string;
  /** Vorauswahl: Zahnarztpraxen GOZ, sonst GOÄ */
  gebuehrenordnung: Gebuehrenordnung;
}

type Posten = { id: number; nummer: string; bezeichnung: string; faktor: string; gruende: BausteinKey[]; ergaenzung: string; dabei: boolean };
const neuerPosten = (id: number): Posten => ({ id, nummer: "", bezeichnung: "", faktor: "", gruende: [], ergaenzung: "", dabei: true });

export function Erstattungsbrief({ invoiceId, vorgaben, className }: { invoiceId: string; vorgaben: BriefVorgaben; className?: string }) {
  const uid = useId();
  const [offen, setOffen] = useState(false);
  const [go, setGo] = useState<Gebuehrenordnung>(vorgaben.gebuehrenordnung);
  const [versicherung, setVersicherung] = useState(vorgaben.versicherung);
  const [versAnschrift, setVersAnschrift] = useState("");
  const [versNr, setVersNr] = useState(vorgaben.versicherungsnummer);
  const [bezug, setBezug] = useState("");
  const [absender, setAbsender] = useState("");
  const [ort, setOrt] = useState("");
  const [posten, setPosten] = useState<Posten[]>([neuerPosten(1)]);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const zaehler = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const knopf = useRef<HTMLButtonElement>(null);
  const erstes = useRef<HTMLSelectElement>(null);
  const senden = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!offen) return;
    const alt = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    erstes.current?.focus();
    // Esc schließt auch dann, wenn der Fokus nicht (mehr) im Dialog liegt – z. B. nachdem der
    // Knopf „PDF erstellen“ während des Erstellens gesperrt war und der Browser den Fokus verworfen hat.
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      schliessenRef.current();
    };
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = alt;
    };
  }, [offen]);

  function schliessen() {
    setOffen(false);
    setFehler(null);
    setFertig(false);
    window.setTimeout(() => knopf.current?.focus(), 0);
  }

  const schliessenRef = useRef(schliessen);
  schliessenRef.current = schliessen;

  function taste(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      schliessen();
      return;
    }
    if (e.key !== "Tab" || !box.current) return;
    const ziele = Array.from(box.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')).filter((el) => el.offsetParent !== null);
    if (!ziele.length) return;
    const a = ziele[0], z = ziele[ziele.length - 1];
    if (e.shiftKey && document.activeElement === a) {
      e.preventDefault();
      z.focus();
    } else if (!e.shiftKey && document.activeElement === z) {
      e.preventDefault();
      a.focus();
    }
  }

  const aendern = (id: number, teil: Partial<Posten>) => {
    setPosten((l) => l.map((p) => (p.id === id ? { ...p, ...teil } : p)));
    setFertig(false);
  };
  const gewaehlt = posten.filter((p) => p.dabei);

  async function erstellen(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setFertig(false);
    if (gewaehlt.length === 0) return setFehler("Bitte mindestens einen Posten ankreuzen.");
    setLaeuft(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/erstattungsbrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gebuehrenordnung: go,
          versicherung,
          versicherungAnschrift: versAnschrift,
          versicherungsnummer: versNr,
          bezug,
          absenderAnschrift: absender,
          ort,
          posten: gewaehlt.map((p) => ({ nummer: p.nummer, bezeichnung: p.bezeichnung, faktor: p.faktor, gruende: p.gruende, ergaenzung: p.ergaenzung })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFehler(data.error ?? "Der Brief konnte nicht erstellt werden.");
      } else {
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = briefDateiname(vorgaben.rechnungNummer);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setFertig(true);
      }
    } catch {
      setFehler("Keine Verbindung. Bitte erneut versuchen.");
    }
    setLaeuft(false);
    // Der gesperrte Knopf hat den Fokus verloren: zurück in den Dialog, damit Tab und Esc weiter dort gelten.
    window.setTimeout(() => senden.current?.focus(), 0);
  }

  const info = GEBUEHRENORDNUNGEN[go];

  return (
    <>
      <button ref={knopf} type="button" className={className ?? "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-600 hover:text-brand-700"} onClick={() => setOffen(true)} aria-haspopup="dialog" data-testid="erstattungsbrief-oeffnen">
        Begleitbrief für die Versicherung
      </button>
      {offen && (
        <div className="ein-schleier fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-900/40 text-left sm:items-start sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && schliessen()}>
          <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${uid}-titel`} aria-describedby={`${uid}-hinweis`} onKeyDown={taste} data-testid="erstattungsbrief-dialog"
            className="ein-dialog flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:ring-1 sm:ring-slate-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 id={`${uid}-titel`} className="font-display text-2xl text-slate-900">Begleitbrief für die Versicherung</h2>
                <p className="text-sm text-slate-600">Rechnung Nr. {vorgaben.rechnungNummer} vom {vorgaben.rechnungDatum} · {vorgaben.patientName}</p>
              </div>
              <button type="button" className="btn btn-secondary shrink-0 px-3 py-1 text-xs" onClick={schliessen} data-testid="erstattungsbrief-schliessen">Schließen</button>
            </div>

            <form onSubmit={erstellen} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
                <p id={`${uid}-hinweis`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" role="note" data-testid="erstattungsbrief-hinweis">{HINWEIS_ENTWURF}</p>
                <p className="text-sm text-slate-600">
                  Für den Fall, dass die Versicherung die Rechnung nur gekürzt erstattet hat. Sie erhalten ein PDF, das die Patientin oder der Patient unterschreibt und selbst an die Versicherung schickt. Sorrida verschickt nichts.
                  Der Brief enthält keine Diagnosen – außer Sie tragen selbst welche in eine Ergänzung ein.
                </p>

                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-semibold text-slate-900">An wen</legend>
                  <div>
                    <label className="label" htmlFor={`${uid}-go`}>Abgerechnet nach</label>
                    <select ref={erstes} id={`${uid}-go`} className="input" value={go} onChange={(e) => setGo(e.target.value as Gebuehrenordnung)} data-testid="erstattungsbrief-go">
                      <option value="GOAE">GOÄ (Gebührenordnung für Ärzte)</option>
                      {/* Die GOZ gibt es nur in Zahnarztpraxen (Vorauswahl dort GOZ, app/(app)/zahlungen/page.tsx). */}
                      {vorgaben.gebuehrenordnung === "GOZ" && <option value="GOZ">GOZ (Gebührenordnung für Zahnärzte)</option>}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-vers`}>Versicherung oder Beihilfestelle</label>
                    <input id={`${uid}-vers`} className="input" required minLength={2} maxLength={120} value={versicherung} onChange={(e) => setVersicherung(e.target.value)} data-testid="erstattungsbrief-versicherung" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-versadr`}>Anschrift der Versicherung <span className="font-normal text-slate-500">(optional)</span></label>
                    <textarea id={`${uid}-versadr`} className="input h-20" maxLength={300} value={versAnschrift} onChange={(e) => setVersAnschrift(e.target.value)} placeholder={"Straße oder Postfach\nPLZ Ort"} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-abs`}>Anschrift der Patientin / des Patienten <span className="font-normal text-slate-500">(optional)</span></label>
                    <textarea id={`${uid}-abs`} className="input h-20" maxLength={300} value={absender} onChange={(e) => setAbsender(e.target.value)} placeholder={"Straße Hausnummer\nPLZ Ort"} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-nr`}>Versicherungsnummer <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id={`${uid}-nr`} className="input" maxLength={60} value={versNr} onChange={(e) => setVersNr(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-bezug`}>Schreiben der Versicherung <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id={`${uid}-bezug`} className="input" maxLength={120} value={bezug} onChange={(e) => setBezug(e.target.value)} placeholder="z. B. Mitteilung vom 10.11.2026, Vorgang 123" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`${uid}-ort`}>Ort für die Datumszeile <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id={`${uid}-ort`} className="input" maxLength={60} value={ort} onChange={(e) => setOrt(e.target.value)} />
                  </div>
                </fieldset>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Beanstandete Posten</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Tragen Sie die Posten ein, die die Versicherung gekürzt hat, so wie sie auf der Rechnung stehen. Wählen Sie je Posten, warum der Steigerungssatz gerechtfertigt ist. Die Gründe entsprechen den Kriterien aus {info.bemessung}:
                    Schwierigkeit, Zeitaufwand und Umstände bei der Ausführung. Nur angekreuzte Posten kommen in den Brief.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {posten.map((p, i) => (
                      <li key={p.id} className={`rounded-xl border p-3 ${p.dabei ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-70"}`} data-testid="erstattungsbrief-posten">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex min-h-[24px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-900">
                            <input type="checkbox" checked={p.dabei} onChange={(e) => aendern(p.id, { dabei: e.target.checked })} data-testid={`erstattungsbrief-dabei-${i}`} />
                            Posten {i + 1} in den Brief
                          </label>
                          {posten.length > 1 && (
                            <button type="button" className="ziel text-xs text-red-700 underline" onClick={() => setPosten((l) => l.filter((x) => x.id !== p.id))} aria-label={`Posten ${i + 1} entfernen`}>entfernen</button>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_7rem]">
                          <div>
                            <label className="label" htmlFor={`${uid}-n-${p.id}`}>Ziffer</label>
                            <input id={`${uid}-n-${p.id}`} className="input" maxLength={20} value={p.nummer} onChange={(e) => aendern(p.id, { nummer: e.target.value })} disabled={!p.dabei} />
                          </div>
                          <div>
                            <label className="label" htmlFor={`${uid}-b-${p.id}`}>Bezeichnung</label>
                            <input id={`${uid}-b-${p.id}`} className="input" maxLength={160} required={p.dabei} minLength={2} value={p.bezeichnung} onChange={(e) => aendern(p.id, { bezeichnung: e.target.value })} disabled={!p.dabei} data-testid={`erstattungsbrief-bezeichnung-${i}`} />
                          </div>
                          <div>
                            <label className="label" htmlFor={`${uid}-f-${p.id}`}>Steigerungssatz</label>
                            <input id={`${uid}-f-${p.id}`} className="input" inputMode="decimal" maxLength={10} placeholder="z. B. 3,5" value={p.faktor} onChange={(e) => aendern(p.id, { faktor: e.target.value })} disabled={!p.dabei} />
                          </div>
                        </div>
                        <fieldset className="mt-3" disabled={!p.dabei}>
                          <legend className="text-xs font-medium text-slate-700">Begründung (Mehrfachauswahl)</legend>
                          <div className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                            {BAUSTEINE.map((b) => (
                              <label key={b.key} className="flex min-h-[24px] cursor-pointer items-start gap-2 text-sm text-slate-700">
                                <input type="checkbox" className="mt-1" checked={p.gruende.includes(b.key)}
                                  onChange={(e) => aendern(p.id, { gruende: e.target.checked ? [...p.gruende, b.key] : p.gruende.filter((k) => k !== b.key) })}
                                  data-testid={`erstattungsbrief-grund-${i}-${b.key}`} />
                                <span>
                                  {b.label}
                                  {b.key === "krankheitsfall" && go === "GOAE" && <span className="block text-xs text-slate-500">{HINWEIS_KRANKHEITSFALL_GOAE}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="mt-2">
                          <label className="label" htmlFor={`${uid}-e-${p.id}`}>Ergänzung in eigenen Worten <span className="font-normal text-slate-500">(optional)</span></label>
                          <textarea id={`${uid}-e-${p.id}`} className="input h-16" maxLength={600} value={p.ergaenzung} onChange={(e) => aendern(p.id, { ergaenzung: e.target.value })} disabled={!p.dabei}
                            placeholder="Was war bei dieser Leistung besonders? Steht so im Brief." data-testid={`erstattungsbrief-ergaenzung-${i}`} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  {posten.length < MAX_POSTEN && (
                    <button type="button" className="btn btn-secondary mt-3 text-sm" onClick={() => setPosten((l) => [...l, neuerPosten(++zaehler.current)])} data-testid="erstattungsbrief-posten-neu">
                      Weiteren Posten hinzufügen
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                {fehler && <p className="text-sm text-red-700" role="alert" data-testid="erstattungsbrief-fehler">{fehler}</p>}
                {fertig && <p className="text-sm text-salbei-800" role="status" data-testid="erstattungsbrief-fertig">Das PDF wurde heruntergeladen. Bitte lesen Sie den Brief durch, bevor Sie ihn mitgeben.</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <button ref={senden} type="submit" className="btn btn-primary" disabled={laeuft} data-testid="erstattungsbrief-erstellen">{laeuft ? "Erstellt …" : "PDF erstellen und herunterladen"}</button>
                  <span className="text-xs text-slate-500">{gewaehlt.length} Posten im Brief · nichts wird gespeichert oder verschickt</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
