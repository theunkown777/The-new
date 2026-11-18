"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { uebergabeMelden } from "@/components/EmpfangWache";
import { fachWoerter } from "@/lib/fachprofile";

type P = { id: string; firstName: string; lastName: string; birthDate: string | null };
type Lage = { anamneseOffen: boolean; anamneseZuletzt: string | null; einverstaendnisse: number };

// Empfang: Patient suchen, Schritte wählen, Tablet übergeben oder QR-Code für das eigene Handy zeigen.
export function Empfang({ pinGesetzt, admin, minuten, leerlauf, fach }: { pinGesetzt: boolean; admin: boolean; minuten: number; leerlauf: number; fach?: string | null }) {
  const w = fachWoerter(fach);
  const derPerson = w.derPerson.charAt(0).toLowerCase() + w.derPerson.slice(1);
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<P[]>([]);
  const [patient, setPatient] = useState<P | null>(null);
  const [lage, setLage] = useState<Lage | null>(null);
  const [kontakt, setKontakt] = useState(true);
  const [anamnese, setAnamnese] = useState(false);
  const [unterschrift, setUnterschrift] = useState(true);
  const [qr, setQr] = useState<{ url: string; qr: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Was das Team angeklickt hat, während die Lage des Patienten noch lädt, bleibt so (die Vorschläge kommen später an).
  const beruehrt = useRef({ anamnese: false, unterschrift: false });
  const gewaehlt = useRef<string | null>(null);

  useEffect(() => {
    if (patient || q.trim().length < 2) return setTreffer([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/patients?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      if (r?.ok) setTreffer(((await r.json()).patients as P[]).slice(0, 8));
    }, 200);
    return () => clearTimeout(t);
  }, [q, patient]);

  async function waehlen(p: P) {
    setPatient(p); setTreffer([]); setLage(null); setQr(null); setFehler(null);
    beruehrt.current = { anamnese: false, unterschrift: false };
    gewaehlt.current = p.id;
    const r = await fetch(`/api/empfang/uebergabe?patientId=${encodeURIComponent(p.id)}`, { cache: "no-store" }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as Lage | null;
    // Inzwischen ein anderer Patient gewählt: Diese Antwort gilt nicht mehr.
    if (!r?.ok || !d || gewaehlt.current !== p.id) return;
    setLage(d);
    // Anamnese vorschlagen, wenn ein Bogen offen ist oder noch nie einer ausgefüllt wurde.
    if (!beruehrt.current.anamnese) setAnamnese(d.anamneseOffen || !d.anamneseZuletzt);
    if (!beruehrt.current.unterschrift) setUnterschrift(d.einverstaendnisse > 0);
  }
  function zuruecksetzen() { gewaehlt.current = null; setPatient(null); setQ(""); setLage(null); setQr(null); setFehler(null); }

  async function uebergeben() {
    if (!patient) return;
    setBusy("uebergabe"); setFehler(null);
    const res = await fetch("/api/empfang/uebergabe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, kontakt, anamnese, unterschrift }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok) { setBusy(null); return setFehler(d?.error ?? "Die Übergabe hat nicht geklappt."); }
    // Ab hier ist auf diesem Gerät niemand mehr angemeldet. Die Seite wird ganz neu geladen, damit nichts
    // aus der Praxis-Ansicht im Speicher des Browsers bleibt; holt der Browser sie über „Zurück“ doch
    // noch einmal hervor, lädt sie sofort neu und landet bei der Anmeldung.
    document.body.style.visibility = "hidden";
    // Andere offene Tabs und Fenster der Praxis-Ansicht auf diesem Gerät: ebenfalls leeren (components/EmpfangWache.tsx).
    uebergabeMelden();
    window.addEventListener("pageshow", (e) => { if (e.persisted) window.location.reload(); });
    window.location.replace(d.ziel ?? "/uebergabe");
  }

  async function qrZeigen() {
    if (!patient) return;
    setBusy("qr"); setFehler(null);
    // Für das eigene Handy: Anamnesebogen bereitlegen, falls gewünscht und keiner offen ist.
    if (anamnese && lage && !lage.anamneseOffen) await fetch(`/api/patients/${patient.id}/anamnesis`, { method: "POST" }).catch(() => null);
    const res = await fetch(`/api/patients/${patient.id}/portal`, { method: "POST" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok || !d?.qr) return setFehler(d?.error ?? "Der QR-Code konnte nicht erzeugt werden.");
    setQr({ url: d.url, qr: d.qr });
  }

  const schritte = Number(kontakt) + Number(anamnese) + Number(unterschrift);
  return (
    <div className="space-y-4">
      {!pinGesetzt && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="empfang-keine-pin">
          Für die Übergabe am Tablet braucht die Praxis eine Empfangs-PIN. {admin ? <><Link href="/settings/empfang" className="font-medium underline">Jetzt festlegen</Link>.</> : "Bitte die Geschäftsführung, sie unter Einstellungen → Empfang festzulegen."} Der QR-Code für das eigene Handy geht auch ohne PIN.
        </p>
      )}

      <section className="card space-y-3" aria-labelledby="empfang-wer">
        <h2 id="empfang-wer" className="font-semibold text-slate-900">1. Für wen?</h2>
        <div className="relative">
          {patient ? (
            <p className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5" data-testid="empfang-gewaehlt">
              <span className="min-w-0 font-medium text-slate-900">{patient.lastName}, {patient.firstName}{patient.birthDate ? <span className="font-normal text-slate-500"> · {new Date(patient.birthDate).toLocaleDateString("de-DE", { timeZone: "UTC" })}</span> : null}</span>
              <button type="button" className="ziel shrink-0 text-sm underline" onClick={zuruecksetzen} data-testid="empfang-aendern">ändern</button>
            </p>
          ) : (
            <input className="input" placeholder="Name suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Name suchen" autoComplete="off" data-testid="empfang-suche" />
          )}
          {treffer.length > 0 && !patient && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
              {treffer.map((p) => (
                <li key={p.id}>
                  <button type="button" className="w-full px-3 py-2.5 text-left hover:bg-slate-50" onClick={() => waehlen(p)} data-testid="empfang-treffer">
                    {p.lastName}, {p.firstName}{p.birthDate ? <span className="text-slate-500"> · {new Date(p.birthDate).toLocaleDateString("de-DE", { timeZone: "UTC" })}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {patient && (
        <section className="card space-y-3" aria-labelledby="empfang-was">
          <h2 id="empfang-was" className="font-semibold text-slate-900">2. Was soll {derPerson} erledigen?</h2>
          <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={kontakt} onChange={(e) => setKontakt(e.target.checked)} data-testid="empfang-schritt-kontakt" /><span>Kontaktdaten prüfen<span className="block text-xs text-slate-500">E-Mail, Mobilnummer und Einwilligung in Nachrichten</span></span></label>
          <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={anamnese} onChange={(e) => { beruehrt.current.anamnese = true; setAnamnese(e.target.checked); }} data-testid="empfang-schritt-anamnese" /><span>Anamnesebogen ausfüllen<span className="block text-xs text-slate-500">{lage ? (lage.anamneseOffen ? "Ein Bogen ist offen." : lage.anamneseZuletzt ? `Zuletzt ausgefüllt am ${lage.anamneseZuletzt}.` : "Noch nie ausgefüllt.") : "wird geprüft …"}</span></span></label>
          <label className="flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={unterschrift} onChange={(e) => { beruehrt.current.unterschrift = true; setUnterschrift(e.target.checked); }} data-testid="empfang-schritt-unterschrift" /><span>Einverständnis unterschreiben<span className="block text-xs text-slate-500" data-testid="empfang-offene-einverstaendnisse">{lage ? (lage.einverstaendnisse === 0 ? "Zurzeit ist nichts zu unterschreiben." : `${lage.einverstaendnisse} ${lage.einverstaendnisse === 1 ? "Einverständnis ist" : "Einverständnisse sind"} offen.`) : "wird geprüft …"}</span></span></label>

          {fehler && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid="empfang-fehler">{fehler}</p>}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button type="button" className="btn btn-primary" disabled={!!busy || !pinGesetzt || schritte === 0} onClick={uebergeben} data-testid="empfang-uebergeben">{busy === "uebergabe" ? "Übergibt …" : "Tablet übergeben"}</button>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={qrZeigen} data-testid="empfang-qr">{busy === "qr" ? "Erzeugt …" : "QR-Code zeigen"}</button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            <b className="text-slate-700">Tablet übergeben:</b> Das Tablet zeigt danach nur noch die Schritte für diese Person, ohne Menü und ohne andere {w.personen}. Auf dem Gerät ist so lange niemand angemeldet.
            Nach „Fertig“, nach {leerlauf} Minuten ohne Eingabe oder spätestens nach {minuten} Minuten sperrt es sich. Zurück kommen Sie mit der Empfangs-PIN.
            {" "}<span data-testid="empfang-hinweis-tabs">Andere offene Tabs von Sorrida in diesem Browser wechseln bei der Übergabe ebenfalls in die Patientenansicht. Bitte schließen Sie vorher andere Fenster mit Patientendaten, auch die anderer Programme.</span>
            {" "}<b className="text-slate-700">QR-Code zeigen:</b> {w.derPerson} scannt den Code und füllt alles am eigenen Handy aus.
          </p>
        </section>
      )}

      {qr && patient && (
        <section className="card text-center" data-testid="empfang-qr-karte">
          <h2 className="font-semibold text-slate-900">Mit dem eigenen Handy scannen</h2>
          <p className="mt-1 text-sm text-slate-600">Für {patient.firstName} {patient.lastName}. Dort stehen Anamnesebogen, Einverständnis und Termine.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qr} alt="QR-Code zum persönlichen Link" className="mx-auto mt-4 h-60 w-60" data-testid="empfang-qr-bild" />
          <p className="mt-3 text-xs text-slate-500">Der Code ist persönlich und ersetzt den bisherigen Link dieser Person. Bitte nur ihr zeigen.</p>
          <button type="button" className="btn btn-secondary mt-4" onClick={() => setQr(null)} data-testid="empfang-qr-schliessen">Schließen</button>
        </section>
      )}

      <p className="text-xs text-slate-500">Tipp: Mit „Geführter Zugriff“ (iPad) oder „Bildschirm anheften“ (Android) lässt sich das Tablet zusätzlich auf diese eine Seite festlegen.</p>
    </div>
  );
}
