"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DIKTAT_SPRACHE, diktatModus, lokalLaden, lokalStatus, type DiktatModus, type LokalStatus } from "@/lib/diktat";

interface MicButtonProps {
  onTranscript: (text: string) => void;
}

// Die Einstellung der Praxis wird je Seitenaufruf einmal geholt und von allen Diktierknöpfen geteilt.
let cloudAbfrage: Promise<boolean> | null = null;
function cloudErlaubt(): Promise<boolean> {
  cloudAbfrage ??= fetch("/api/praxis/diktat", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.cloud === true)
    .catch(() => false);
  return cloudAbfrage;
}

const erkennung = () => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));

/**
 * Diktierknopf. Erkennt die Sprache auf dem Gerät, wenn der Browser das kann. Der Weg über den
 * Sprachdienst des Browsers (Aufnahme geht an Google bzw. Apple) ist nur offen, wenn die
 * Praxisleitung ihn unter Einstellungen → Sicherheit erlaubt hat.
 */
export function MicButton({ onTranscript }: MicButtonProps) {
  const [modus, setModus] = useState<DiktatModus | "pruefe">("pruefe");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    let aktiv = true;
    const SR = erkennung();
    (async () => {
      const lokal: LokalStatus = SR ? await lokalStatus(SR) : "unbekannt";
      const cloud = SR && lokal !== "available" ? await cloudErlaubt() : false;
      if (aktiv) setModus(diktatModus({ unterstuetzt: !!SR, lokal, cloudErlaubt: cloud }));
    })();
    return () => {
      aktiv = false;
      recognitionRef.current?.abort?.();
    };
  }, []);

  function start(lokal: boolean) {
    const SR = erkennung();
    if (!SR) return setModus("ohne");
    setMeldung(null);
    const recognition = new SR();
    recognition.lang = DIKTAT_SPRACHE;
    recognition.continuous = true;
    recognition.interimResults = true;
    // Auf dem Gerät erkennen: Ohne diese Angabe dürfte der Browser auf seinen Dienst ausweichen.
    if (lokal) recognition.processLocally = true;

    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onTranscript(text);
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") setMeldung("Mikrofonzugriff wurde nicht erlaubt.");
      else if (event.error === "language-not-supported") setMeldung("Deutsch wird auf diesem Gerät nicht erkannt.");
      setListening(false);
      setInterim("");
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMeldung("Das Diktat konnte nicht gestartet werden.");
    }
  }

  async function paketLaden() {
    setLaedt(true);
    setMeldung(null);
    const ok = await lokalLaden(erkennung());
    setLaedt(false);
    if (ok) setModus("lokal");
    else setMeldung("Das Sprachpaket konnte nicht geladen werden.");
  }

  if (modus === "pruefe") return <span className="text-xs text-slate-400" aria-hidden="true">Diktat …</span>;

  if (modus === "ohne")
    return <span className="text-xs text-slate-500" data-testid="diktat-ohne">Diktieren wird von diesem Browser nicht unterstützt (Chrome empfohlen).</span>;

  if (modus === "aus")
    return (
      <span className="max-w-md text-xs text-slate-500" data-testid="diktat-aus">
        Diktat ist ausgeschaltet: Dieses Gerät erkennt Sprache nur über den Dienst des Browser-Herstellers. Die Praxisleitung kann das unter{" "}
        <Link href="/settings/security#diktat" className="underline">
          Einstellungen → Sicherheit
        </Link>{" "}
        erlauben.
      </span>
    );

  if (modus === "ladbar")
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" onClick={paketLaden} disabled={laedt} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" data-testid="diktat-laden">
          {laedt ? "Sprachpaket wird geladen …" : "Diktat einrichten (Sprachpaket laden)"}
        </button>
        <span className="text-xs text-slate-500">Einmalig. Danach wird auf diesem Gerät erkannt, ohne Internetdienst.</span>
        {meldung && <span className="text-xs text-red-600" role="alert">{meldung}</span>}
      </div>
    );

  const lokal = modus === "lokal";
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (listening ? recognitionRef.current?.stop() : start(lokal))}
        aria-pressed={listening}
        className={
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
          (listening ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
        }
        data-testid="diktat-knopf"
        data-modus={modus}
      >
        <span className={"h-2 w-2 rounded-full " + (listening ? "animate-pulse bg-red-500" : "bg-slate-400")} />
        {listening ? "Aufnahme läuft – antippen zum Stoppen" : "Diktieren"}
      </button>
      <span className="text-xs text-slate-500" data-testid="diktat-weg">
        {lokal ? "Erkennung auf diesem Gerät" : "Aufnahme geht an den Sprachdienst des Browsers. Keine Namen diktieren."}
      </span>
      {listening && interim && <span className="min-w-0 truncate text-xs italic text-slate-500">{interim}</span>}
      {meldung && <span className="text-xs text-red-600" role="alert">{meldung}</span>}
    </div>
  );
}
